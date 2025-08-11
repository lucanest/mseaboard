// Heatmap.jsx
import React, { useRef, useEffect, useState, useMemo } from "react";

function valueToColor(val, min, max) {
  if (max === min) return "#eee";
  const t = (val - min) / (max - min);

  // Yellow -> Purple
  const r = Math.round(255 - 195 * t); // 255 to 60
  const g = Math.round(255 - 255 * t); // 255 to 0
  const b = Math.round(0 + 160 * t);   // 0 to 160
  return `rgb(${r},${g},${b})`;
}

function PhylipHeatmap({
  labels,
  matrix,
  onHighlight,
  id,
  highlightedCells = [],
  onCellClick,
}) {
  const containerRef = useRef();
  const gridRef = useRef();
  const rafIdRef = useRef(null);
  const lastHoverRef = useRef({ row: null, col: null }); // avoid redundant updates

  const [dims, setDims] = useState({ width: 400, height: 300 });
  const [hoverCell, setHoverCell] = useState(null);
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    content: null,
  });

  // Observe container size
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new window.ResizeObserver((entries) => {
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

  // ----- Responsive label sizing & visibility -----
  const base = Math.max(0, Math.min(dims.width, dims.height));
  const labelFontSize = base / 60;
  const hideLabelThreshold = 10.5;
  const hideLabels = labelFontSize < hideLabelThreshold || n > 80;

  const labelSpace = hideLabels ? 4 : Math.ceil(labelFontSize * 2.3);

  // ----- Grid sizing -----
  const availableWidth = Math.max(dims.width - labelSpace, 40);
  const availableHeight = Math.max(dims.height - labelSpace, 40);
  const cellSize = Math.min(availableWidth / n, availableHeight / n);
  const gridWidth = cellSize * n;
  const gridHeight = cellSize * n;

  const { min, max } = useMemo(() => {
    const values = matrix.flat();
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [matrix]);

  // ----- Event delegation handlers on the grid -----
  const computeCellFromEvent = (event) => {
    const gridEl = gridRef.current;
    if (!gridEl) return null;
    const rect = gridEl.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;

    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    if (row < 0 || col < 0 || row >= n || col >= n) return null;

    return { row, col, x, y };
  };

  const updateHover = (row, col, eventForTooltip) => {
    // Skip if nothing changed
    if (lastHoverRef.current.row === row && lastHoverRef.current.col === col) return;

    lastHoverRef.current = { row, col };
    if (row == null || col == null) {
      setHoverCell(null);
      setTooltip({ visible: false, x: 0, y: 0, content: null });
      onHighlight?.(null, id);
      return;
    }

    const val = matrix[row][col];
    setHoverCell({ row, col });

    // Tooltip anchored to overall container, like before
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect && eventForTooltip) {
      setTooltip({
        visible: true,
        x: eventForTooltip.clientX - rect.left + 10,
        y: eventForTooltip.clientY - rect.top - 10,
        content: {
          rowLabel: labels[row],
          colLabel: labels[col],
          value: val,
        },
      });
    }

    onHighlight?.({ row, col }, id);
  };

  const handleGridMouseMove = (event) => {
    // Throttle to animation frames to avoid state storms
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const cell = computeCellFromEvent(event);
      if (!cell) {
        updateHover(null, null, event);
        return;
      }
      updateHover(cell.row, cell.col, event);
    });
  };

  const handleGridMouseLeave = () => {
    // Clear hover/tooltip when leaving the grid
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    lastHoverRef.current = { row: null, col: null };
    setHoverCell(null);
    setTooltip({ visible: false, x: 0, y: 0, content: null });
    onHighlight?.(null, id);
  };

  const handleGridClick = (event) => {
    const cell = computeCellFromEvent(event);
    if (!cell) return;
    onCellClick?.({ row: cell.row, col: cell.col }, id);
  };

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
        {!hideLabels && (
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
            aria-hidden={hideLabels}
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
                  fontSize: `${labelFontSize}px`,
                  backgroundColor:
                    hoverCell?.col === col ? "rgba(255,255,0,0.6)" : "transparent",
                  transition: "background-color 0.2s",
                }}
                title={label}
              >
                {label}
              </div>
            ))}
          </div>
        )}

        {/* Row labels */}
        {!hideLabels && (
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
            aria-hidden={hideLabels}
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
                  fontSize: `${labelFontSize}px`,
                  backgroundColor:
                    hoverCell?.row === row ? "rgba(255,255,0,0.6)" : "transparent",
                  transition: "background-color 0.2s",
                }}
                title={label}
              >
                {label}
              </div>
            ))}
          </div>
        )}

        {/* Heatmap grid */}
        <div
          ref={gridRef}
          onMouseMove={handleGridMouseMove}
          onMouseLeave={handleGridMouseLeave}
          onClick={handleGridClick}
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
            row.map((val, j) => {
              const isHighlighted = highlightedCells.some(
                (cell) => cell.row === i && cell.col === j
              );
              const isHover = hoverCell?.row === i && hoverCell?.col === j;
              return (
                <div
                  key={i + "," + j}
                  style={{
                    background: valueToColor(val, min, max),
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
                    border: isHover
                      ? "2px solid rgb(13, 245, 241)"
                      : isHighlighted
                      ? "2px solid #cc0066"
                      : "1px solid rgba(220,220,220,0.5)",
                    zIndex: isHover ? 10 : isHighlighted ? 5 : 1,
                    position: isHover || isHighlighted ? "relative" : "static",
                  }}
                >
                  {cellSize > 65 ? val.toFixed(3) : ""}
                </div>
              );
            })
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
            transform: `${
              tooltip.x > dims.width / 2 ? "translateX(-120%)" : "translateX(0)"
            } ${tooltip.y > dims.height / 2 ? "translateY(-100%)" : "translateY(0)"}`,
          }}
        >
          <div>
            <strong>
              {tooltip.content.rowLabel}:{tooltip.content.colLabel}
            </strong>
          </div>
          <div>
            <strong>{tooltip.content.value.toFixed(4)}</strong>{" "}
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(PhylipHeatmap);