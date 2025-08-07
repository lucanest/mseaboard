// StructureViewer.jsx
import React, { useEffect, useRef } from 'react';
import * as $3Dmol from '3dmol/build/3Dmol-min.js'

const residueColorHex = {
  A: '#A7F3D0', C: '#FEF08A', D: '#FCA5A5', E: '#FCA5A5',
  F: '#DDD6FE', G: '#E5E7EB', H: '#FBCFE8', I: '#BFDBFE',
  K: '#FDBA74', L: '#BFDBFE', M: '#DBEAFE', N: '#FECACA',
  P: '#99F6E4', Q: '#FECACA', R: '#FDBA74', S: '#BBF7D0',
  T: '#BBF7D0', V: '#DBEAFE', W: '#C4B5FD', Y: '#DDD6FE',
  '-': '#FFFFFF'
};

const threeToOne = {
  ALA: 'A', CYS: 'C', ASP: 'D', GLU: 'E', PHE: 'F', GLY: 'G', HIS: 'H',
  ILE: 'I', LYS: 'K', LEU: 'L', MET: 'M', ASN: 'N', PRO: 'P', GLN: 'Q',
  ARG: 'R', SER: 'S', THR: 'T', VAL: 'V', TRP: 'W', TYR: 'Y', 
  // Add more if needed
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

function StructureViewer({ pdb, panelId , surface = true}) {
  const viewerDiv = useRef();

  useEffect(() => {
    if (!pdb) return;

    ensure3Dmol(() => {
      if (!viewerDiv.current) return;
      viewerDiv.current.innerHTML = '';

      const config = {
        backgroundColor: 'white',
        antialias: true,
        id: `viewer-${panelId}`,
        width: '100%',
        height: '100%'
      };

      const viewer = window.$3Dmol.createViewer(viewerDiv.current, config);
      viewer.addModel(pdb, 'pdb');
    //viewer.setStyle({}, {cartoon: { color: 'spectrum' },});
 viewer.setStyle({}, {
  cartoon: {
    colorfunc: function(atom) {
      const resn = (atom.resn || '').trim().toUpperCase();
      const oneLetter = threeToOne[resn] || '-';
      const color = residueColorHex[oneLetter] || '#FFFFFF';
      // console.log('atom.resn:', atom.resn, '->', resn, '->', oneLetter, '->', color);
      return color;
    }
  }
});
      if (surface) {
        viewer.addSurface('SAS', { opacity: 0.8, color: 'white' });
      }
      viewer.setZoomLimits(0.9, 1000);
      
      viewer.zoomTo();
      const zoomLevel = 0.8; // Adjust this value to control the initial zoom
      viewer.zoom(zoomLevel);
      viewer.render();
    });
  }, [pdb, panelId, surface]);

  return (
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
  );
}

export default React.memo(StructureViewer);