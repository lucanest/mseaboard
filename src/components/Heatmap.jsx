import React, { useRef, useEffect, useState } from "react";

// Simple blue-orange color mapping
function valueToColor(val, min, max, i, j) {
  if (i === j) return "#00e3ff"; // cyan diagonal
  if (max === min) return "#eee";
  const t = (val - min) / (max - min);
  // orange (high) to teal (low)
  const r = Math.round(255 * t);
  const g = Math.round(160 - 90 * t);
  const b = Math.round(100 + 155 * (1-t));
  return `rgb(${r},${g},${b})`;
}

export default function PhylipHeatmap({ labels, matrix }) {
  const containerRef = useRef();
  const [dims, setDims] = useState({ width: 400, height: 300 });

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new window.ResizeObserver(entries => {
      for (let entry of entries) {
        setDims({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  if (!labels || !matrix) return null;
  const n = labels.length;
  const labelSpace = 45;
  const gridWidth = Math.max(dims.width - labelSpace, 40);
  const gridHeight = Math.max(dims.height - labelSpace, 40);
  const cellWidth = gridWidth / n;
  const cellHeight = gridHeight / n;

  const values = matrix.flat();
  const min = Math.min(...values);
  const max = Math.max(...values);
  const [hoverCell, setHoverCell] = useState(null);

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden w-full h-full">
      <div
        className="absolute left-0 top-0"
        style={{
          width: gridWidth + labelSpace,
          height: gridHeight + labelSpace,
          fontFamily: "monospace",
        }}
      >
        {/* Column labels */}
        <div
          style={{
            position: "absolute",
            left: labelSpace,
            top: 0,
            width: gridWidth,
            height: labelSpace,
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-end",
          }}
        >
{labels.map((label, col) => (
  <div
    key={col}
    className="text-xs font-bold text-center"
    style={{
      width: cellWidth,
      height: labelSpace,
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      lineHeight: `${labelSpace}px`,
      backgroundColor: hoverCell?.col === col ? "rgba(255,255,0,0.3)" : "transparent", // highlight
      transition: "background-color 0.2s",
    }}
    title={label}
  >
    {label}
  </div>
))}
        </div>
        {/* Row labels */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: labelSpace,
            width: labelSpace,
            height: gridHeight,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}
        >
{labels.map((label, row) => (
  <div
    key={row}
    className="text-xs font-bold text-right"
    style={{
      width: labelSpace - 4,
      height: cellHeight,
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      lineHeight: `${cellHeight}px`,
      backgroundColor: hoverCell?.row === row ? "rgba(255,255,0,0.3)" : "transparent",
      transition: "background-color 0.2s",
    }}
    title={label}
  >
    {label}
  </div>
))}
        </div>
        {/* Heatmap grid */}
        <div
          style={{
            position: "absolute",
            left: labelSpace,
            top: labelSpace,
            width: gridWidth,
            height: gridHeight,
            display: "grid",
            gridTemplateColumns: `repeat(${n}, 1fr)`,
            gridTemplateRows: `repeat(${n}, 1fr)`,
            border: "1px solid #eee"
          }}
        >
          {matrix.map((row, i) =>
            row.map((val, j) => (
<div
  key={i + "," + j}
  onMouseEnter={() => setHoverCell({ row: i, col: j })}
  onMouseLeave={() => setHoverCell(null)}
  style={{
    background: valueToColor(val, min, max, i, j),
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    fontSize: cellWidth < 38 ? "0.7em" : "1em",
    color: i === j ? "#222" : (val > (min + max) / 2 ? "#222" : "#fff"),
    border: hoverCell?.row === i && hoverCell?.col === j
      ? "2px solid #ff0"
      : "1px solid rgba(220,220,220,0.5)",
    transition: "border 0.2s, transform 0.2s",
    transform: hoverCell?.row === i && hoverCell?.col === j ? "scale(1.05)" : "scale(1)",
    zIndex: hoverCell?.row === i && hoverCell?.col === j ? 10 : 1,  // <--- raise z-index
    position: hoverCell?.row === i && hoverCell?.col === j ? "relative" : "static" // <--- needed
  }}
  title={val}
>
  {val.toFixed(3)}
</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}