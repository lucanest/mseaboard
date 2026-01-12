
export const residueColors = {
  A: 'bg-green-200', C: 'bg-yellow-200', D: 'bg-red-200', E: 'bg-red-200',
  F: 'bg-purple-200', G: 'bg-gray-200', H: 'bg-pink-200', I: 'bg-blue-200',
  K: 'bg-orange-200', L: 'bg-blue-200', M: 'bg-blue-100', N: 'bg-red-100',
  P: 'bg-teal-200', Q: 'bg-red-100', R: 'bg-orange-300', S: 'bg-green-100',
  T: 'bg-green-100', V: 'bg-blue-100', W: 'bg-purple-300', Y: 'bg-purple-100',
  '-': 'bg-white'
};

export const logoColors = {
  A: 'bg-green-200', C: 'bg-yellow-200', D: 'bg-red-200', E: 'bg-cyan-200',
  F: 'bg-purple-200', G: 'bg-gray-200', H: 'bg-pink-200', I: 'bg-blue-200',
  K: 'bg-orange-200', L: 'bg-blue-200', M: 'bg-blue-200', N: 'bg-red-100',
  P: 'bg-teal-200', Q: 'bg-red-100', R: 'bg-orange-300', S: 'bg-yellow-200',
  T: 'bg-green-100', V: 'bg-blue-100', W: 'bg-purple-300', Y: 'bg-purple-100',
  '-': 'bg-white', O : 'bg-purple-300', U: 'bg-gray-300', B : 'bg-red-300'
};

export const residueColorHex = {
  A: '#A7F3D0', C: '#FEF08A', D: '#FCA5A5', E: '#FCA5A5',
  F: '#DDD6FE', G: '#E5E7EB', H: '#FBCFE8', I: '#BFDBFE',
  K: '#FDBA74', L: '#BFDBFE', M: '#DBEAFE', N: '#FECACA',
  P: '#99F6E4', Q: '#FECACA', R: '#FDBA74', S: '#BBF7D0',
  T: '#BBF7D0', V: '#DBEAFE', W: '#C4B5FD', Y: '#DDD6FE',
  '-': '#FFFFFF', '.': '#FFFFFF', '*': '#FFFFFF'
};


export const residueColorHexDark = {
  A: '#34d399', // Emerald-400
  C: '#fbbf24', // Amber-400
  D: '#f87171', // Red-400
  E: '#f87171', // Red-400
  F: '#818cf8', // Indigo-400
  G: '#9ca3af', // Gray-400
  H: '#f472b6', // Pink-400
  I: '#60a5fa', // Blue-400
  K: '#fb923c', // Orange-400
  L: '#3b82f6', // Blue-500
  M: '#60a5fa', // Blue-400
  N: '#f87171', // Red-400
  P: '#2dd4bf', // Teal-400
  Q: '#f87171', // Red-400
  R: '#f97316', // Orange-500
  S: '#4ade80', // Green-400
  T: '#4ade80', // Green-400
  V: '#60a5fa', // Blue-400
  W: '#8b5cf6', // Violet-500
  Y: '#a78bfa', // Violet-400
  '-': '#FFFFFF', 
  '.': '#FFFFFF', 
  '*': '#FFFFFF'
};


export const chainColors = [
  '#A7F3D0', '#FCA5A5', '#BFDBFE', '#FBCFE8', '#FDBA74', '#DDD6FE',
  '#E5E7EB', '#FEF08A', '#DBEAFE', '#FECACA', '#99F6E4', '#BBF7D0',
  '#C4B5FD', '#FECACA', '#FDBA74', '#BBF7D0', '#DBEAFE', '#DDD6FE'
];

export const atomColors = {
      'C': '#909090', 'O': '#FF0D0D', 'N': '#3050FF', 'S': '#FFFF30',
      'P': '#FF8000', 'H': '#FFFFFF', 'FE': '#E06633', 'CU': '#D98050'
    };


export const secondaryStructureColors = {
  helix: '#EF4444', // Red
  sheet: '#3B82F6', // Blue
  coil: '#10B981',  // Green
  turn: '#F59E0B',  // Amber
  bend: '#8B5CF6',  // Purple
  bridge: '#06B6D4' // Cyan
};

export const hydrophobicityColors = {
  // Strongly Hydrophobic (Red)
  ILE: '#FF0000', VAL: '#FF0000', LEU: '#FF0000', PHE: '#FF0000', MET: '#FF0000',
  // Hydrophobic (Light Red/Orange)
  ALA: '#FF6060', GLY: '#FF6060', CYS: '#FF6060', TRP: '#FF6060', TYR: '#FF6060', PRO: '#FF6060',
  // Neutral/Polar (White/Light Grey)
  THR: '#DDDDDD', SER: '#DDDDDD', HIS: '#DDDDDD',
  // Hydrophilic/Charged (Blue)
  GLU: '#0000FF', GLN: '#0000FF', ASP: '#0000FF', ASN: '#0000FF', LYS: '#0000FF', ARG: '#0000FF'
};

export const residueSvgColors = {
  A: '#22c55e', C: '#facc15', D: '#ef4444', E: '#ef4444',
  F: '#a855f7', G: '#6b7280', H: '#ec4899', I: '#3b82f6',
  K: '#f97316', L: '#3b82f6', M: '#60a5fa', N: '#fca5a5',
  P: '#14b8a6', Q: '#fca5a5', R: '#fb923c', S: '#86efac',
  T: '#86efac', V: '#60a5fa', W: '#c084fc', Y: '#e9d5ff',
  '-': '#ffffff'
};

// Pair-based colors for link badges
export const linkpalette = [
    'bg-blue-400','bg-green-400','bg-purple-400',
    'bg-pink-400','bg-amber-400','bg-cyan-400',
    'bg-rose-400','bg-indigo-400','bg-lime-400'
];

export const colorPalette = [
  '#BFDBFE', '#99F6E4', '#FECACA', '#DCFCE7', '#D8B4FE',
  '#BBF7D0', '#E5E7EB', '#f781bf', '#FEF08A', '#FBCFE8'
];

export const ResidueColorSchemes = {
  protein: {
    default: residueColors,
    
    
    // Clustal scheme 
    clustal: {
      // Hydrophobic (blue)
      'A': 'bg-blue-300', 'I': 'bg-blue-300', 'L': 'bg-blue-300', 
      'M': 'bg-blue-300', 'F': 'bg-blue-300', 'W': 'bg-blue-300', 'V': 'bg-blue-300',
      
      // Positive charge (red)
      'K': 'bg-red-300', 'R': 'bg-red-300',
      
      // Negative charge (magenta)
      'D': 'bg-purple-300', 'E': 'bg-purple-300',
      
      // Polar (green)
      'N': 'bg-green-300', 'Q': 'bg-green-300', 'S': 'bg-green-300', 'T': 'bg-green-300',
      
      // Cysteine (pink)
      'C': 'bg-pink-300',
      
      // Glycine (orange)
      'G': 'bg-orange-300',
      
      // Proline (yellow)
      'P': 'bg-yellow-300',
      
      // Aromatic (cyan)
      'H': 'bg-cyan-300', 'Y': 'bg-cyan-300'
    },
    
    // Zappo scheme
    zappo: {
      // Hydrophobic (blue)
      'A': 'bg-blue-200', 'C': 'bg-blue-200', 'F': 'bg-blue-200', 
      'I': 'bg-blue-200', 'L': 'bg-blue-200', 'M': 'bg-blue-200',
      'V': 'bg-blue-200', 'W': 'bg-blue-200', 'Y': 'bg-blue-200',
      
      // Polar (green)
      'N': 'bg-green-300', 'Q': 'bg-green-300', 'S': 'bg-green-300', 'T': 'bg-green-300',
      
      // Positive (red)
      'H': 'bg-red-300', 'K': 'bg-red-300', 'R': 'bg-red-300',
      
      // Negative (magenta)
      'D': 'bg-purple-300', 'E': 'bg-purple-300',
      
      // Special
      'G': 'bg-cyan-300', // Glycine
      'P': 'bg-yellow-300' // Proline
    },

    // Taylor scheme (chemical characteristics)
    taylor: {
      'D': 'bg-red-300', 'E': 'bg-red-300', // Acidic
      'H': 'bg-blue-300', 'K': 'bg-blue-300', 'R': 'bg-blue-300', // Basic
      'A': 'bg-green-300', 'F': 'bg-green-300', 'I': 'bg-green-300', 
      'L': 'bg-green-300', 'M': 'bg-green-300', 'P': 'bg-green-300',
      'V': 'bg-green-300', 'W': 'bg-green-300', 'Y': 'bg-green-300', // Hydrophobic
      'C': 'bg-yellow-300', // Cysteine
      'G': 'bg-orange-300', // Glycine
      'N': 'bg-white', 'Q': 'bg-white', 'S': 'bg-white', 'T': 'bg-white' // Neutral
    },
    
    hydrophobicity: {
      'I': 'bg-blue-700', 'V': 'bg-blue-500', 'L': 'bg-blue-500', 'F': 'bg-blue-300', 'C': 'bg-blue-200',
      'M': 'bg-blue-100', 'A': 'bg-blue-100', 'G': 'bg-gray-100', 'T': 'bg-red-100', 'W': 'bg-gray-100',
      'S': 'bg-red-100', 'Y': 'bg-gray-200', 'P': 'bg-gray-100', 'H': 'bg-red-200', 'N': 'bg-red-300',
      'E': 'bg-red-400', 'Q': 'bg-red-400', 'D': 'bg-red-500', 'K': 'bg-red-600', 'R': 'bg-red-700'
    },
    charge: {
      // Negative/acidic (red)
      'D': 'bg-red-400', 'E': 'bg-red-400',
      
      // Positive/basic (blue)
      'H': 'bg-blue-400', 'K': 'bg-blue-400', 'R': 'bg-blue-400',
      
      // Polar/uncharged (green)
      'N': 'bg-green-300', 'Q': 'bg-green-300', 'S': 'bg-green-300', 
      'T': 'bg-green-300', 'Y': 'bg-green-300',
      
      // Hydrophobic/neutral (gray)
      'A': 'bg-gray-300', 'C': 'bg-gray-300', 'F': 'bg-gray-300', 
      'G': 'bg-gray-300', 'I': 'bg-gray-300', 'L': 'bg-gray-300',
      'M': 'bg-gray-300', 'P': 'bg-gray-300', 'V': 'bg-gray-300', 
      'W': 'bg-gray-300',
      
      // Special cases
      'C': 'bg-yellow-300', // Cysteine often highlighted
      'H': 'bg-blue-200',   // Histidine can be both, but usually basic
    },
  
  },
  
  nucleotide: {
    
    // Identity scheme
    default: {
      'A': 'bg-green-200',    // A: Green
      'C': 'bg-blue-200',     // C: Blue
      'G': 'bg-yellow-200',   // G: Yellow/Orange
      'T': 'bg-red-200',      // T: Red
      'U': 'bg-red-200',      // U: Red (RNA)
      'N': 'bg-gray-200',     // Any nucleotide
      '-': 'bg-white',     // Gap
      '.': 'bg-white'      // Gap
    },

    
    purinePyrimidine: {
      'A': 'bg-orange-300', 'G': 'bg-orange-300', // Purines
      'C': 'bg-blue-300', 'T': 'bg-blue-300', 'U': 'bg-blue-300' // Pyrimidines
    },

    // GC content highlighting
    gc: {
      // G and C (high GC)
      'G': 'bg-orange-300', 'C': 'bg-orange-300',
      
      // A and T/U (low GC)
      'A': 'bg-cyan-400', 'T': 'bg-cyan-400', 'U': 'bg-cyan-400',
      
      // Ambiguous bases
      'S': 'bg-orange-300', // G or C
      'W': 'bg-cyan-300',   // A or T
      'R': 'bg-purple-400', // A or G (purine)
      'Y': 'bg-purple-300', // C or T (pyrimidine)
      'K': 'bg-gray-400',   // G or T (keto)
      'M': 'bg-gray-400',   // A or C (amino)
      'B': 'bg-gray-300',   // Not A
      'D': 'bg-gray-300',   // Not C
      'H': 'bg-gray-300',   // Not G
      'V': 'bg-gray-300',   // Not T/U
      'N': 'bg-gray-200',   // Any
      '-': 'bg-white',
      '.': 'bg-white'
    },

    
  }
};

export const ResidueColorHexSchemes = {
  protein: {
    default: residueColorHex,
    
    // Clustal scheme 
    clustal: {
      // Hydrophobic (blue)
      'A': '#93c5fd', 'I': '#93c5fd', 'L': '#93c5fd', 
      'M': '#93c5fd', 'F': '#93c5fd', 'W': '#93c5fd', 'V': '#93c5fd',
      
      // Positive charge (red)
      'K': '#fca5a5', 'R': '#fca5a5',
      
      // Negative charge (magenta)
      'D': '#d8b4fe', 'E': '#d8b4fe',
      
      // Polar (green)
      'N': '#86efac', 'Q': '#86efac', 'S': '#86efac', 'T': '#86efac',
      
      // Cysteine (pink)
      'C': '#f9a8d4',
      
      // Glycine (orange)
      'G': '#fdba74',
      
      // Proline (yellow)
      'P': '#fde047',
      
      // Aromatic (cyan)
      'H': '#67e8f9', 'Y': '#67e8f9'
    },
    
    // Zappo scheme
    zappo: {
      // Hydrophobic (blue)
      'A': '#bfdbfe', 'C': '#bfdbfe', 'F': '#bfdbfe', 
      'I': '#bfdbfe', 'L': '#bfdbfe', 'M': '#bfdbfe',
      'V': '#bfdbfe', 'W': '#bfdbfe', 'Y': '#bfdbfe',
      
      // Polar (green)
      'N': '#86efac', 'Q': '#86efac', 'S': '#86efac', 'T': '#86efac',
      
      // Positive (red)
      'H': '#fca5a5', 'K': '#fca5a5', 'R': '#fca5a5',
      
      // Negative (magenta)
      'D': '#d8b4fe', 'E': '#d8b4fe',
      
      // Special
      'G': '#67e8f9', // Glycine
      'P': '#fde047' // Proline
    },

    // Taylor scheme (chemical characteristics)
    taylor: {
      'D': '#fca5a5', 'E': '#fca5a5', // Acidic
      'H': '#93c5fd', 'K': '#93c5fd', 'R': '#93c5fd', // Basic
      'A': '#86efac', 'F': '#86efac', 'I': '#86efac', 
      'L': '#86efac', 'M': '#86efac', 'P': '#86efac',
      'V': '#86efac', 'W': '#86efac', 'Y': '#86efac', // Hydrophobic
      'C': '#fde047', // Cysteine
      'G': '#fdba74', // Glycine
      'N': '#ffffff', 'Q': '#ffffff', 'S': '#ffffff', 'T': '#ffffff' // Neutral
    },
    
    hydrophobicity: {
      'I': '#1d4ed8', 'V': '#3b82f6', 'L': '#3b82f6', 'F': '#93c5fd', 'C': '#bfdbfe',
      'M': '#dbeafe', 'A': '#dbeafe', 'G': '#f3f4f6', 'T': '#fee2e2', 'W': '#f3f4f6',
      'S': '#fee2e2', 'Y': '#e5e7eb', 'P': '#f3f4f6', 'H': '#fecaca', 'N': '#fca5a5',
      'E': '#f87171', 'Q': '#f87171', 'D': '#ef4444', 'K': '#dc2626', 'R': '#b91c1c'
    },
    charge: {
      // Negative/acidic (red)
      'D': '#f87171', 'E': '#f87171',
      
      // Positive/basic (blue)
      'H': '#60a5fa', 'K': '#60a5fa', 'R': '#60a5fa',
      
      // Polar/uncharged (green)
      'N': '#86efac', 'Q': '#86efac', 'S': '#86efac', 
      'T': '#86efac', 'Y': '#86efac',
      
      // Hydrophobic/neutral (gray)
      'A': '#d1d5db', 'C': '#d1d5db', 'F': '#d1d5db', 
      'G': '#d1d5db', 'I': '#d1d5db', 'L': '#d1d5db',
      'M': '#d1d5db', 'P': '#d1d5db', 'V': '#d1d5db', 
      'W': '#d1d5db',
      
      // Special cases
      'C': '#fde047', // Cysteine often highlighted
      'H': '#93c5fd',   // Histidine can be both, but usually basic
    },
  
  },
  
  nucleotide: {
    
    // Identity scheme
    default: {
      'A': '#bbf7d0ff',    // A: Green
      'C': '#bfdbfe',     // C: Blue
      'G': '#fef3c7',   // G: Yellow/Orange
      'T': '#fecaca',      // T: Red
      'U': '#fecaca',      // U: Red (RNA)
      'N': '#e5e7eb',     // Any nucleotide
      '-': '#ffffff',     // Gap
      '.': '#ffffff'      // Gap
    },

    
    purinePyrimidine: {
      'A': '#fdba74', 'G': '#fdba74', // Purines
      'C': '#93c5fd', 'T': '#93c5fd', 'U': '#93c5fd' // Pyrimidines
    },

    // GC content highlighting
    gc: {
      // G and C (high GC)
      'G': '#fdba74', 'C': '#fdba74',
      
      // A and T/U (low GC)
      'A': '#22d3ee', 'T': '#22d3ee', 'U': '#22d3ee',
      
      // Ambiguous bases
      'S': '#fdba74', // G or C
      'W': '#67e8f9',   // A or T
      'R': '#c084fc', // A or G (purine)
      'Y': '#d8b4fe', // C or T (pyrimidine)
      'K': '#9ca3af',   // G or T (keto)
      'M': '#9ca3af',   // A or C (amino)
      'B': '#d1d5db',   // Not A
      'D': '#d1d5db',   // Not C
      'H': '#d1d5db',   // Not G
      'V': '#d1d5db',   // Not T/U
      'N': '#e5e7eb',   // Any
      '-': '#ffffff',
      '.': '#ffffff'
    },
    
  }
};


export const DarkerResidueColorHexSchemes = {
  protein: {
    default: residueColorHexDark,
    
    clustal: {
      'A': '#3b82f6', 'I': '#3b82f6', 'L': '#3b82f6', 
      'M': '#3b82f6', 'F': '#3b82f6', 'W': '#3b82f6', 'V': '#3b82f6',
      'K': '#ef4444', 'R': '#ef4444',
      'D': '#a855f7', 'E': '#a855f7',
      'N': '#22c55e', 'Q': '#22c55e', 'S': '#22c55e', 'T': '#22c55e',
      'C': '#ec4899',
      'G': '#f97316',
      'P': '#eab308',
      'H': '#06b6d4', 'Y': '#06b6d4'
    },
    
    zappo: {
      'A': '#60a5fa', 'C': '#60a5fa', 'F': '#60a5fa', 
      'I': '#60a5fa', 'L': '#60a5fa', 'M': '#60a5fa',
      'V': '#60a5fa', 'W': '#60a5fa', 'Y': '#60a5fa',
      'N': '#4ade80', 'Q': '#4ade80', 'S': '#4ade80', 'T': '#4ade80',
      'H': '#f87171', 'K': '#f87171', 'R': '#f87171',
      'D': '#c084fc', 'E': '#c084fc',
      'G': '#22d3ee', 
      'P': '#facc15' 
    },

    taylor: {
      'D': '#ef4444', 'E': '#ef4444',
      'H': '#3b82f6', 'K': '#3b82f6', 'R': '#3b82f6',
      'A': '#22c55e', 'F': '#22c55e', 'I': '#22c55e', 
      'L': '#22c55e', 'M': '#22c55e', 'P': '#22c55e',
      'V': '#22c55e', 'W': '#22c55e', 'Y': '#22c55e',
      'C': '#eab308',
      'G': '#f97316',
      'N': '#e5e7eb', 'Q': '#e5e7eb', 'S': '#e5e7eb', 'T': '#e5e7eb'
    },
    
    hydrophobicity: {
      'I': '#1e40af', 'V': '#2563eb', 'L': '#2563eb', 'F': '#60a5fa', 'C': '#93c5fd',
      'M': '#bfdbfe', 'A': '#bfdbfe', 'G': '#e5e7eb', 'T': '#fecaca', 'W': '#e5e7eb',
      'S': '#fecaca', 'Y': '#d1d5db', 'P': '#e5e7eb', 'H': '#fca5a5', 'N': '#f87171',
      'E': '#ef4444', 'Q': '#ef4444', 'D': '#dc2626', 'K': '#b91c1c', 'R': '#991b1b'
    },

    charge: {
      'D': '#ef4444', 'E': '#ef4444',
      'H': '#3b82f6', 'K': '#3b82f6', 'R': '#3b82f6',
      'N': '#4ade80', 'Q': '#4ade80', 'S': '#4ade80', 
      'T': '#4ade80', 'Y': '#4ade80',
      'A': '#9ca3af', 'C': '#9ca3af', 'F': '#9ca3af', 
      'G': '#9ca3af', 'I': '#9ca3af', 'L': '#9ca3af',
      'M': '#9ca3af', 'P': '#9ca3af', 'V': '#9ca3af', 
      'W': '#9ca3af',
      'C': '#facc15', 
      'H': '#93c5fd',   
    },
  },
  
  nucleotide: {
    default: {
      'A': '#4ade80',    
      'C': '#60a5fa',     
      'G': '#facc15',   
      'T': '#f87171',      
      'U': '#f87171',      
      'N': '#9ca3af',     
      '-': '#f3f4f6',     
      '.': '#f3f4f6'      
    },

    purinePyrimidine: {
      'A': '#fb923c', 'G': '#fb923c', 
      'C': '#60a5fa', 'T': '#60a5fa', 'U': '#60a5fa' 
    },

    gc: {
      'G': '#f97316', 'C': '#f97316',
      'A': '#06b6d4', 'T': '#06b6d4', 'U': '#06b6d4',
      'S': '#f97316', 
      'W': '#22d3ee',   
      'R': '#a855f7', 
      'Y': '#c084fc', 
      'K': '#6b7280',   
      'M': '#6b7280',   
      'B': '#9ca3af',   
      'D': '#9ca3af',   
      'H': '#9ca3af',   
      'V': '#9ca3af',   
      'N': '#d1d5db',   
      '-': '#f3f4f6',
      '.': '#f3f4f6'
    },
  }
};

// Colors for the tree viewer
export const WHITE_COLOR = "#fff";
export const LIGHT_GRAY_COLOR = "#ccc";
export const DARK_GRAY_COLOR = "#555";
export const MAGENTA_COLOR = "#cc0066";
export const HIGH_COLOR = '#db0404ff';
export const LOW_COLOR = '#34a2f7ff';