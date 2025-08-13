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

/** Ensures the <svg> has proper namespaces, serializes, and downloads it as SVG. */
export function downloadSVGElement(svgEl, filenameBase = 'sequence_logo') {
  if (!svgEl) return;

  if (!svgEl.getAttribute('xmlns')) {
    svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  if (!svgEl.getAttribute('xmlns:xlink')) {
    svgEl.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  }

  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgEl);

  if (!source.startsWith('<?xml')) {
    source = `<?xml version="1.0" encoding="UTF-8"?>\n` + source;
  }

  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenameBase}.svg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

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