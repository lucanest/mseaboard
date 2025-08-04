// Utils.jsx

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