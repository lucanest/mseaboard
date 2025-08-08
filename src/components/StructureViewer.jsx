// StructureViewer.jsx
import React, { useEffect, useRef ,useState} from 'react';
import * as $3Dmol from '3dmol/build/3Dmol-min.js'
import { threeToOne } from './Utils.jsx';

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
  const appliedInitialViewRef = useRef(false); // only apply saved view once per PDB
  const [tooltip, setTooltip] = useState(null);

  
  // --- helpers ---
  const applyCartoon = () => {
    const v = viewerRef.current;
    if (!v) return;
    v.setStyle({}, {
      cartoon: {
        colorfunc: function(atom) {
          const resn = (atom.resn || '').trim().toUpperCase();
          const one = threeToOne[resn] || '-';
          return residueColorHex[one] || '#FFFFFF';
        }
      }
    });
  };

const setupHoverTooltip = () => {
  const v = viewerRef.current;
  if (!v) return;

  v.setHoverable(
    {},
    true,
    function onHover(atom) {
      if (!atom || atom.hetflag) return;

      const resn = (atom.resn || '').trim().toUpperCase();
      const one = threeToOne[resn] || '-';
      const chain = atom.chain || '';
      const resi = atom.resi ?? '';
      const text = `chain ${chain}, ${resi}:  ${one}`
      setTooltip(text); // <-- set tooltip text
    },
    function onUnhover() {
      setTooltip(null); // <-- hide tooltip
    }
  );
};

  const rebuildSurface = () => {
    const v = viewerRef.current;
    if (!v) return;
    // clear previous surface
    v.removeAllSurfaces();
    surfaceHandleRef.current = null;

    if (surface) {
      // add new surface with chain-based color
      surfaceHandleRef.current = v.addSurface('SAS', {
        opacity: 0.8,
        colorfunc: function(atom) {
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
    applyCartoon();
    rebuildSurface();
    setupHoverTooltip();

    viewer.setZoomLimits(0.9, 1000);

    // ---- APPLY SAVED CAMERA + CENTER + SLAB ----
const savedView  = data?.view;
const savedSlab  = data?.slab;
const savedCenter = data?.center;

// 1) Make sure viewer has a sane pivot.
//    Center on *all* atoms so the internal rotation group exists.
if (viewer.center) viewer.center({}, false);

// 2) If we previously saved an explicit center, restore it.
if (savedCenter && viewer.setCenter) {
  viewer.setCenter(savedCenter);
}

// 3) Apply the saved camera
if (savedView) {
  if (typeof savedView.zoom === 'number') {
    savedView.zoom = Math.max(0.1, Math.min(savedView.zoom, 5000));
  }
  viewer.setView(savedView);
  appliedInitialViewRef.current = true;
} else {
  // default for first-time loads
  viewer.zoomTo();
  viewer.zoom(0.8);
}

// 4) Apply slab (or widen if missing/bad)
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
viewer.setHoverDuration(0);
viewer.render();
  });
}, [pdb, panelId]); // NOTE: not depending on `surface` here

  // Update surface without rebuilding the viewer
  useEffect(() => {
    if (!viewerRef.current) return;
    rebuildSurface(); // keeps current view
  }, [surface]);

  // Apply saved view once when workspace loads (if viewer already exists)
  useEffect(() => {
    const v = viewerRef.current;
    if (!v) return;
    if (appliedInitialViewRef.current) return; // already applied for this PDB
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
  const view = v.getView();      // camera/rotation/translation
  const slab = v.getSlab();      // { near, far }
  const center = v.getCenter ? v.getCenter() : undefined; 
  setPanelData(prev => ({
    ...prev,
    [panelId]: {
      ...prev[panelId],
      view,
      slab,
      center,                   
    }
  }));
};

  const onMouseUp = () => saveViewAndSlab();
  const onTouchEnd = () => saveViewAndSlab();
  const onWheel = () => {
    clearTimeout(wheelTimeout);
    wheelTimeout = setTimeout(saveViewAndSlab, 200); // debounce wheel
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
{tooltip && (
        <div
          style={{
            position: 'absolute',
            //left: '80%',
            right: '10px',
            bottom: '10px',
            transform: 'translateX(0%)',
            background: 'rgba(0,0,0,0.3)',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: '10px',
            pointerEvents: 'none',
            fontSize: '12px',
            zIndex: 10,
            maxWidth: '90%',
            textAlign: 'center',
            display: 'block'
          }}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}

export default React.memo(StructureViewer);