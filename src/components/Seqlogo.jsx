// Seqlogo.jsx
import React, { useMemo } from "react";

const residueSvgColors = {
  A: '#22c55e', C: '#facc15', D: '#ef4444', E: '#ef4444',
  F: '#a855f7', G: '#6b7280', H: '#ec4899', I: '#3b82f6',
  K: '#f97316', L: '#3b82f6', M: '#60a5fa', N: '#fca5a5',
  P: '#14b8a6', Q: '#fca5a5', R: '#fb923c', S: '#86efac',
  T: '#86efac', V: '#60a5fa', W: '#c084fc', Y: '#e9d5ff',
  '-': '#ffffff'
};

function log2(x) {
  return x <= 0 ? 0 : Math.log2(x);
}

function SequenceLogoSVG({
  sequences,
  height = 160,
  fontFamily = "monospace",
  onHighlight,             
  highlightedSite = null, 
}) {
  const seqLen = sequences[0]?.length || 0;
  const colWidth = 24; // Fixed column width
  const logoWidth = colWidth * seqLen;
  const xAxisHeight = 30;
  const svgHeight = height + xAxisHeight;

  // Get alphabet
  const alphabet = useMemo(() => {
    const set = new Set();
    sequences.forEach(seq => {
      for (let c of seq) set.add(c.toUpperCase());
    });
    // Remove gaps
    set.delete("-");
    set.delete(".");
    return Array.from(set).sort();
  }, [sequences]);

  // Frequencies and information per column
  const columns = useMemo(() => {
    const results = [];
    for (let i = 0; i < seqLen; ++i) {
      const freq = {};
      let total = 0;
      for (let seq of sequences) {
        const c = seq[i]?.toUpperCase();
        if (!c || c === "-" || c === ".") continue;
        freq[c] = (freq[c] || 0) + 1;
        total += 1;
      }
      // Convert to probabilities
      Object.keys(freq).forEach(k => freq[k] /= total || 1);

      // Entropy (uncertainty)
      let entropy = 0;
      Object.values(freq).forEach(p => {
        entropy -= p * log2(p);
      });

      // Max entropy (alphabet size)
      const s = alphabet.length;
      const maxEntropy = log2(s);
      // Information: reduction from maximum
      const info = maxEntropy - entropy;

      // Order letters by frequency
      const ordered = Object.entries(freq)
        .sort((a, b) => a[1] - b[1]);

      results.push({
        freq,
        ordered,
        info,
        total,
      });
    }
    return results;
  }, [sequences, seqLen, alphabet.length]);

  // Info scaling: scale so that max info (bits) fills full height
  const maxInfo = log2(alphabet.length) || 2;
  const yScale = (val) => (val / maxInfo) * height;

  // For text vertical scaling
  const textHeightPx = colWidth * 0.9;

  return (
    <svg width={logoWidth} height={svgHeight} style={{ cursor: 'default', userSelect: 'none' }}>
    <rect x={0} y={0} width={logoWidth} height={svgHeight} fill="#fff" />
    {/* Highlight column (if any) */}
    {highlightedSite != null && (
    <rect
        x={highlightedSite * colWidth}
        y={0}
        width={colWidth}
        height={height}
        fill="#fde68a"
        fillOpacity={0.5}
        pointerEvents="none"
    />)}
    {/* Draw columns */}
    {columns.map((col, i) => {
        let y0 = height;
        return (
          <g
            key={i}
            transform={`translate(${i * colWidth},0)`}
            onMouseEnter={() => onHighlight && onHighlight(i)}
            onMouseMove={() => onHighlight && onHighlight(i)}
            onMouseLeave={() => onHighlight && onHighlight(null)}
            onClick={() => onHighlight && onHighlight(i)}
            style={{ cursor: 'default' }}
          >
            {/* Transparent rectangle for hit detection */}
            <rect
              x={0}
              y={0}
              width={colWidth}
              height={height}
              fill="transparent"
              onMouseEnter={() => onHighlight && onHighlight(i)}
              onMouseMove={() => onHighlight && onHighlight(i)}
              onMouseLeave={() => onHighlight && onHighlight(null)}
              onClick={() => onHighlight && onHighlight(i)}
            />
            {col.ordered.map(([res, p], j) => {
              const h = yScale(p * col.info);
              if (h < 1e-1) return null;
              y0 -= h;
              return (
                <text
                  key={res}
                  x={colWidth / 2}
                  y={y0 + h - 2}
                  fontSize={textHeightPx}
                  fontFamily={fontFamily}
                  textAnchor="middle"
                  dominantBaseline="auto"
                  fill={residueSvgColors[res] || "#444"}
                  style={{
                    transform: `scaleY(${h / textHeightPx})`,
                    transformOrigin: `${colWidth / 2}px ${y0 + h}px`,
                    userSelect: "none",
                  }}
                  fontWeight={700}
                >
                  {res}
                </text>
              );
            })}
          </g>
        );
      })}
      {/* X axis numbers */}
      <g>
        {Array.from({ length: seqLen }).map((_, i) => {
          const label = String(i + 1);
          const len = label.length;
          let fontSize = colWidth * 0.55;
          if (len > 2) {
            fontSize = (colWidth / len) * 1.2;
          }

          return (
            <text
              key={i}
              x={i * colWidth + colWidth / 2}
              y={height + 25}
              fontSize={fontSize}
              fontFamily="monospace"
              fill="#888"
              textAnchor="middle"
            >
              {label}
            </text>
          );
        })}
      </g>
    </svg>
  );
}
export default React.memo(SequenceLogoSVG);