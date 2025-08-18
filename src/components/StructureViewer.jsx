import React, { useEffect, useRef, useState } from 'react';
import { threeToOne } from './Utils.jsx';
import { residueColorHex,chainColors } from '../constants/colors.js';

function ensure3Dmol(cb) {
  if (window.$3Dmol) return cb();
  if (document.getElementById('threedmol-cdn')) {
    const check = setInterval(() => {
      if (window.$3Dmol) {
        clearInterval(check);
        cb();
      }
    }, 50);
    return;
  }
  const script = document.createElement('script');
  script.id = 'threedmol-cdn';
  script.src = 'https://3Dmol.org/build/3Dmol-min.js';
  script.onload = cb;
  document.body.appendChild(script);
}


const getChainColor = (chain) => {
  if (!chain) return '#FFFFFF';
  const idx = chain.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % chainColors.length;
  return chainColors[idx];
};

function StructureViewer({ pdb, panelId, surface = true, data, setPanelData,linkedTo, highlightedSite, highlightOrigin, onHighlight,
  linkedPanelData }) {
  const viewerDiv = useRef(null);
  const viewerRef = useRef(null);
  const surfaceHandleRef = useRef(null);
  const appliedInitialViewRef = useRef(false);
  const lastSentHighlightRef = useRef(undefined);

  // StructureTooltip: use state for small structures, direct DOM updates in perf mode
  const [tooltip, setStructureTooltip] = useState(null);
  const tooltipRef = useRef(null);

  // Perf controls
  const [perfMode, setPerfMode] = useState(false);
  const perfModeRef = useRef(false);
  const rafIdRef = useRef(null);
  const lastRenderTsRef = useRef(0);

  // 3Dmol handles
  const modelRef = useRef(null);
  const hoverShapeRef = useRef(null);     // needed for the hover halo
  const linkedShapesRef = useRef([]);     // shapes for multi-highlights
    const _clearLinkedShapes = () => {
    const v = viewerRef.current;
    if (!v) return;
    for (const sh of linkedShapesRef.current) {
      try { v.removeShape(sh); } catch {}
    }
    linkedShapesRef.current = [];
  };

  const _addLinkedSphere = (atom) => {
    const v = viewerRef.current;
    if (!v || !atom) return null;
    const sh = v.addSphere({
      center: { x: atom.x, y: atom.y, z: atom.z },
      radius: 1.8,
      color: 'red',
      opacity: 1
    });
    return sh;
  };
  // throttle window in ms when perfMode = true
  const HOVER_THROTTLE_MS = 60; // tuned a bit higher for giant structures


const chainInfoRef = useRef({
  // byChain: { [chainId]: { caAtoms: Array<atom>, keyToIndex: Map, length: number } }
  byChain: {}
});

function buildChainInfo(model) {
  const byChain = {};
  const atoms = model.selectedAtoms({ atom: 'CA' }) || [];
  for (const a of atoms) {
    const chain = (a.chain || 'A').trim() || 'A';
    const resi = a.resi; // integer
       // normalize insertion code: treat blank/space the same
   const icode = String(a.inscode ?? a.icode ?? '').trim();
    const key = `${chain}|${resi}|${icode}`;

    if (!byChain[chain]) {
      byChain[chain] = { caAtoms: [], keyToIndex: new Map(), length: 0 };
    }
    const info = byChain[chain];
    const idx = info.caAtoms.length;
    info.caAtoms.push(a);
    info.keyToIndex.set(key, idx);
    info.length++;
  }
  chainInfoRef.current.byChain = byChain;
}

const showStructureTooltipText = (text) => {
  if (perfModeRef.current && tooltipRef.current) {
    tooltipRef.current.textContent = text;
    tooltipRef.current.style.display = 'block';
  } else {
    setStructureTooltip(text);
  }
};
const hideStructureTooltipText = () => {
  if (perfModeRef.current && tooltipRef.current) {
    tooltipRef.current.style.display = 'none';
  } else {
    setStructureTooltip(null);
  }
};

// Use linked MSA data to guess the chain (id like "..._chain_A" or equals "A"; or length match)
function guessLinkedChainId(linkedPanelData) {
  if (!linkedPanelData || !Array.isArray(linkedPanelData.data)) return null;

  const byChain = chainInfoRef.current.byChain;
  const chainIds = Object.keys(byChain);
  if (!chainIds.length) return null;

  // Try by name
  for (const seq of linkedPanelData.data) {
    const id = (seq.id || '').trim();
    const m1 = id.match(/_chain_([A-Za-z0-9])\b/i);
    if (m1 && byChain[m1[1]]) return m1[1];
    if (chainIds.includes(id)) return id; // exact match like "A"
  }

  // Try by length (unique match)
  const candidates = [];
  for (const seq of linkedPanelData.data) {
    const ungappedLen = (seq.sequence || '').replace(/-/g, '').length;
    for (const c of chainIds) {
      if (byChain[c].length === ungappedLen) {
        candidates.push(c);
      }
    }
  }
  if (candidates.length === 1) return candidates[0];

  return null;
}

const setupHoverStructureTooltip = () => {
  const v = viewerRef.current;
  if (!v) return;

  v.setHoverable(
    { atom: 'CA' },
    true,
    function onHover(atom) {
      if (!atom || atom.hetflag) return;

      const resn = (atom.resn || '').trim().toUpperCase();
      const one = threeToOne[resn] || '-';
      const label = `chain ${atom.chain || ''}, ${atom.resi - 1 ?? ''}: ${one}`;
      showStructureTooltipText(label);

      // Share highlight back to MSA if linked
      try {
        const chain = (atom.chain || 'A').trim() || 'A';
        const icode = String(atom.inscode ?? atom.icode ?? '').trim();
        const key = `${chain}|${atom.resi}|${icode}`;
        const info = chainInfoRef.current.byChain[chain];
        const idx = info ? info.keyToIndex.get(key) : null;

        if (typeof onHighlight === 'function' && idx != null) {
          if (lastSentHighlightRef.current !== idx) {
            lastSentHighlightRef.current = idx;
            onHighlight(idx, panelId);
          }
        }
      } catch {}

      scheduleHalo(atom);
    },
    function onUnhover() {
      hideStructureTooltipText();
      scheduleHalo(null);
      if (typeof onHighlight === 'function') {
        if (lastSentHighlightRef.current !== null) {
          lastSentHighlightRef.current = null;
          onHighlight(null, panelId);
        }
      }
    }
  );
};



  const defaultColorFunc = (atom) => {
    const resn = (atom.resn || '').trim().toUpperCase();
    const one = threeToOne[resn] || '-';
    return residueColorHex[one] || '#FFFFFF';
  };

  const applyCartoonOnce = () => {
    const v = viewerRef.current;
    if (!v) return;
    // Use per-atom colors (pre-bake them via setColorByFunction)
    v.setStyle({}, { cartoon: {} });
  };

  const colorAllDefaultOnce = () => {
    const m = modelRef.current;
    if (!m) return;
    m.setColorByFunction({}, defaultColorFunc);
  };

 const _removeHoverShape = () => {
    const v = viewerRef.current;
    if (!v) return;
    if (hoverShapeRef.current) {
      v.removeShape(hoverShapeRef.current);
      hoverShapeRef.current = null;
    }
  };

  const showHoverHalo = (atom) => {
    const v = viewerRef.current;
    if (!v) return;

    // Remove previous halo
    _removeHoverShape();

    if (!atom) {
      v.render();
      return;
    }

    // Draw a small translucent sphere centered at the hovered CA
    hoverShapeRef.current = v.addSphere({
      center: { x: atom.x, y: atom.y, z: atom.z },
      radius: 1.8,
      color: 'red',
      opacity: 1
    });

    v.render();
  };

  const scheduleHalo = (atom) => {
    if (perfModeRef.current) {
      const now = performance.now();
      if (now - lastRenderTsRef.current < HOVER_THROTTLE_MS) return;
    }
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      showHoverHalo(atom);
      lastRenderTsRef.current = performance.now();
    });
  };



useEffect(() => {
  // If multi-linked residues are present, don't override them here.
  if (Array.isArray(data?.linkedResiduesByKey) && data.linkedResiduesByKey.length > 0) {
    return;
  }

  const v = viewerRef.current;
  const byChain = chainInfoRef.current.byChain;
  if (!v || !byChain) return;

  const chainId = data?.linkedChainId || guessLinkedChainId(linkedPanelData);
  console.log('[Structure] chosen chain for single-link (data.linkedChainId or guess):', chainId);
  const residIdx = data?.linkedResidueIndex;

  if (chainId && byChain[chainId] && Number.isInteger(residIdx)) {
    const a = byChain[chainId].caAtoms[residIdx];
    if (a) {
      //console.log('[Structure] single-link highlight:', { chainId, residIdx, resi: a.resi, icode: a.inscode || a.icode || '' });
      // Show halo
      scheduleHalo(a);

      // Build tooltip label same as hover
      const resn = (a.resn || '').trim().toUpperCase();
      const one = threeToOne[resn] || '-';
      const label = `chain ${a.chain || ''}, ${a.resi-1 ?? ''}: ${one}`;

      // StructureTooltip (linked-driven)
      showStructureTooltipText(label);
      return;
    }
    //console.log('[Structure] single-link: atom not found for', { chainId, residIdx });
  }
  //console.log('[Structure] single-link: no valid chain/residIdx:', { chainId, residIdx, chains: Object.keys(byChain) });

  // Clear if no valid linked highlight
  hideStructureTooltipText();
  scheduleHalo(null);
}, [data?.linkedResidueIndex, data?.linkedChainId, linkedPanelData]);
// Render multiple persistent highlights from heatmap links
  useEffect(() => {
    const v = viewerRef.current;
    const byChain = chainInfoRef.current.byChain;
    if (!v || !byChain) return;

    const list = data?.linkedResiduesByKey;
    // If list is defined (even empty), it owns the persistent linked shapes
    if (!Array.isArray(list)) return;
    //console.log('[Structure] incoming linkedResiduesByKey:', list);

    // Clear previous linked shapes
    _clearLinkedShapes();

     const fmt = (a) => {
     const resn = (a.resn || '').trim().toUpperCase();
     const one = threeToOne[resn] || '-';
     const chain = (a.chain || '').trim();
     // Keep existing UI convention (display resi-1)
     const dispResi = (typeof a.resi === 'number') ? (a.resi - 1) : a.resi;
     return `chain ${chain}, ${dispResi}:${one}`;
   };

    // Build and draw
    const atomsToShow = [];
    for (const item of list) {
      if (!item) continue;
      const chain = (item.chainId || 'A').trim() || 'A';
      const resi = Number(item.resi);
      const icode = (item.icode || '').trim();

      const info = byChain[chain];
      if (!info){
       console.log('[Structure] no such chain in structure:', chain, 'available:', Object.keys(byChain));
        continue;
      }
      const key = `${chain}|${resi}|${icode}`;
      const idx = info.keyToIndex.get(key);
      if (idx == null) {
       // Try fallback without insertion code for visibility
       const idxNoIcode = info.keyToIndex.get(`${chain}|${resi}|`);
       console.log('[Structure] key miss:', { wanted: key, fallbackIdxNoIcode: idxNoIcode });
        continue;
      }
      const atom = info.caAtoms[idx];
      if (atom) atomsToShow.push(atom);
    }

    //console.log('[Structure] will draw spheres for N atoms =', atomsToShow.length);

    for (const a of atomsToShow) {
      const sh = _addLinkedSphere(a);
      if (sh) linkedShapesRef.current.push(sh);
    }

    v.render();

      // ---- Combined tooltip for multi-highlights ----
   if (atomsToShow.length > 0) {
     const tip = atomsToShow.map(fmt).join(' | ');
     showStructureTooltipText(tip);
   } else {
     hideStructureTooltipText();
   }

    return () => {
      _clearLinkedShapes();
    };
  }, [data?.linkedResiduesByKey]);
  const rebuildSurface = () => {
    const v = viewerRef.current;
    if (!v) return;
    v.removeAllSurfaces();
    surfaceHandleRef.current = null;

    if (surface) {
      surfaceHandleRef.current = v.addSurface('SAS', {
        opacity: 0.8,
        colorfunc: function (atom) {
          return getChainColor(atom.chain);
        }
      });
    }

    v.render();
  };

  // Create viewer once per PDB string
  useEffect(() => {
    if (!pdb || !viewerDiv.current) return;

    ensure3Dmol(() => {
      // reset container
      viewerDiv.current.innerHTML = '';

      const viewer = window.$3Dmol.createViewer(viewerDiv.current, {
        backgroundColor: 'white',
        antialias: true,
        id: `viewer-${panelId}`,
        width: '100%',
        height: '100%'
      });
      viewerRef.current = viewer;
      appliedInitialViewRef.current = false;

      viewer.addModel(pdb, 'pdb');
      modelRef.current = viewer.getModel(0);
      buildChainInfo(modelRef.current);

      // DIAG: list chains and a few keys
      /*
     try {
       const byChain = chainInfoRef.current.byChain || {};
       const summary = Object.fromEntries(
         Object.entries(byChain).map(([cid, info]) => [cid, { length: info.length }])
       );
       console.log('[Structure] chain summary:', summary);
       // show the first few keys we can accept
       const sample = {};
       for (const [cid, info] of Object.entries(byChain)) {
         sample[cid] = Array.from(info.keyToIndex.keys()).slice(0, 5);
       }
       console.log('[Structure] sample keys (use <Chain|Resi|ICode>):', sample);
     } catch (e) {
       console.log('[Structure] failed to print chain summary:', e);
     }
       */

      // crude size check → enable perf mode for big structures
      let isPerf = false;
      try {
        const atomCount = modelRef.current.selectedAtoms({}).length; // all atoms
        isPerf = atomCount > 20000; // tune threshold
      } catch {
        isPerf = true; // safe fallback
      }
      perfModeRef.current = isPerf;
      setPerfMode(isPerf);

      applyCartoonOnce();
      colorAllDefaultOnce();
      rebuildSurface();
      setupHoverStructureTooltip();

      viewer.setZoomLimits(0.9, 1000);

      // ---- APPLY SAVED CAMERA + CENTER + SLAB ----
      const savedView = data?.view;
      const savedSlab = data?.slab;
      const savedCenter = data?.center;

      // 1) Center on all atoms so rotation group exists
      if (viewer.center) viewer.center({}, false);

      // 2) If we previously saved an explicit center, restore it
      if (savedCenter && viewer.setCenter) {
        viewer.setCenter(savedCenter);
      }

      // 3) Apply the saved camera or a sensible default
      if (savedView) {
        if (typeof savedView.zoom === 'number') {
          savedView.zoom = Math.max(0.1, Math.min(savedView.zoom, 5000));
        }
        viewer.setView(savedView);
        appliedInitialViewRef.current = true;
      } else {
        viewer.zoomTo();
        viewer.zoom(0.8);
      }

      // 4) Apply slab (or widen if missing)
      if (
        savedSlab &&
        Number.isFinite(savedSlab.near) &&
        Number.isFinite(savedSlab.far) &&
        savedSlab.far > savedSlab.near
      ) {
        viewer.setSlab(savedSlab.near, savedSlab.far);
      } else {
        const { near, far } = viewer.getSlab();
        viewer.setSlab(near - 1e6, far + 1e6);
      }

      // Debounce hit-testing a bit more in perf mode
      viewer.setHoverDuration(isPerf ? 60 : 0);

      viewer.render();
    });

    return () => {
      // Cleanup on PDB change/unmount
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      const v = viewerRef.current;
      if (v) {
        _removeHoverShape();
        _clearLinkedShapes();
        v.removeAllSurfaces();
        try { v.clear(); } catch {}
      }
      viewerRef.current = null;
      modelRef.current = null;
      surfaceHandleRef.current = null;
    };
  }, [pdb, panelId]);

  // Update surface without rebuilding the viewer
  useEffect(() => {
    if (!viewerRef.current) return;
    rebuildSurface();
  }, [surface]);

  // Apply saved view once when workspace loads (if viewer already exists)
  useEffect(() => {
    const v = viewerRef.current;
    if (!v) return;
    if (appliedInitialViewRef.current) return;
    const savedView = data?.view;
    if (savedView) {
      v.setView(savedView);
      v.render();
      appliedInitialViewRef.current = true;
    }
  }, [data?.view]);

  // Persist view only on interaction end (avoid re-rendering during drag)
  useEffect(() => {
    const el = viewerDiv.current;
    const v = viewerRef.current;
    if (!el || !v) return;

    let wheelTimeout = null;

    const saveViewAndSlab = () => {
      const view = v.getView();
      const slab = v.getSlab();
      const center = v.getCenter ? v.getCenter() : undefined;
      setPanelData((prev) => ({
        ...prev,
        [panelId]: {
          ...prev[panelId],
          view,
          slab,
          center
        }
      }));
    };

    const onMouseUp = () => saveViewAndSlab();
    const onTouchEnd = () => saveViewAndSlab();
    const onWheel = () => {
      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(saveViewAndSlab, 200);
    };

    el.addEventListener('mouseup', onMouseUp);
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('wheel', onWheel, { passive: true });

    return () => {
      el.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('wheel', onWheel);
      clearTimeout(wheelTimeout);
    };
  }, [panelId, setPanelData]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={viewerDiv}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '0.75rem',
          background: 'white'
        }}
        className="structure-viewer-container"
      />

      {/* StructureTooltip: in perf mode we update via ref to avoid React churn */}
      <div
        ref={tooltipRef}
        style={{
          position: 'absolute',
          right: '10px',
          bottom: '10px',
          background: 'rgba(0,0,0,0.3)',
          color: '#fff',
          padding: '4px 8px',
          borderRadius: '10px',
          pointerEvents: 'none',
          fontSize: '12px',
          zIndex: 10,
          maxWidth: '90%',
          textAlign: 'center',
          display: perfMode ? 'none' : 'block'
        }}
      >
        {tooltip}
      </div>
    </div>
  );
}

export default React.memo(StructureViewer);
