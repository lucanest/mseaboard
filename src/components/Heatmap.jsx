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
  linkedHighlightCell,
}) {
  const containerRef = useRef();
  const canvasRef = useRef();
  const rafIdRef = useRef(null);
  const lastHoverRef = useRef({ row: null, col: null }); // avoid redundant updates

  const [dims, setDims] = useState({ width: 500, height: 500 });
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
  const showGridLines = cellSize > 10; // Don't render grid lines for tiny cells
  const showHoverHighlight = cellSize > 6; // Show hover highlight only for larger cells

  const { min, max } = useMemo(() => {
    const values = matrix.flat();
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [matrix]);

  // ----- Event delegation handlers on the grid -----
  const computeCellFromEvent = (event) => {
    const gridEl = canvasRef.current;
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

  // Convert linkedHighlightCell (labels) to indices
  let linkedHighlightCellIdx = null;
  if (
    linkedHighlightCell &&
    typeof linkedHighlightCell.row === "string" &&
    typeof linkedHighlightCell.col === "string"
  ) {
    const rowIdx = labels.indexOf(linkedHighlightCell.row);
    const colIdx = labels.indexOf(linkedHighlightCell.col);
    if (rowIdx !== -1 && colIdx !== -1) {
      linkedHighlightCellIdx = { row: rowIdx, col: colIdx };
    }
  }

  // ----- Canvas Drawing Effect -----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Handle High-DPI displays
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== gridWidth * dpr || canvas.height !== gridHeight * dpr) {
      canvas.width = gridWidth * dpr;
      canvas.height = gridHeight * dpr;
      canvas.style.width = `${gridWidth}px`;
      canvas.style.height = `${gridHeight}px`;
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, gridWidth, gridHeight);

    // Draw cells
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        ctx.fillStyle = valueToColor(matrix[i][j], min, max);
        ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
      }
    }

    // Draw grid lines
    if (showGridLines) {
      ctx.strokeStyle = "rgba(220,220,220,0.5)";
      ctx.lineWidth = 1 / dpr; // Keep lines sharp on high-dpi
      for (let i = 1; i < n; i++) {
        // Vertical
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, gridHeight);
        ctx.stroke();
        // Horizontal
        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(gridWidth, i * cellSize);
        ctx.stroke();
      }
    }

    // Draw highlighted cells
    ctx.strokeStyle = "#cc0066";
    ctx.lineWidth = 2;
    highlightedCells.forEach(({ row, col }) => {
      ctx.strokeRect(col * cellSize, row * cellSize, cellSize, cellSize);
    });


    // Draw linked highlight cell (heatmap->heatmap)
    if (linkedHighlightCellIdx) {
    ctx.save();
    ctx.strokeStyle = "rgb(13, 245, 241)";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      linkedHighlightCellIdx.col * cellSize,
      linkedHighlightCellIdx.row * cellSize,
      cellSize,
      cellSize
    );
      ctx.restore();
    }
    // Draw hover highlight
    if (hoverCell && showHoverHighlight) {
      ctx.strokeStyle = "rgb(13, 245, 241)";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        hoverCell.col * cellSize,
        hoverCell.row * cellSize,
        cellSize,
        cellSize
      );
    }
  }, [
    matrix,
    gridWidth,
    gridHeight,
    cellSize,
    n,
    min,
    max,
    hoverCell,
    highlightedCells,
    showGridLines,
    linkedHighlightCellIdx,
  ]);

// Compute tooltip for linked highlight cell if not hovered
let linkedTooltip = null;
if (
  linkedHighlightCellIdx &&
  (!hoverCell ||
    hoverCell.row !== linkedHighlightCellIdx.row ||
    hoverCell.col !== linkedHighlightCellIdx.col) &&
  matrix &&
  Array.isArray(matrix) &&
  matrix[linkedHighlightCellIdx.row] &&
  typeof matrix[linkedHighlightCellIdx.row][linkedHighlightCellIdx.col] !== "undefined"
) {
  // Compute position in the grid
  const x =
    labelSpace +
    (linkedHighlightCellIdx.col + 0.5) * cellSize -
    40; // adjust -40 for tooltip width
  const y =
    labelSpace +
    (linkedHighlightCellIdx.row + 0.5) * cellSize -
    30; // adjust -30 for tooltip height

  linkedTooltip = (
    <div
      className="absolute pointer-events-none z-50 bg-black text-white text-sm px-2 py-1 rounded-lg shadow-lg"
      style={{
        left: x+50,
        top: y + 30,
        transform: `${
          x > dims.width / 2 ? "translateX(-120%)" : "translateX(0)"
        } ${y > dims.height / 2 ? "translateY(-100%)" : "translateY(0)"}`,
      }}
    >
      <div>
        <strong>
          {labels[linkedHighlightCellIdx.row]}:{labels[linkedHighlightCellIdx.col]}
        </strong>
      </div>
      <div>
        <strong>
          {Number(matrix[linkedHighlightCellIdx.row][linkedHighlightCellIdx.col]).toFixed(4)}
        </strong>
      </div>
    </div>
  );
}

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
    {/* Heatmap grid - a canvas */}
    <div
          onMouseMove={handleGridMouseMove}
          onMouseLeave={handleGridMouseLeave}
          onClick={handleGridClick}
          style={{
            position: "absolute",
            left: labelSpace,
            top: labelSpace,
            width: gridWidth,
            height: gridHeight,
            border: "1px solid #eee",
            cursor: "crosshair",
          }}
        >
          <canvas ref={canvasRef} />
        </div>
      </div>

      {/* Tooltip for hover */}
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
      {/* Tooltip for linked highlight cell */}
      {linkedTooltip}
    </div>
  );
}

export default React.memo(PhylipHeatmap);