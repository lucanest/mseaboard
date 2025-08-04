// Heatmap.jsx
import React, { useRef, useEffect, useState } from "react";

function valueToColor(val, min, max, i, j) {
  if (max === min) return "#eee";
  const t = (val - min) / (max - min);
  
  // Yellow to purple gradient
  const r = Math.round(255 - 195 * t);    // 255 to 60 (bright yellow to dark purple)
  const g = Math.round(255 - 255 * t);    // 255 to 0 (bright yellow to dark purple)
  const b = Math.round(0 + 160 * t);      // 0 to 160 (yellow to purple)
  
  return `rgb(${r},${g},${b})`;
}

export default function PhylipHeatmap({ labels, matrix, onHighlight, id }) {
  const containerRef = useRef();
  const [dims, setDims] = useState({ width: 400, height: 300 });
  const [hoverCell, setHoverCell] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: null });

  // Observe container size
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

  const handleCellMouseEnter = (row, col, val, event) => {
    setHoverCell({ row, col });
    const rect = containerRef.current.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: event.clientX - rect.left + 10,
      y: event.clientY - rect.top - 10,
      content: {
        rowLabel: labels[row],
        colLabel: labels[col],
        value: val
      }
    });
    onHighlight?.({ row, col }, id);
  };

  const handleCellMouseLeave = () => {
    setHoverCell(null);
    setTooltip({ visible: false, x: 0, y: 0, content: null });
    onHighlight?.(null, id);
  };

  if (!labels || !matrix) return null;
  const n = labels.length;
  const labelSpace = 45;

  // Compute square cell size to fit all cells
  const availableWidth = Math.max(dims.width - labelSpace, 40);
  const availableHeight = Math.max(dims.height - labelSpace, 40);
  const cellSize = Math.min(availableWidth / n, availableHeight / n);
  const gridWidth = cellSize * n;
  const gridHeight = cellSize * n;

  const values = matrix.flat();
  const min = Math.min(...values);
  const max = Math.max(...values);

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
                width: cellSize,
                height: labelSpace,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                lineHeight: `${labelSpace}px`,
                backgroundColor:
                  hoverCell?.col === col ? "rgba(255,255,0,0.3)" : "transparent",
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
                height: cellSize,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                lineHeight: `${cellSize}px`,
                backgroundColor:
                  hoverCell?.row === row ? "rgba(255,255,0,0.3)" : "transparent",
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
            gridTemplateColumns: `repeat(${n}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${n}, ${cellSize}px)`,
            border: "1px solid #eee",
          }}
        >
          {matrix.map((row, i) =>
            row.map((val, j) => (
              <div
                key={i + "," + j}
                onMouseEnter={(e) => handleCellMouseEnter(i, j, val, e)}
                onMouseLeave={handleCellMouseLeave}
                style={{
                  background: valueToColor(val, min, max, i, j),
                  width: cellSize,
                  height: cellSize,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  fontSize: cellSize < 38 ? "0.7em" : "1em",
                  color:
                    i === j
                      ? "#222"
                      : val > (min + max) / 2
                      ? "#222"
                      : "#fff",
                  border:
                    hoverCell?.row === i && hoverCell?.col === j
                      ? "2px solid #c00660"
                      : "1px solid rgba(220,220,220,0.5)",
                  transition: "border 0.2s, transform 0.2s",
                  transform:
                    hoverCell?.row === i && hoverCell?.col === j
                      ? "scale(1.05)"
                      : "scale(1)",
                  zIndex: hoverCell?.row === i && hoverCell?.col === j ? 10 : 1,
                  position:
                    hoverCell?.row === i && hoverCell?.col === j
                      ? "relative"
                      : "static",
                }}
              >
                {cellSize > 65 ? val.toFixed(3) : ""}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip.visible && tooltip.content && (
        <div
          className="absolute pointer-events-none z-50 bg-black text-white text-sm px-2 py-1 rounded-lg shadow-lg"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: `${tooltip.x > dims.width / 2 ? 'translateX(-120%)' : 'translateX(0)'} ${tooltip.y > dims.height / 2 ? 'translateY(-100%)' : 'translateY(0)'}`,
          }}
        >
          <div><strong>{tooltip.content.rowLabel}:{tooltip.content.colLabel}</strong></div>
          <div><strong>{tooltip.content.value.toFixed(4)}</strong> </div>
        </div>
      )}
    </div>
  );
}