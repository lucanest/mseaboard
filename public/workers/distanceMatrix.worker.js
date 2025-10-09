/**
 * Web Worker to compute the pairwise distance matrix from a list of atoms.
 * Each atom is expected to have { x, y, z, label } properties.
 * The result is sent back as a transferable ArrayBuffer for efficiency.
 */
// distanceMatrix.worker.js
function distance(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = p1.z - p2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function distanceMatrixFromAtomsFlat(atoms) {
  if (!Array.isArray(atoms) || atoms.length === 0) {
    throw new Error("Invalid or empty atoms array provided.");
  }

  const n = atoms.length;
  const labels = atoms.map(a => a.label);
  
  const buffer = new ArrayBuffer(n * n * 8); 
  const matrixData = new Float64Array(buffer);
  
  let maxVal = 0;

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      if (i === j) continue;
      const d = distance(atoms[i], atoms[j]);
      matrixData[i * n + j] = d;
      matrixData[j * n + i] = d;
      
      if (d > maxVal) {
        maxVal = d;
      }
    }
  }

  return { labels, buffer, n, maxVal };
}


self.onmessage = function(e) {
  const { atoms } = e.data;
  if (!atoms) {
    self.postMessage({ error: 'No atom data received.' });
    return;
  }

  try {
    const { labels, buffer, n, maxVal } = distanceMatrixFromAtomsFlat(atoms);
    
    self.postMessage({ result: { labels, buffer, n, maxVal } }, [buffer]);

  } catch (error) {
    self.postMessage({ error: error.message });
  }
};