// Utils.jsx

export const threeToOne = {
  'ALA': 'A', 'ARG': 'R', 'ASN': 'N', 'ASP': 'D', 'CYS': 'C',
  'GLN': 'Q', 'GLU': 'E', 'GLY': 'G', 'HIS': 'H', 'ILE': 'I',
  'LEU': 'L', 'LYS': 'K', 'MET': 'M', 'PHE': 'F', 'PRO': 'P',
  'SER': 'S', 'TRP': 'W', 'THR': 'T', 'TYR': 'Y', 'VAL': 'V',  'SEC':'U', 'PYL':'O'
};

const codonTable = {
  'TTT': 'F', 'TTC': 'F', 'TTA': 'L', 'TTG': 'L',
  'TCT': 'S', 'TCC': 'S', 'TCA': 'S', 'TCG': 'S',
  'TAT': 'Y', 'TAC': 'Y', 'TAA': '*', 'TAG': '*',
  'TGT': 'C', 'TGC': 'C', 'TGA': '*', 'TGG': 'W',

  'CTT': 'L', 'CTC': 'L', 'CTA': 'L', 'CTG': 'L',
  'CCT': 'P', 'CCC': 'P', 'CCA': 'P', 'CCG': 'P',
  'CAT': 'H', 'CAC': 'H', 'CAA': 'Q', 'CAG': 'Q',
  'CGT': 'R', 'CGC': 'R', 'CGA': 'R', 'CGG': 'R',

  'ATT': 'I', 'ATC': 'I', 'ATA': 'I', 'ATG': 'M',
  'ACT': 'T', 'ACC': 'T', 'ACA': 'T', 'ACG': 'T',
  'AAT': 'N', 'AAC': 'N', 'AAA': 'K', 'AAG': 'K',
  'AGT': 'S', 'AGC': 'S', 'AGA': 'R', 'AGG': 'R',

  'GTT': 'V', 'GTC': 'V', 'GTA': 'V', 'GTG': 'V',
  'GCT': 'A', 'GCC': 'A', 'GCA': 'A', 'GCG': 'A',
  'GAT': 'D', 'GAC': 'D', 'GAA': 'E', 'GAG': 'E',
  'GGT': 'G', 'GGC': 'G', 'GGA': 'G', 'GGG': 'G',
  '---' : '-'
};

const proteinOnlyChars = new Set(['D', 'E', 'F', 'H', 'I', 'K', 'L', 'M', 'P', 'Q', 'R', 'S', 'V', 'W', 'Y']);

export function isNucleotide(msaData) {
  if (!msaData || msaData.length === 0) return true;
  for (let i = 0; i < Math.min(msaData.length, 10); i++) {
    const seq = msaData[i].sequence.toUpperCase();
    for (let j = 0; j < Math.min(seq.length, 50); j++) {
      if (proteinOnlyChars.has(seq[j])) return false;
    }
  }
  return true;
}

export function translateNucToAmino(msa) {
  return msa.map(seq => {
    let aaSeq = '';
    for (let i = 0; i < seq.sequence.length - 2; i += 3) {
      const codon = seq.sequence.slice(i, i + 3).toUpperCase();
      aaSeq += codonTable[codon] || 'X';
    }
    return { ...seq, sequence: aaSeq };
  });
}

export function parsePhylipDistanceMatrix(text) {
  const lines = text.trim().split(/\r?\n/).filter(x => x.trim());
  if (!lines.length) throw new Error("Empty PHYLIP file");

  const n = parseInt(lines[0]);
  if (isNaN(n) || n < 1) throw new Error('Invalid PHYLIP matrix: bad header');

  // Guess format:
  // - If each data row has n numbers after the label => square
  // - If row i has i numbers after the label => lower-triangular
  // - Otherwise, error

  const labels = [];
  let matrix = Array.from({ length: n }, () => Array(n).fill(0));
  let format = null; // "square" or "lower"

  // Inspect first two rows to guess format
  function extractNums(line) {
    // Label in first 10 chars, rest is numbers
    return line.slice(10).trim().split(/\s+/).filter(Boolean);
  }

  if (lines.length - 1 < n) throw new Error('File too short for PHYLIP format');

  const firstNums = extractNums(lines[1]);
  if (firstNums.length === n) {
    format = "square";
  } else if (firstNums.length === 1) {
    format = "lower";
  } else {
    throw new Error("Unrecognized PHYLIP matrix format");
  }

  // Parse
  if (format === "square") {
    for (let i = 0; i < n; ++i) {
      const line = lines[i + 1];
      const label = line.slice(0, 10).trim();
      labels.push(label);
      const nums = extractNums(line).map(Number);
      if (nums.length !== n) throw new Error(`Row ${i+1} does not have ${n} values`);
      matrix[i] = nums;
    }
  } else if (format === "lower") {
    // Lower triangular: fill only lower triangle, then mirror to upper triangle
    for (let i = 0; i < n; ++i) {
      const line = lines[i + 1];
      const label = line.slice(0, 10).trim();
      labels.push(label);
      const nums = extractNums(line).map(Number);
      if (nums.length !== i + 1) throw new Error(`Row ${i+1} does not have ${i+1} values`);
      for (let j = 0; j <= i; ++j) {
        matrix[i][j] = nums[j];
        matrix[j][i] = nums[j]; // Fill symmetric
      }
    }
  }

  return { labels, matrix };
}


export function parseFasta(content) {
  const lines = content.split(/\r?\n/);
  const result = [];
  let current = null;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    if (line.startsWith(">")) {
      if (current) result.push(current);
      current = { id: line.slice(1).trim(), sequence: "" };
    } else if (current) {
      current.sequence += line.trim();
    }
  }
  if (current) result.push(current);

  return result;
}

export function getLeafOrderFromNewick(newick) {
  // Simple regex to parse leaf names (assuming they do not contain parentheses, colons, commas, or semicolons)
  return (newick.match(/[\w\.\-\|]+(?=[,\)\:])/g) || []);
}

// Strip NHX annotations like [&&NHX:foo=bar]
const stripNhx = (s) => s.replace(/\[&&NHX[^\]]*\]/g, '');

// Very small Newick parser that preserves branch lengths
export function parseNewickToTree(newickRaw) {
  const s = stripNhx(newickRaw).trim().replace(/;$/, '');
  let i = 0;

  const readName = () => {
    let start = i;
    // names can include underscores, dots, numbers, etc. stop at ,:() whitespace
    while (i < s.length && !",:()".includes(s[i])) i++;
    return s.slice(start, i).trim();
  };

  const readNumber = () => {
    const m = s.slice(i).match(/^([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/);
    if (!m) return null;
    i += m[0].length;
    return parseFloat(m[0]);
  };

  const node = () => {
    let n = { name: '', length: 0, children: [] };

    if (s[i] === '(') {
      i++; // consume '('
      while (true) {
        n.children.push(node());
        if (s[i] === ',') { i++; continue; }
        if (s[i] === ')') { i++; break; }
        // tolerate whitespace
        if (/\s/.test(s[i])) { i++; continue; }
        throw new Error('Newick parse error near ' + s.slice(i, i+20));
      }
      // optional node name
      if (s[i] && !",:)".includes(s[i])) n.name = readName();
    } else {
      n.name = readName(); // leaf name
    }

    if (s[i] === ':') {
      i++;
      const len = readNumber();
      n.length = (len != null ? len : 0);
    }

    return n;
  };

  const root = node();
  return root;
}

export function collectLeaves(root) {
  const leaves = [];
  const dfs = (n) => {
    if (!n.children || n.children.length === 0) {
      if (!n.name) {
        // unnamed leaf — give it something stable
        n.name = `leaf_${leaves.length+1}`;
      }
      leaves.push(n);
      return;
    }
    n.children.forEach(dfs);
  };
  dfs(root);
  return leaves;
}

// Build parent/depth maps so we can compute LCA-style distances
function indexTree(root) {
  const parent = new Map();
  const depth = new Map();          // distance from root (sum of branch lengths)
  const byName = new Map();

  const stack = [{ node: root, d: 0, p: null }];
  while (stack.length) {
    const { node, d, p } = stack.pop();
    depth.set(node, d);
    if (p) parent.set(node, p);
    if (!node.children || node.children.length === 0) {
      byName.set(node.name, node);
    }
    (node.children || []).forEach(ch =>
      stack.push({ node: ch, d: d + ch.length, p: node })
    );
  }
  return { parent, depth, byName };
}

// distance(u,v) = depth(u)+depth(v) - 2*depth(lca)
function lcaDistance(u, v, parent, depth) {
  const seen = new Set();
  let a = u, b = v;
  while (a) { seen.add(a); a = parent.get(a) || null; }
  while (b && !seen.has(b)) { b = parent.get(b) || null; }
  const lca = b || null;
  const du = depth.get(u) || 0;
  const dv = depth.get(v) || 0;
  const dl = lca ? (depth.get(lca) || 0) : 0;
  return du + dv - 2 * dl;
}

export function newickToDistanceMatrix(newickText) {
  const root = parseNewickToTree(newickText);
  const { parent, depth, byName } = indexTree(root);
  const labels = Array.from(byName.keys());
  // invert the order to match input order
  labels.reverse();
  const nodes = labels.map(n => byName.get(n));

  const N = labels.length;
  const matrix = Array.from({ length: N }, () => Array(N).fill(0));
  for (let i = 0; i < N; i++) {
    for (let j = i+1; j < N; j++) {
      const d = lcaDistance(nodes[i], nodes[j], parent, depth);
      matrix[i][j] = matrix[j][i] = d;
    }
  }
  return { labels, matrix };
}

// --- Download utilities ---

/** Download arbitrary text as a file. */
export function downloadText(filename, text, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** FASTA stringify helper (arrays of {id, sequence} or string sequences). */
export function toFasta(entries) {
  if (!entries || !entries.length) return '';
  if (typeof entries[0] === 'string') {
    return entries.map((seq, i) => `>seq${i + 1}\n${seq}`).join('\n');
  }
  return entries
    .map(e => `>${(e.id || 'seq').toString()}\n${e.sequence || ''}`)
    .join('\n');
}

/** MSA to PHYLIP format (sequential). */
export function msaToPhylip(aln){
      const n = aln.length;
      const L = aln[0]?.sequence?.length || 0;
      const safe = (s) => (s || '')
        .replace(/\s+/g, '_')
      let out = `${n} ${L}\n`;
      for (const seq of aln) {
        out += safe(seq.id)+'\t' + seq.sequence.toUpperCase().replace(/\*/g, 'X') + '\n';
      }
      return out;
    };

/** PHYLIP distance matrix writer. */
export function toPhylip(labels, matrix) {
  const n = labels?.length || 0;
  if (!n || !matrix?.length) return '';
  const namePad = (s, width = 10) => (s + ' '.repeat(width)).slice(0, width);
  const lines = [`${n}`];
  for (let i = 0; i < n; i++) {
    const row = matrix[i] || [];
    const nums = row
      .map(v => (typeof v === 'number' ? v : Number(v) || 0))
      .map(v => v.toFixed(5));
    lines.push(`${namePad(labels[i] || `tax${i + 1}`, 10)} ${nums.join(' ')}`);
  }
  return lines.join('\n');
}

// quick filetype detector (ext + sniff)
export function detectFileType(filename, text){
  const lower = filename.toLowerCase();

  // by extension first
  if (lower.endsWith('.json')) return 'board';
  if (/\.(fasta|fas|fa)$/.test(lower)) return 'alignment';
  if (/\.(nwk|nhx)$/.test(lower)) return 'tree';
  if (/\.(tsv|csv|txt)$/.test(lower)) return 'histogram';
  if (/\.(phy|phylip|dist)$/.test(lower)) return 'heatmap';
  if (lower.endsWith('.pdb')) return 'structure';

  // by quick content sniff as fallback
  const head = text.slice(0, 2000);

  // FASTA
  if (/^>\S/m.test(head)) return 'alignment';

  // Newick / NHX
  if (head.trim().startsWith('(') && head.includes(';')) return 'tree';
  if (head.includes('[&&NHX')) return 'tree';

  // PDB
  if (/^(ATOM|HETATM|HEADER)\b/m.test(head)) return 'structure';

  // PHYLIP-ish distmat (first line looks like an integer count)
  if (/^\s*\d+\s*$/m.test(head.split(/\r?\n/)[0] || '')) return 'heatmap';

  // numeric columns -> histogram-ish
  if (/[\d\.\-eE]+[,\t][\d\.\-eE]/.test(head)) return 'histogram';

  return 'unknown';
};


export function computeSiteStats(msa, codonMode = false){
  if (!Array.isArray(msa) || msa.length === 0) {
    const siteHeader = codonMode ? "codon" : "site";
    return { headers: [siteHeader, "conservation", "gap_fraction"], rows: [] };
  }

  const seqs = msa.map(s => (typeof s === 'string' ? s : s.sequence) || '');
  const L = (typeof msa[0] === 'string' ? msa[0] : msa[0].sequence)?.length || 0;

  const rows = [];

  if (!codonMode) {
    for (let col = 0; col < L; col++) {
      const chars = seqs.map(s => s[col] || '-');
      const nonGap = chars.filter(c => c && c !== '-');
      const gapFraction = chars.length ? (chars.length - nonGap.length) / chars.length : 0;

      let conservation = 0;
      if (nonGap.length) {
        const counts = new Map();
        for (const c of nonGap) counts.set(c, (counts.get(c) || 0) + 1);
        const max = Math.max(...counts.values());
        conservation = max / nonGap.length; // fraction of most frequent non-gap residue
      }

      rows.push({ site: col, conservation, gap_fraction: gapFraction });
    }
  } else {
    const codonCount = Math.floor(L / 3);
    for (let i = 0; i < codonCount; i++) {
      const c0 = i * 3, c1 = c0 + 1, c2 = c0 + 2;
      // Build triplets; if any position missing treat as gap
      const triplets = seqs.map(s => {
        const a = s[c0] || '-', b = s[c1] || '-', c = s[c2] || '-';
        return (a === '-' || b === '-' || c === '-') ? '---' : (a + b + c);
      });

      const nonGap = triplets.filter(t => t !== '---');
      const gapFraction = triplets.length ? (triplets.length - nonGap.length) / triplets.length : 0;

      let conservation = 0;
      if (nonGap.length) {
        const counts = new Map();
        for (const t of nonGap) counts.set(t, (counts.get(t) || 0) + 1);
        const max = Math.max(...counts.values());
        conservation = max / nonGap.length; // fraction of most frequent non-gap codon
      }

      rows.push({ codon: i, conservation, gap_fraction: gapFraction });
    }
  }

  const siteHeader = codonMode ? "codon" : "site";
  return { headers: [siteHeader, "conservation", "gap_fraction"], rows };
};

/**
 * Neighbor Joining algorithm to build a phylogenetic tree from a distance matrix
 * Based on the algorithm by Saitou and Nei (1987)
 */

function neighborJoining(distanceMatrix, labels) {
  // Create a deep copy of the distance matrix to avoid modifying the original array.
  let D = distanceMatrix.map(row => [...row]);
  let currentLabels = [...labels];

  // The base case for the recursion: if only two taxa are left, join them.
  if (currentLabels.length === 2) {
    const dist = D[0][1] / 2;
    return `(${currentLabels[0]}:${dist.toFixed(6)},${currentLabels[1]}:${dist.toFixed(6)});`;
  }

  // The main loop continues until only two nodes (clusters) remain.
  while (currentLabels.length > 2) {
    const n = currentLabels.length;

    // Calculate the net divergence (sum of distances) for each node.
    const r = D.map(row => row.reduce((sum, val) => sum + val, 0));

    // Calculate the Q-matrix, which adjusts distances based on net divergence.
    const Q = D.map((row, i) =>
      row.map((val, j) => {
        if (i === j) {
          return 0;
        }
        return (n - 2) * val - r[i] - r[j];
      })
    );

    // Find the pair of nodes with the minimum Q value. These are the neighbors to be joined.
    let minQ = Infinity;
    let minI = -1;
    let minJ = -1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Q[i][j] < minQ) {
          minQ = Q[i][j];
          minI = i;
          minJ = j;
        }
      }
    }

    // Calculate the branch lengths from the new internal node to the two joined nodes.
    const dist_i_u = 0.5 * D[minI][minJ] + (r[minI] - r[minJ]) / (2 * (n - 2));
    const dist_j_u = D[minI][minJ] - dist_i_u;

    // Create the new node's label in Newick format, preserving the tree structure.
    const newNodeLabel = `(${currentLabels[minI]}:${dist_i_u.toFixed(6)},${currentLabels[minJ]}:${dist_j_u.toFixed(6)})`;

    // Calculate the distances from the new node to all other existing nodes.
    const newDistances = [];
    for (let k = 0; k < n; k++) {
      if (k !== minI && k !== minJ) {
        const dist = 0.5 * (D[minI][k] + D[minJ][k] - D[minI][minJ]);
        newDistances.push(dist);
      }
    }

    // --- Update the distance matrix and labels for the next iteration ---

    // Create a new matrix by removing the rows and columns of the joined nodes.
    const newD = [];
    const newLabels = [];
    for (let i = 0; i < n; i++) {
      if (i !== minI && i !== minJ) {
        const newRow = [];
        for (let j = 0; j < n; j++) {
          if (j !== minI && j !== minJ) {
            newRow.push(D[i][j]);
          }
        }
        newD.push(newRow);
        newLabels.push(currentLabels[i]);
      }
    }

    // Add the new distances for the newly created node.
    for (let i = 0; i < newDistances.length; i++) {
      newD[i].push(newDistances[i]);
    }
    newD.push([...newDistances, 0]); // Add the row for the new node.
    newLabels.push(newNodeLabel);

    // Set the updated matrix and labels for the next loop iteration.
    D = newD;
    currentLabels = newLabels;
  }

  // Once two nodes are left, join them to form the final tree.
  const dist = D[0][1] / 2;
  return `(${currentLabels[0]}:${dist.toFixed(6)},${currentLabels[1]}:${dist.toFixed(6)});`;
}


/**
 * Wrapper function to build tree from distance matrix data
 */
export function buildTreeFromDistanceMatrix(labels, matrix) {
  try {
    // Validate input
    if (!labels || !matrix || labels.length !== matrix.length) {
      throw new Error('Invalid distance matrix data');
    }

    // Run neighbor joining algorithm
    const newickTree = neighborJoining(matrix, labels);
    
    return newickTree;
  } catch (error) {
    console.error('Error building tree:', error);
    throw new Error(`Failed to build tree: ${error.message}`);
  }
}

export function computeNormalizedHammingMatrix(msaArray) {
  const seqs = msaArray.map(s => ({
    id: s.id,
    seq: (s.sequence || '').toUpperCase()
  }));
  const labels = seqs.map(s => s.id);

  const N = seqs.length;
  const matrix = Array.from({ length: N }, () => Array(N).fill(0));

  const isGap = (c) => c === '-' || c === '.';

  for (let i = 0; i < N; i++) {
    matrix[i][i] = 0;
    for (let j = i + 1; j < N; j++) {
      const A = seqs[i].seq;
      const B = seqs[j].seq;
      const L = Math.min(A.length, B.length);

      let comparable = 0;
      let mismatches = 0;

      for (let k = 0; k < L; k++) {
        const aChar = A[k];
        const bChar = B[k];
        if (isGap(aChar) || isGap(bChar)) continue;
        comparable++;
        if (aChar !== bChar) mismatches++;
      }

      const d = comparable > 0 ? (mismatches / comparable) : 0;
      matrix[i][j] = d;
      matrix[j][i] = d;
    }
  }

  return { labels, matrix };
}

/** Parse PDB: returns chain -> { atomsCA: [{label,x,y,z,resSeq,iCode}], seq: "AA..."} */
export function parsePdbChains(pdb) {
  const chains = new Map();
  const seenCA = new Set();

  const get = (cid) => {
    if (!chains.has(cid)) chains.set(cid, { atomsCA: [], seq: [], minResi: null });
    return chains.get(cid);
  };

  for (const line of pdb.split(/\r?\n/)) {
    if (!line.startsWith('ATOM')) continue;

    const atomName = line.slice(12, 16).trim();
    const resName  = line.slice(17, 20).trim().toUpperCase();
    const chainId  = (line[21] || 'A').trim() || 'A';
    const resSeq   = Number(line.slice(22, 26).trim());
    const iCode    = (line[26] || '').trim();

    if (atomName === 'CA') {
      const key = `${chainId}|${resSeq}|${iCode}`;
      if (seenCA.has(key)) continue;
      seenCA.add(key);

      const x = Number(line.slice(30, 38));
      const y = Number(line.slice(38, 46));
      const z = Number(line.slice(46, 54));
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;

      const chain = get(chainId);
      if (chain.minResi == null || resSeq < chain.minResi) chain.minResi = resSeq;

      chain.atomsCA.push({ chainId, resSeq, iCode, x, y, z, resName });
      const one = threeToOne[resName] || 'X';
      chain.seq.push(one);
    }
  }

  // finalize: add dispResi to each atom
  for (const [cid, chain] of chains.entries()) {
    for (const atom of chain.atomsCA) {
      atom.dispResi = atom.resSeq - chain.minResi + 1;
      atom.label = `${cid}:${atom.dispResi}${atom.iCode || ''}`;
    }
    chain.seq = chain.seq.join('');
  }
  return chains;
}

/** Euclidean distance matrix from an ordered list of atoms with display labels */
export function distanceMatrixFromAtoms(atoms) {
  const N = atoms.length;
  const labels = atoms.map(a => a.label); // uses dispResi
  const matrix = Array.from({ length: N }, () => Array(N).fill(0));
  for (let i = 0; i < N; i++) {
    for (let j = i; j < N; j++) {
      const dx = atoms[i].x - atoms[j].x;
      const dy = atoms[i].y - atoms[j].y;
      const dz = atoms[i].z - atoms[j].z;
      const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
      matrix[i][j] = d; matrix[j][i] = d;
    }
  }
  return { labels, matrix };
}


/** Reorder an MSA array by Newick leaf order, appending non-matches at end */
export function reorderMsaByLeafOrder(msaSeqs, leafOrder) {
  const byId = Object.create(null);
  msaSeqs.forEach(s => { byId[s.id] = s; });
  const inTree = leafOrder.map(id => byId[id]).filter(Boolean);
  const extras = msaSeqs.filter(s => !leafOrder.includes(s.id));
  return [...inTree, ...extras];
}

/** Reorder a symmetric heatmap by Newick leaf order; append non-matches */
export function reorderHeatmapByLeafOrder(labels, matrix, leafOrder) {
  const idx = Object.create(null);
  labels.forEach((l, i) => { idx[l] = i; });

  const newOrder = leafOrder.map(l => idx[l]).filter(i => i !== undefined);
  const extras   = labels.map((_, i) => i).filter(i => !newOrder.includes(i));
  const order    = [...newOrder, ...extras];

  const newLabels = order.map(i => labels[i]);
  const newMatrix = order.map(i => order.map(j => matrix[i][j]));
  return { labels: newLabels, matrix: newMatrix };
}

/** MSA column -> (gap-skipping) residue index for a single sequence string */
export function msaColToResidueIndex(seq, col) {
  let idx = -1;
  for (let i = 0; i <= col && i < seq.length; i++) {
    if (seq[i] !== '-') idx++;
  }
  return idx < 0 ? null : idx;
}

/** Residue index -> MSA column for a single sequence string */
export function residueIndexToMsaCol(seq, residIdx) {
  if (residIdx == null) return null;
  let idx = -1;
  for (let i = 0; i < seq.length; i++) {
    if (seq[i] !== '-') {
      idx++;
      if (idx === residIdx) return i;
    }
  }
  return null;
}

/* Try to infer chainId from a sequence id like "..._chain_A" or "A" */
export function chainIdFromSeqId(id) {
  if (!id) return null;
  const m = id.match(/_chain_([A-Za-z0-9])\b/i);
  if (m) return m[1];
  if (/^[A-Za-z0-9]$/.test(id)) return id; // bare "A"
  return null;
}

/* Given alignment data and an optional preferred chain id, pick best sequence by sequence match */
export function pickAlignedSeqForChain(alnData, preferredChainId, chainLengths, chainSeqs) {
  if (!alnData || !Array.isArray(alnData.data) || alnData.data.length === 0) {
    return { seq: null, chainId: null };
  }

  // Helper: percent identity (gapless, equal length)
  const seqIdentity = (a, b) => {
    if (!a || !b || a.length !== b.length) return 0;
    let m = 0;
    for (let i = 0; i < a.length; ++i) if (a[i] === b[i]) m++;
    return m / a.length;
  };

  const alnSeqs = alnData.data.map(s => ({
    ...s,
    gapless: (s.sequence || '').replace(/-/g, '')
  }));

  // --- SCENARIO 1: We are looking for a SPECIFIC chain ---
  // This is used during hover events (structure -> alignment).
  if (preferredChainId) {
    // Strategy 1.1: Match by sequence identity (most reliable)
    if (chainSeqs && chainSeqs[preferredChainId]) {
      const structSeq = chainSeqs[preferredChainId];
      for (const s of alnSeqs) {
        if (s.gapless.length === structSeq.length && seqIdentity(s.gapless, structSeq) >= 0.9) {
          // Found a high-confidence match for the requested chain.
          return { seq: s, chainId: preferredChainId };
        }
      }
    }

    // Strategy 1.2: Match by sequence ID string (fallback)
    const named = alnData.data.find(s => {
      const cid = chainIdFromSeqId(s.id);
      return cid === preferredChainId || s.id === preferredChainId;
    });
    if (named) {
      return { seq: named, chainId: preferredChainId };
    }

    // IMPORTANT: If a specific chain was requested but not found, fail fast.
    return { seq: null, chainId: null };
  }

  // --- SCENARIO 2: We are looking for the BEST POSSIBLE match ---
  // This is used during the initial panel linking.
  else {
    // Strategy 2.1: Find best match by sequence identity across all chains
    if (chainSeqs) {
      let best = { seq: null, chainId: null, iden: 0 };
      for (const [cid, structSeq] of Object.entries(chainSeqs)) {
        for (const s of alnSeqs) {
          if (s.gapless.length === structSeq.length) {
            const iden = seqIdentity(s.gapless, structSeq);
            if (iden > best.iden && iden >= 0.9) {
              best = { seq: s, chainId: cid, iden };
            }
          }
        }
      }
      if (best.seq) return { seq: best.seq, chainId: best.chainId };
    }

    // Strategy 2.2: Match by length
    if (chainLengths) {
      for (const s of alnData.data) {
        const len = (s.sequence || '').replace(/-/g, '').length;
        const match = Object.entries(chainLengths).find(([, L]) => L === len);
        if (match) return { seq: s, chainId: match[0] };
      }
    }

    // Final fallback: return the first sequence in the alignment.
    return { seq: alnData.data[0] || null, chainId: null };
  }
}

// --- download helpers -------------------------

/** strip extension safely; fall back if empty */
export const baseName = (fname, fallback) =>
  (fname && fname.replace(/\.[^.]+$/, '')) || fallback;

/** curry a click handler that downloads `content` as a text file */
export const mkDownload = (base, content, ext, mime = 'text/plain;charset=utf-8') =>
  () => downloadText(`${base}.${ext}`, content, mime);