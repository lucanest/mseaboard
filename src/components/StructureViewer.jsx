import React, { useEffect, useRef, useState } from 'react';
import * as $3Dmol from '3dmol/build/3Dmol-min.js';
import { threeToOne } from './Utils.jsx';

// Per-residue palette for the initial cartoon colors (static)
const residueColorHex = {
  A: '#A7F3D0', C: '#FEF08A', D: '#FCA5A5', E: '#FCA5A5',
  F: '#DDD6FE', G: '#E5E7EB', H: '#FBCFE8', I: '#BFDBFE',
  K: '#FDBA74', L: '#BFDBFE', M: '#DBEAFE', N: '#FECACA',
  P: '#99F6E4', Q: '#FECACA', R: '#FDBA74', S: '#BBF7D0',
  T: '#BBF7D0', V: '#DBEAFE', W: '#C4B5FD', Y: '#DDD6FE',
  '-': '#FFFFFF'
};

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

const chainColors = [
  '#A7F3D0', '#FCA5A5', '#BFDBFE', '#FBCFE8', '#FDBA74', '#DDD6FE',
  '#E5E7EB', '#FEF08A', '#DBEAFE', '#FECACA', '#99F6E4', '#BBF7D0',
  '#C4B5FD', '#FECACA', '#FDBA74', '#BBF7D0', '#DBEAFE', '#DDD6FE'
];
const getChainColor = (chain) => {
  if (!chain) return '#FFFFFF';
  const idx = chain.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % chainColors.length;
  return chainColors[idx];
};

function StructureViewer({ pdb, panelId, surface = true, data, setPanelData }) {
  const viewerDiv = useRef(null);
  const viewerRef = useRef(null);
  const surfaceHandleRef = useRef(null);
  const appliedInitialViewRef = useRef(false);

  // Tooltip: use state for small structures, direct DOM updates in perf mode
  const [tooltip, setTooltip] = useState(null);
  const tooltipRef = useRef(null);

  // Perf controls
  const [perfMode, setPerfMode] = useState(false);
  const perfModeRef = useRef(false);
  const rafIdRef = useRef(null);
  const lastRenderTsRef = useRef(0);

  // 3Dmol handles
  const modelRef = useRef(null);
  const hoverShapeRef = useRef(null); // inexpensive overlay for hover

  // throttle window in ms when perfMode = true
  const HOVER_THROTTLE_MS = 60; // tuned a bit higher for giant structures

  const defaultColorFunc = (atom) => {
    const resn = (atom.resn || '').trim().toUpperCase();
    const one = threeToOne[resn] || '-';
    return residueColorHex[one] || '#FFFFFF';
  };

  const applyCartoonOnce = () => {
    const v = viewerRef.current;
    if (!v) return;
    // Use per-atom colors (we pre-bake them via setColorByFunction)
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
      radius: 1.2,
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

  const setupHoverTooltip = () => {
    const v = viewerRef.current;
    if (!v) return;

    // Restrict picking to CA atoms to reduce hit test frequency
    v.setHoverable(
      { atom: 'CA' },
      true,
      function onHover(atom) {
        if (!atom || atom.hetflag) return;

        const resn = (atom.resn || '').trim().toUpperCase();
        const one = threeToOne[resn] || '-';
        const label = `chain ${atom.chain || ''}, ${atom.resi ?? ''}: ${one}`;

        // Tooltip update: avoid React state churn in perf mode
        if (perfModeRef.current && tooltipRef.current) {
          tooltipRef.current.textContent = label;
          tooltipRef.current.style.display = 'block';
        } else {
          setTooltip(label);
        }

        // Move the lightweight halo
        scheduleHalo(atom);
      },
      function onUnhover() {
        if (perfModeRef.current && tooltipRef.current) {
          tooltipRef.current.style.display = 'none';
        } else {
          setTooltip(null);
        }
        scheduleHalo(null);
      }
    );
  };

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
      setupHoverTooltip();

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

      {/* Tooltip: in perf mode we update via ref to avoid React churn */}
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

      {/* Optional tiny indicator for perf mode */}
      {perfMode && (
        <div
          style={{
            position: 'absolute',
            left: '10px',
            bottom: '10px',
            fontSize: '10px',
            color: '#6b7280',
            background: 'rgba(0,0,0,0.05)',
            padding: '2px 6px',
            borderRadius: '6px'
          }}
        >
          perf mode
        </div>
      )}
    </div>
  );
}

export default React.memo(StructureViewer);
