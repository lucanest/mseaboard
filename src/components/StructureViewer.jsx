// StructureViewer.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Stack, Slider, IconButton, Button, Tooltip, Box, Chip } from '@mui/material';
import {  Cog6ToothIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { threeToOne, hslToHex } from './Utils.jsx';
import { tooltipStyle } from '../constants/styles.js';
import { residueColorHex, chainColors } from '../constants/colors.js';
import { SurfaceGlyph } from './Buttons.jsx';
import { secondaryStructureColors, atomColors } from '../constants/colors.js';  

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


function getSpectrumColor(idx, total) {
  // Rainbow: hue from 0 (red) to 270 (violet)
  const t = total > 1 ? idx / (total - 1) : 0;
  const hue = 270 * t; // 0=red, 90=yellow, 180=cyan, 270=violet
  return hslToHex(hue, 100, 70);
}


// Representation styles
const representationStyles = {
  cartoon: { cartoon: {} },
  stick: { stick: { radius: 0.15 } },
  sphere: { sphere: { radius: 0.5 } },
  line: { line: {} }
};

function StructureViewer({ pdb, panelId, surface = true, data, setPanelData, onHighlight,
  linkedPanelData }) {
  const viewerDiv = useRef(null);
  const viewerRef = useRef(null);
  const appliedInitialViewRef = useRef(false);
  const lastSentHighlightRef = useRef(undefined);
  const [opacity, setOpacity] = useState(0.8);
  const [isHovering, setIsHovering] = useState(false);
  const didInitOpacity = useRef(false);
  const [showControls, setShowControls] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  
  // Initialize state from data prop safely
  const [colorScheme, setColorScheme] = useState(data?.colorScheme || 'chain');
  const [representation, setRepresentation] = useState(data?.representation || 'cartoon');
  const [showWaters, setShowWaters] = useState(data?.showWaters !== undefined ? data.showWaters : false);
  const [showHydrogens, setShowHydrogens] = useState(data?.showHydrogens !== undefined ? data.showHydrogens : false);
  const [showLabels, setShowLabels] = useState(data?.showLabels !== undefined ? data.showLabels : false);
  const [backgroundColor, setBackgroundColor] = useState(data?.backgroundColor || 'white');
  const [surfaceType, setSurfaceType] = useState(data?.surfaceType || 'SAS');
  const [surfaceColor, setSurfaceColor] = useState(data?.surfaceColor || 'chain');
  const [isSpinning, setIsSpinning] = useState(false);


  const colorSchemes = {
      chain: (atom) => getChainColor(atom.chain),
      residue: (atom) => {
        const resn = (atom.resn || '').trim().toUpperCase();
        const one = threeToOne[resn] || '-';
        return residueColorHex[one] || '#FFFFFF';
      },
      element: (atom) => {
        const elem = (atom.elem || '').toUpperCase();
        return atomColors[elem] || '#EA80FC';
      },
    secondary: (atom) => {
        // Enhanced secondary structure coloring
        // Accepts: h=helix, s=sheet, c=coil, t=turn, b=bend, e=bridge
        const ss = (atom.ss || '').toLowerCase();
        if (ss === 'h') return secondaryStructureColors.helix;
        if (ss === 's') return secondaryStructureColors.sheet;
        if (ss === 'c') return secondaryStructureColors.coil;
        if (ss === 't') return secondaryStructureColors.turn;
        if (ss === 'b') return secondaryStructureColors.bend;
        if (ss === 'e') return secondaryStructureColors.bridge;
        return '#CCCCCC'; // default
      },
      spectrum: (atom) => {
        // Color by residue index along a spectrum
        const chain = (atom.chain || 'A').trim() || 'A';
        const info = chainInfoRef.current.byChain[chain];
        if (!info) return '#888';
        // Find index of this residue
        const icode = String(atom.inscode ?? atom.icode ?? '').trim();
        const key = `${chain}|${atom.resi}|${icode}`;
        const idx = info.keyToIndex.get(key);
        if (typeof idx !== 'number') return '#888';
        return getSpectrumColor(idx, info.length);
      }
    };

  // Restore opacity from data
  useEffect(() => {
    didInitOpacity.current = false;
  }, [panelId]);

  useEffect(() => {
    if (!didInitOpacity.current) {
      if (typeof data?.opacity === 'number') {
        setOpacity(data.opacity);
      } else {
        setOpacity(0.8);
      }
      didInitOpacity.current = true;
    }
  }, [panelId, data?.opacity]);


  // Restore other settings from data.
  useEffect(() => {
    if (!data) return;
    if (data.colorScheme && data.colorScheme !== colorScheme) setColorScheme(data.colorScheme);
    if (data.representation && data.representation !== representation) setRepresentation(data.representation);
    if (data.showWaters !== undefined && data.showWaters !== showWaters) setShowWaters(data.showWaters);
    if (data.showHydrogens !== undefined && data.showHydrogens !== showHydrogens) setShowHydrogens(data.showHydrogens);
    if (data.showLabels !== undefined && data.showLabels !== showLabels) setShowLabels(data.showLabels);
    if (data.backgroundColor && data.backgroundColor !== backgroundColor) setBackgroundColor(data.backgroundColor);
    if (data.surfaceType && data.surfaceType !== surfaceType) setSurfaceType(data.surfaceType);
    if (data.surfaceColor && data.surfaceColor !== surfaceColor) setSurfaceColor(data.surfaceColor);
  }, [data, colorScheme, representation, showWaters, showHydrogens, showLabels, backgroundColor, surfaceType, surfaceColor, isSpinning]);

  // StructureTooltip
  const [tooltip, setStructureTooltip] = useState(null);
  const tooltipRef = useRef(null);

  // Show/hide structure tooltip whether it's content is not empty
  useEffect(() => {
    if (tooltip) {
      setShowTooltip(true);
    } else {
      setShowTooltip(false);
    }
  }, [tooltip]);

  // Perf controls
  const [perfMode, setPerfMode] = useState(false);
  const perfModeRef = useRef(false);
  const rafIdRef = useRef(null);
  const lastRenderTsRef = useRef(0);

  const controlsRef = useRef(null);

  // Helper to persist settings to parent
  const persistSetting = useCallback((key, value) => {
      setPanelData((prev) => ({
          ...prev,
          [panelId]: {
              ...prev[panelId],
              [key]: value
          }
      }));
  }, [panelId, setPanelData]);

  // Close controls when clicking outside
  useEffect(() => {
    if (!showControls) return;

    function handleClickOutside(event) {
      if (
        controlsRef.current &&
        !controlsRef.current.contains(event.target)
      ) {
        setShowControls(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showControls]);

  // 3Dmol handles
  const modelRef = useRef(null);
  const hoverShapeRef = useRef(null);
  const linkedShapesRef = useRef([]);
  const labelShapesRef = useRef([]);

  const _clearLinkedShapes = () => {
    const v = viewerRef.current;
    if (!v) return;
    for (const sh of linkedShapesRef.current) {
      try { v.removeShape(sh); } catch {}
    }
    linkedShapesRef.current = [];
  };

  const _clearLabels = () => {
    const v = viewerRef.current;
    if (!v) return;
    for (const sh of labelShapesRef.current) {
      try { v.removeLabel(sh); } catch {}
    }
    labelShapesRef.current = [];
  };

  const _addLinkedSphere = (atom) => {
    const v = viewerRef.current;
    if (!v || !atom) return null;
    const sh = v.addSphere({
      center: { x: atom.x, y: atom.y, z: atom.z },
      radius: 1.6,
      color: 'red',
      opacity: 1
    });
    return sh;
  };

  const HOVER_THROTTLE_MS = 60;

  const chainInfoRef = useRef({ byChain: {} });
  const linkedChainIdRef = useRef(data?.linkedChainId);
  useEffect(() => { linkedChainIdRef.current = data?.linkedChainId; }, [data?.linkedChainId]);

  const onHighlightRef = useRef(onHighlight);
  useEffect(() => { onHighlightRef.current = onHighlight; }, [onHighlight]);

  const panelIdRef = useRef(panelId);
  useEffect(() => { panelIdRef.current = panelId; }, [panelId]);

  function buildChainInfo(model) {
    const byChain = {};
    const atoms = model.selectedAtoms({ atom: 'CA' }) || [];
    for (const a of atoms) {
      const chain = (a.chain || 'A').trim() || 'A';
      const resi = a.resi;
      const icode = String(a.inscode ?? a.icode ?? '').trim();
      const key = `${chain}|${resi}|${icode}`;

      if (!byChain[chain]) {
        byChain[chain] = { caAtoms: [], keyToIndex: new Map(), length: 0, minResi: resi };
      }
      const info = byChain[chain];
      info.minResi = Math.min(info.minResi, resi);
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

const setupHoverStructureTooltip = () => {
    const v = viewerRef.current;
    if (!v) return;

    // Make all atoms hoverable
    v.setHoverable(
      {},
      true,
      function onHover(atom) {
        setIsHovering(true);
        if (!atom || atom.hetflag) return;

        // Find the Alpha Carbon for the hovered residue ---
        // No matter which atom of a residue is hovered (e.g., sidechain),
        // we want to highlight and report its Alpha Carbon (CA).

        const chain = (atom.chain || 'A').trim() || 'A';
        const info = chainInfoRef.current.byChain[chain];
        if (!info) return; // Not a chain we have indexed

        const icode = String(atom.inscode ?? atom.icode ?? '').trim();
        const key = `${chain}|${atom.resi}|${icode}`;
        const idx = info.keyToIndex.get(key);

        // If we can't find a corresponding CA atom for this residue, bail.
        if (typeof idx !== 'number') return;
        const caAtom = info.caAtoms[idx];
        if (!caAtom) return;

        // Now, use caAtom for all display and highlighting logic
        const resn = (caAtom.resn || '').trim().toUpperCase();
        const one = threeToOne[resn] || '-';
        const minResi = info.minResi;
        const dispResi = caAtom.resi - minResi + 1;
        const label = `chain ${chain}, ${dispResi}: ${one}`;
        showStructureTooltipText(label);

        try {
          if (typeof onHighlightRef.current === 'function' && idx != null) {
            const payload = { residueIndex: idx, chainId: chain };
            const last = lastSentHighlightRef.current;
            const isSame = last && last.residueIndex === payload.residueIndex && last.chainId === payload.chainId;

            if (!isSame) {
              lastSentHighlightRef.current = payload;
              onHighlightRef.current(payload, panelIdRef.current);
            }
          }
        } catch {}

        // Pass the caAtom to the halo function to ensure the highlight
        // is always centered on the backbone.
        scheduleHalo(caAtom);
      },
        function onUnhover() {
        setIsHovering(false);
        hideStructureTooltipText();
        scheduleHalo(null);
        if (typeof onHighlightRef.current === 'function') {
          if (lastSentHighlightRef.current !== null) {
            lastSentHighlightRef.current = null;
            onHighlightRef.current(null, panelIdRef.current);
          }
        }
      }
    );
  };

  const applyColorScheme = () => {
    const m = modelRef.current;
    const v = viewerRef.current;
    if (!m || !v) return;
    
    m.setColorByFunction({}, colorSchemes[colorScheme]);
    v.render();
  };

  const applyRepresentation = () => {
    const v = viewerRef.current;
    if (!v) return;
    
    // Clear existing styles
    v.setStyle({}, {});
    
    // Apply main representation
    v.setStyle({}, representationStyles[representation]);
    
    // Apply additional styles for specific atom types
    if (showWaters) {
      v.setStyle({ resn: 'HOH' }, { sphere: { radius: 0.3 } });
    }
    
    if (showHydrogens) {
      v.setStyle({ atom: 'H' }, { sphere: { radius: 0.1 } });
    }
    
    v.render();
  };

  const applyLabels = () => {
    _clearLabels();
    if (!showLabels) return;
    
    const v = viewerRef.current;
    const byChain = chainInfoRef.current.byChain;
    if (!v || !byChain) return;

    Object.keys(byChain).forEach(chainId => {
      const info = byChain[chainId];
      // Label every 10th residue to avoid clutter
      info.caAtoms.forEach((atom, index) => {
        if (index % 10 === 0) {
          const label = v.addLabel(
            `${chainId}:${index + 1}`,
            { 
              position: atom, 
              backgroundColor: 'rgba(0,0,0,0.7)', 
              fontColor: 'white',
              fontSize: 10
            }
          );
          labelShapesRef.current.push(label);
        }
      });
    });
    v.render();
  };

  const applyBackgroundColor = () => {
    const v = viewerRef.current;
    if (!v) return;
    
    v.setBackgroundColor(backgroundColor);
    v.render();
  };


  const saveViewState = useCallback(() => {
    const v = viewerRef.current;
    if (!v) return;
    
    const view = v.getView();
    const slab = v.getSlab();
    const center = v.getCenter ? v.getCenter() : undefined;
    
    setPanelData((prev) => ({
      ...prev,
      [panelId]: {
        ...prev[panelId],
        view,
        slab,
        center,
      }
    }));
  }, [panelId, setPanelData]);

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

    _removeHoverShape();
    if (!atom) {
      v.render();
      return;
    }

    hoverShapeRef.current = v.addSphere({
      center: { x: atom.x, y: atom.y, z: atom.z },
      radius: 1.6,
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

  // useEffect hooks for highlighting
  useEffect(() => {
    // If this panel is the source of the highlight, 
    // let the direct onHover/onUnhover logic handle it exclusively.
    if (isHovering) return;
    if (Array.isArray(data?.linkedResiduesByKey) && data.linkedResiduesByKey.length > 0) {
      return;
    }

    const v = viewerRef.current;
    const byChain = chainInfoRef.current.byChain;
    if (!v || !byChain) return;

    const chainId = data?.linkedChainId;
    const residIdx = data?.linkedResidueIndex;

    if (chainId && byChain[chainId] && Number.isInteger(residIdx)) {
      const a = byChain[chainId].caAtoms[residIdx];
      if (a) {
        scheduleHalo(a);
        const info = byChain[chainId];
        const minResi = info ? info.minResi : 1;
        const resn = (a.resn || '').trim().toUpperCase();
        const one = threeToOne[resn] || '-';
        const dispResi = a.resi - minResi + 1;
        const label = `chain ${a.chain || ''}, ${dispResi}: ${one}`;
        showStructureTooltipText(label);
        return;
      }
    }

    hideStructureTooltipText();
    scheduleHalo(null);
  }, [data?.linkedResidueIndex, data?.linkedChainId, linkedPanelData, panelId]);

  useEffect(() => {
    const v = viewerRef.current;
    const byChain = chainInfoRef.current.byChain;
    if (!v || !byChain) return;

    const list = data?.linkedResiduesByKey;
    if (!Array.isArray(list) || list.length === 0) return;

    _clearLinkedShapes();

    const fmt = (a) => {
      const resn = (a.resn || '').trim().toUpperCase();
      const one = threeToOne[resn] || '-';
      const chain = (a.chain || '').trim();
      const info = byChain[chain];
      const minResi = info ? info.minResi : 1;
      const dispResi = (typeof a.resi === 'number') ? (a.resi - minResi + 1) : a.resi;
      return `chain ${chain}, ${dispResi}:${one}`;
    };

    const atomsToShow = [];
    for (const item of list) {
      if (!item) continue;
      const chain = (item.chainId || 'A').trim() || 'A';
      const resi = Number(item.resi);
      const minResi = byChain[chain] ? byChain[chain].minResi : 1;
      const dispResi = resi + minResi - 1;
      const icode = (item.icode || '').trim();

      const info = byChain[chain];
      if (!info) continue;
      
      const key = `${chain}|${dispResi}|${icode}`;
      const idx = info.keyToIndex.get(key);
      if (idx == null) continue;
      
      const atom = info.caAtoms[idx];
      if (atom) atomsToShow.push(atom);
    }

    for (const a of atomsToShow) {
      const sh = _addLinkedSphere(a);
      if (sh) linkedShapesRef.current.push(sh);
    }

    v.render();

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

const surfaceColorSchemes = {
    chain: (atom) => getChainColor(atom.chain),
    element: (atom) => {
      const elem = (atom.elem || '').toUpperCase();
      return atomColors[elem] || '#EA80FC';
    },
    // The 'white' case now correctly returns a function
    white: () => '#FFFFFF',
  };

  const rebuildSurface = () => {
    const v = viewerRef.current;
    if (!v) return;
    v.removeAllSurfaces();

    if (surface) {
      v.addSurface(surfaceType, {
        opacity: opacity,
        colorfunc: surfaceColorSchemes[surfaceColor] || surfaceColorSchemes['chain'],
      });
    }

    v.render();
  };

  // Initialization
  useEffect(() => {
    if (!pdb || !viewerDiv.current) return;

    ensure3Dmol(() => {
      viewerDiv.current.innerHTML = '';

      const viewer = window.$3Dmol.createViewer(viewerDiv.current, {
        backgroundColor: backgroundColor,
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

      let isPerf = false;
      try {
        const atomCount = modelRef.current.selectedAtoms({}).length;
        isPerf = atomCount > 20000;
      } catch {
        isPerf = true;
      }
      perfModeRef.current = isPerf;
      setPerfMode(isPerf);

      // Apply all styles and settings
      applyRepresentation();
      applyColorScheme();
      rebuildSurface();
      setupHoverStructureTooltip();
      applyLabels();
      applyBackgroundColor();

      viewer.setZoomLimits(0.9, 1000);

      // Restore saved view state
      const savedView = data?.view;
      const savedSlab = data?.slab;
      const savedCenter = data?.center;

      if (viewer.center) viewer.center({}, false);

      if (savedCenter && viewer.setCenter) {
        viewer.setCenter(savedCenter);
      }

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

      if (savedSlab && Number.isFinite(savedSlab.near) && Number.isFinite(savedSlab.far) && savedSlab.far > savedSlab.near) {
        viewer.setSlab(savedSlab.near, savedSlab.far);
      } else {
        const { near, far } = viewer.getSlab();
        viewer.setSlab(near - 1e6, far + 1e6);
      }

      viewer.setHoverDuration(isPerf ? 60 : 0);
      viewer.render();
    });

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      const v = viewerRef.current;
      if (v) {
        _removeHoverShape();
        _clearLinkedShapes();
        _clearLabels();
        v.removeAllSurfaces();
        try { v.clear(); } catch {}
      }
      viewerRef.current = null;
      modelRef.current = null;
    };
  }, [pdb, panelId]);

  // Effect hooks 
  useEffect(() => {
    if (viewerRef.current) {
      applyColorScheme();
    }
  }, [colorScheme]);

  useEffect(() => {
    if (viewerRef.current) {
      applyRepresentation();
    }
  }, [representation, showWaters, showHydrogens]);

  useEffect(() => {
    if (viewerRef.current) {
      applyLabels();
    }
  }, [showLabels]);

  useEffect(() => {
    if (viewerRef.current) {
      applyBackgroundColor();
    }
  }, [backgroundColor]);

  useEffect(() => {
    if (viewerRef.current) {
      rebuildSurface();
    }
  }, [surface, opacity, surfaceType, surfaceColor]);

    // Effect hook to control the spin animation
  useEffect(() => {
    const v = viewerRef.current;
    if (!v) return;

    if (isSpinning) {
      v.spin('y'); // Spins around the Y-axis
    } else {
      v.spin(false); // Stops the spin
    }
  }, [isSpinning]);

  // Persist opacity change when slider stops
  const handleOpacityCommit = useCallback((_, v) => {
      const newVal = Array.isArray(v) ? v[0] : v;
      persistSetting('opacity', newVal);
  }, [persistSetting]);

  // useEffect hooks for view persistence (camera movement)
  useEffect(() => {
    const el = viewerDiv.current;
    const v = viewerRef.current;
    if (!el || !v) return;

    let wheelTimeout = null;

    const onMouseUp = () => saveViewState();
    const onTouchEnd = () => saveViewState();
    const onWheel = () => {
      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(saveViewState, 200);
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
  }, [panelId, saveViewState]);

  useEffect(() => {
    lastSentHighlightRef.current = null;
  }, [data?.linkedChainId]);



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
          background: backgroundColor
        }}
        className="structure-viewer-container"
      />
      
      {/* Control Panel */}
      {showControls && (
        
        <Box
          ref={controlsRef}
          sx={{
            position: 'absolute',
            top: 5,
            left: 5,
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 2,
            p: 1,
            boxShadow: 2,
            minWidth: 200,
            maxWidth: 300,
            maxHeight: 'calc(100% - 20px)', // 20px for top+bottom margin
            overflowY: 'auto',
          }}
        >

          {/* Color Scheme */}
          <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Chip
              label="Colors"
              size="small"
              sx={{
                mb: 0.5,
                bgcolor: '#E5E7EB',
                color: 'black',
                fontWeight: 300,
                borderRadius: 1.5,
                fontSize: 10,
                px: 0.5,
                boxShadow: 1,
              }}
            />
            {/* Container for right-aligned icons */}
            <Box>
              {/* Spin Button */}
              <Tooltip title={isSpinning ? "Stop spin" : "Spin structure"} placement="top" slotProps={{
                popper: {
                  sx: {
                    '& .MuiTooltip-tooltip': {
                      backgroundColor: '#E5E7EB',
                      color: 'black',
                      fontSize: 10,
                      fontWeight: 500,
                      borderRadius: 2,
                      boxShadow: 2,
                    }
                  }
                }
              }}>
                <IconButton
                  size="small"
                  onClick={() => {
                    const newValue = !isSpinning;
                    setIsSpinning(newValue);
                    persistSetting('isSpinning', newValue);
                  }}
                  sx={{
                    ml: 0.5, mb: 0.5, background: 'transparent', transition: 'background 0.2s',
                  }}
                >
                  <ArrowPathIcon style={{ width: 20, height: 20, color: '#333' }} />
                </IconButton>
              </Tooltip>

              {/* Surface toggle button */}
              <Tooltip title={surface ? "Hide surface" : "Show surface"} placement="top" slotProps={{
        popper: {
          sx: {
            '& .MuiTooltip-tooltip': {
              backgroundColor: '#E5E7EB',
              color: 'black',
              fontSize: 10,
              fontWeight: 500,
              borderRadius: 2,
              boxShadow: 2,
            }
          }
        }
      }} >
                <IconButton
                  size="small"
                  sx={{
                    ml: 0.5,
                    mb: 0.5, background: 'transparent', transition: 'background 0.2s',
                  }}
                  onClick={() => setPanelData(prev => ({
                    ...prev, [panelId]: { ...prev[panelId], surface: !surface }
                  }))}
                >
                  <SurfaceGlyph style={{ width: 20, height: 20}} />
                </IconButton>
              </Tooltip>
            </Box>
            {/*  */}
  </Box>
            <Stack spacing={0.4}>
              {Object.keys(colorSchemes).map(scheme => (
                <Button
                  key={scheme}
                  size="small"
                  variant={colorScheme === scheme ? "contained" : "outlined"}
                  onClick={() => {
                    setColorScheme(scheme);
                    persistSetting('colorScheme', scheme);
                  }}
                  sx={{ justifyContent: 'center', textTransform: 'none',
                    backgroundColor: colorScheme === scheme ? '#60a5fa' : 'inherit',
                   }}
                >
                  {scheme.charAt(0).toUpperCase() + scheme.slice(1)}
                </Button>
              ))}
            </Stack>
          </Box>

          {/* Representation */}
          <Box sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
            <Chip
              label="Representation"
              size="small"
              sx={{
                mb: 0.5,
                bgcolor: '#E5E7EB',
                color: 'black',
                fontWeight: 300,
                borderRadius: 1.5,
                fontSize: 10,
                px: 0.5,
                boxShadow: 1,
              }}
            />
          </Box>
            <Stack spacing={0.4}>
              {Object.keys(representationStyles).map(style => (
                <Button
                  key={style}
                  size="small"
                  variant={representation === style ? "contained" : "outlined"}
                  onClick={() => {
                    setRepresentation(style);
                    persistSetting('representation', style);
                  }}
                  sx={{ justifyContent: 'center', textTransform: 'none',
                    backgroundColor: representation === style ? '#60a5fa' : 'inherit',
                   }}
                >
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </Button>
              ))}
            </Stack>
          </Box>

          {/* Options */}
          <Box sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
            <Chip
              label="Options"
              size="small"
              sx={{
                mb: 0.5,
                bgcolor: '#E5E7EB',
                color: 'black',
                fontWeight: 300,
                borderRadius: 1.5,
                fontSize: 10,
                px: 0.5,
                boxShadow: 1,
              }}
            />
          </Box>
            <Stack spacing={0.4}>
              <Button 
                size="small" 
                variant={showWaters ? "contained" : "outlined"}
                onClick={() => {
                    const newValue = !showWaters;
                    setShowWaters(newValue);
                    persistSetting('showWaters', newValue);
                }}
                sx={{ textTransform: 'none', backgroundColor: showWaters ? '#60a5fa' : 'inherit' }}
              >
                Waters
              </Button>
              <Button 
                size="small" 
                variant={showLabels ? "contained" : "outlined"}
                onClick={() => {
                    const newValue = !showLabels;
                    setShowLabels(newValue);
                    persistSetting('showLabels', newValue);
                }}
                sx={{ textTransform: 'none', backgroundColor: showLabels ? '#60a5fa' : 'inherit' }}
              >
                Labels
              </Button>
              <Button 
                size="small" 
                variant={showHydrogens ? "contained" : "outlined"}
                onClick={() => {
                    const newValue = !showHydrogens;
                    setShowHydrogens(newValue);
                    persistSetting('showHydrogens', newValue);
                }}
                sx={{ textTransform: 'none', backgroundColor: showHydrogens ? '#60a5fa' : 'inherit' }}
              >
                Hydrogens
              </Button>
            </Stack>
          </Box>

          {/* Surface Controls */}
          {surface && (
            <>
              {/* Surface Type */}
              <Box sx={{ mb: 1 }}>
                <Chip label="Surface Type" size="small" sx={{ mb: 0.5, bgcolor: '#E5E7EB', color: 'black', fontWeight: 300, borderRadius: 1.5, fontSize: 10, px: 0.5, boxShadow: 1 }} />
                <Stack spacing={0.4} direction="row">
                  {['SAS', 'SES', 'VDW'].map(type => (
                    <Button key={type} size="small" variant={surfaceType === type ? "contained" : "outlined"}
                      onClick={() => {
                        setSurfaceType(type);
                        persistSetting('surfaceType', type);
                      }}
                      sx={{ flex: 1, textTransform: 'none', backgroundColor: surfaceType === type ? '#60a5fa' : 'inherit' }}
                    >
                      {type}
                    </Button>
                  ))}
                </Stack>
              </Box>

              {/* Surface Color */}
              <Box sx={{ mb: 1 }}>
                <Chip label="Surface Color" size="small" sx={{ mb: 0.5, bgcolor: '#E5E7EB', color: 'black', fontWeight: 300, borderRadius: 1.5, fontSize: 10, px: 0.5, boxShadow: 1 }} />
                <Stack spacing={0.4} direction="row">
                  {['chain', 'element', 'white'].map(color => (
                    <Button key={color} size="small" variant={surfaceColor === color ? "contained" : "outlined"}
                      onClick={() => {
                        setSurfaceColor(color);
                        persistSetting('surfaceColor', color);
                      }}
                      sx={{ flex: 1, textTransform: 'none', backgroundColor: surfaceColor === color ? '#60a5fa' : 'inherit' }}
                    >
                      {color.charAt(0).toUpperCase() + color.slice(1)}
                    </Button>
                  ))}
                </Stack>
              </Box>

              {/* Surface Opacity Slider */}
              <Box sx={{ mb: 1 }}>
                <Chip label={`Surface opacity: ${Math.round(opacity * 100)}%`} size="small" sx={{ mb: 0.5, bgcolor: '#E5E7EB', color: 'black', fontWeight: 300, borderRadius: 1.5, fontSize: 10, px: 0.5, boxShadow: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                  <Slider value={opacity} onChange={(_, v) => setOpacity(Array.isArray(v) ? v[0] : v)} onChangeCommitted={handleOpacityCommit} step={0.01} min={0.4} max={1} size="small"
                    sx={{
                      width: '90%',
                      maxWidth: 180,
                      color: '#61A6FB',
                      mx: 'auto',
                      '& .MuiSlider-track': { border: 'none' },
                      '& .MuiSlider-thumb': { width: 16, height: 16, backgroundColor: '#fff', '&::before': { boxShadow: '0 4px 8px rgba(0,0,0,0.4)', }, '&:hover, &.Mui-focusVisible, &.Mui-active': { boxShadow: 'none', }, },
                    }}
                  />
                </Box>
              </Box>
            </>
          )}

{/* Background */}
<Box sx={{ mb: 1 }}>
  <Stack direction="row" spacing={1} alignItems="center">
    <Chip
      label="Background"
      size="small"
      sx={{
        bgcolor: '#E5E7EB',
        color: 'black',
        fontWeight: 300,
        borderRadius: 1.5,
        fontSize: 10,
        px: 0.5,
        boxShadow: 1,
      }}
    />
    <Stack direction="row" spacing={0.5} flexWrap="wrap">
      {['white', '#1a1a1a'].map(color => (
        <Box
          key={color}
          sx={{
            width: 24,
            height: 24,
            bgcolor: color,
            border: '2px solid',
            borderColor: backgroundColor === color ? 'primary.main' : 'transparent',
            cursor: 'pointer',
            borderRadius: 1,
            margin: '2px!important'
          }}
          onClick={() => {
              setBackgroundColor(color);
              persistSetting('backgroundColor', color);
          }}
        />
      ))}
    </Stack>
  </Stack>
</Box>
        </Box>
      )}

      {/* Structure Tooltip */}
      { showTooltip && (
      <div
        ref={tooltipRef}
        style={{
          ...tooltipStyle,
        right: '10px',
        bottom: '4px',
        display: perfMode ? 'none' : 'block',
        maxWidth: '120px',
        fontWeight: '600',
        }}
        
      >
        {tooltip}
      </div>
      )}

      {/* Toggle Controls Button (when hidden) */}
      {!showControls && (
        <IconButton
          sx={{
            position: 'absolute',
            top: 5,
            left: 5,
            background: 'rgba(255, 255, 255, 0.9)',
            boxShadow: 2,
                '&:hover': {
           background: '#DBEAFE',
           },
          }}
          onClick={() => setShowControls(true)}
        >
          <Cog6ToothIcon style={{ width: 14, height: 14, color: '#333' }} />
        </IconButton>
      )}
    </div>
  );
}

export default React.memo(StructureViewer);
