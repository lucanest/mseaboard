// Heatmap.jsx
import React, { useRef, useEffect, useState, useMemo } from "react";

function valueToColor(val, min, max, threshold = null) {
  if (max === min) return "#eee";
  if (threshold !== null) {
    // Below threshold: yellow, above: purple
    return val < threshold ? "rgb(255,255,0)" : "rgb(60,0,160)";
  }
  const t = (val - min) / (max - min);
  // Yellow -> Purple
  const r = Math.round(255 - 195 * t); // 255 to 60
  const g = Math.round(255 - 255 * t); // 255 to 0
  const b = Math.round(0 + 160 * t);   // 0 to 160
  return `rgb(${r},${g},${b})`;
}

/* ---------- diamond helpers ---------- */
function drawDiamond(ctx, cx, cy, d) {
  const r = d / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r); // top
  ctx.lineTo(cx + r, cy); // right
  ctx.lineTo(cx, cy + r); // bottom
  ctx.lineTo(cx - r, cy); // left
  ctx.closePath();
}

function dCenterFromIJ(i, j, d, width) {
  // map matrix indices (i>j) to diamond center
  const a = j;
  const b = i - 1 - j;
  const cx = width / 2 + (a - b) * (d / 2);
  const cy = (d / 2) + (a + b) * (d / 2);
  return { cx, cy };
}

function ijFromXY_D(x, y, d, width, n) {
  // inverse mapping to find nearest (i,j) from mouse x/y
  const u = (x - width / 2) / (d / 2);  // a - b
  const v = (y - (d / 2)) / (d / 2);    // a + b
  let a = Math.round((u + v) / 2);
  let b = Math.round((v - u) / 2);
  if (a < 0 || b < 0) return null;
  if (a + b > n - 2) return null;
  const i = a + b + 1;
  const j = a;
  if (i <= j || i >= n || j < 0) return null;
  return { i, j };
}

// x position (in px) along the top edge for variant index k in [0..n-1]
function topXForIndex(k, gridWidth, n) {
  if (n <= 1) return gridWidth / 2;
  const steps = n - 1;
  const stepX = gridWidth / steps;
  return k * stepX; // 0 .. gridWidth
}

function PhylipHeatmap({
  labels,
  matrix,
  onHighlight,
  id,
  highlightedCells = [],
  onCellClick,
  linkedHighlightCell,
  showlegend = true,
  diamondView = true,
}) {
  const containerRef = useRef();
  const canvasRef = useRef();
  const rafIdRef = useRef(null);
  const lastHoverRef = useRef({ row: null, col: null });
  const [threshold, setThreshold] = useState(null);
  const [colorbarTooltip, setColorbarTooltip] = useState({
  visible: false,
  x: 0,
  y: 0,
  value: null,
  });

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

  /* ----- responsive label sizing ----- */
  const base = Math.max(0, Math.min(dims.width, dims.height));
  const labelFontSize = Math.max(10, base / 60);
  const hideLabelThreshold = 10.5;

  // In diamond view we render our own top labels; suppress the row/col ones.
  const hideLabels = diamondView || labelFontSize < hideLabelThreshold || n > 80;
  const labelSpace = hideLabels ? 4 : Math.ceil(labelFontSize * 2.3);

  /* ----- grid sizing ----- */
  const availableWidth  = Math.max(dims.width  - labelSpace, 40);
  const availableHeight = Math.max(dims.height - labelSpace, 40);

  let cellSize;
  let gridWidth;
  let gridHeight;

  if (!diamondView) {
    cellSize   = Math.min(availableWidth / n, availableHeight / n);
    gridWidth  = cellSize * n;
    gridHeight = cellSize * n;
  } else {
    const steps = Math.max(n - 1, 1);
    cellSize    = Math.min(availableWidth, availableHeight) / steps; // diamond diameter
    gridWidth   = cellSize * steps;
    gridHeight  = cellSize * steps; // diamond bounding square height
  }

  const showGridLines = cellSize > 10;
  const showHoverHighlight = cellSize > 6;

  const { min, max } = useMemo(() => {
    const values = matrix.flat();
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [matrix]);

  /* ----- mouse → cell ----- */
  const computeCellFromEvent = (event) => {
    const gridEl = canvasRef.current;
    if (!gridEl) return null;
    const rect = gridEl.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;

    if (!diamondView) {
      const col = Math.floor(x / cellSize);
      const row = Math.floor(y / cellSize);
      if (row < 0 || col < 0 || row >= n || col >= n) return null;
      return { row, col, x, y };
    } else {
      const ij = ijFromXY_D(x, y, cellSize, gridWidth, n);
      if (!ij) return null;
      return { row: ij.i, col: ij.j, x, y };
    }
  };

  const updateHover = (row, col, eventForTooltip) => {
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

    // Colorbar click handler
  const handleColorbarClick = (e) => {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    let value;
    if (diamondView) {
      const relY = e.clientY - rect.top;
      value = min + ((relY / rect.height) * (max - min));
      value = Math.max(min, Math.min(max, value));
    } else {
      const relX = e.clientX - rect.left;
      value = min + ((relX / rect.width) * (max - min));
      value = Math.max(min, Math.min(max, value));
    }
    // Toggle threshold: set if not set, reset if set
    setThreshold((prev) => (prev === null ? value : null));
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


const handleColorbarMouseMove = (e) => {
  const bar = e.currentTarget;
  const rect = bar.getBoundingClientRect();
  let value, x, y;

  if (diamondView) {
    // Vertical colorbar (right side)
    const relY = e.clientY - rect.top;
    value = min + ((relY / rect.height) * (max - min));
    value = Math.max(min, Math.min(max, value));
    x = rect.left + rect.width + 0 - containerRef.current.getBoundingClientRect().left;
    y = relY + rect.top - containerRef.current.getBoundingClientRect().top;
  } else {
    // Horizontal colorbar (bottom)
    const relX = e.clientX - rect.left;
    value = min + ((relX / rect.width) * (max - min));
    value = Math.max(min, Math.min(max, value));
    x = relX + rect.left - containerRef.current.getBoundingClientRect().left - 18;
    y = rect.bottom - containerRef.current.getBoundingClientRect().top + 11; // show below the bar
  }

  setColorbarTooltip({
    visible: true,
    x,
    y,
    value,
  });
};

  const handleColorbarMouseLeave = () => {
    setColorbarTooltip({ visible: false, x: 0, y: 0, value: null });
  };

  /* ----- canvas drawing ----- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== gridWidth * dpr || canvas.height !== gridHeight * dpr) {
      canvas.width = gridWidth * dpr;
      canvas.height = gridHeight * dpr;
      canvas.style.width = `${gridWidth}px`;
      canvas.style.height = `${gridHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    ctx.clearRect(0, 0, gridWidth, gridHeight);

    if (!diamondView) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          ctx.fillStyle = valueToColor(matrix[i][j], min, max, threshold);
          ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
        }
      }
      if (showGridLines) {
        ctx.strokeStyle = "rgba(220,220,220,0.5)";
        ctx.lineWidth = 1 / dpr;
        for (let i = 1; i < n; i++) {
          ctx.beginPath(); ctx.moveTo(i * cellSize, 0); ctx.lineTo(i * cellSize, gridHeight); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, i * cellSize); ctx.lineTo(gridWidth, i * cellSize); ctx.stroke();
        }
      }
    } else {
      // diamond (lower triangle)
      const d = cellSize;
      for (let i = 1; i < n; i++) {
        for (let j = 0; j < i; j++) {
          const val = matrix[i][j];
          const { cx, cy } = dCenterFromIJ(i, j, d, gridWidth);
          ctx.fillStyle = valueToColor(val, min, max, threshold);
          drawDiamond(ctx, cx, cy, d);
          ctx.fill();
        }
      }
      // thin outlines for legibility
      if (showGridLines) {
      ctx.strokeStyle = "rgba(220,220,220,0.6)";
      ctx.lineWidth = 1 / dpr;
      for (let i = 1; i < n; i++) {
        for (let j = 0; j < i; j++) {
          const { cx, cy } = dCenterFromIJ(i, j, cellSize, gridWidth);
          drawDiamond(ctx, cx, cy, cellSize);
          ctx.stroke();
        }
      }}
    }

    // shared highlights
    const strokeSel = (row, col, color) => {
      if (row == null || col == null) return;
      ctx.save();
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      if (!diamondView) {
        ctx.strokeRect(col * cellSize, row * cellSize, cellSize, cellSize);
      } else if (row > col) {
        const { cx, cy } = dCenterFromIJ(row, col, cellSize, gridWidth);
        drawDiamond(ctx, cx, cy, cellSize); ctx.stroke();
      } else if (col > row) {
        const { cx, cy } = dCenterFromIJ(col, row, cellSize, gridWidth);
        drawDiamond(ctx, cx, cy, cellSize); ctx.stroke();
      }
      ctx.restore();
    };

    highlightedCells.forEach(({ row, col }) => strokeSel(row, col, "#cc0066"));
    if (linkedHighlightCellIdx) strokeSel(linkedHighlightCellIdx.row, linkedHighlightCellIdx.col, "rgb(13,245,241)");
    if (hoverCell && showHoverHighlight)  strokeSel(hoverCell.row, hoverCell.col, "rgb(13,245,241)");
  }, [diamondView, matrix, gridWidth, gridHeight, cellSize, n, min, max,
     hoverCell, highlightedCells, linkedHighlightCellIdx, showGridLines,threshold,showHoverHighlight]);

  /* ----- linked tooltip when not hovered ----- */
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
    const x = labelSpace + (linkedHighlightCellIdx.col + 0.5) * cellSize - 40;
    const y = labelSpace + (linkedHighlightCellIdx.row + 0.5) * cellSize - 30;

    linkedTooltip = (
      <div
        className="absolute pointer-events-none z-50 bg-black text-white text-sm px-2 py-1 rounded-lg shadow-lg"
        style={{
          left: x + 50,
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

  /* ----- diamond label thinning (for top labels) ----- */
  const stepX = diamondView && n > 1 ? gridWidth / (n - 1) : 0;
  const minLabelSpacing = Math.max(10, labelFontSize * 1.1); // px between labels
  const showEvery = diamondView ? Math.max(1, Math.ceil(minLabelSpacing / stepX)) : 1;
  const diamondHeight = diamondView ? cellSize * (n/2) : 0;
    const needToHideLegend =
  diamondView && (labelSpace + gridWidth + 10 + 46 /* legend width */ > dims.width);
  const showLegend = showlegend && !needToHideLegend;


    // Colorbar gradient for threshold
  const getColorbarGradient = () => {
    if (threshold === null) {
      // Normal gradient
      return diamondView
        ? `linear-gradient(to top, ${Array.from(
            { length: 20 },
            (_, i) => valueToColor(min + ((max - min) * i) / 19, min, max)
          )
            .reverse()
            .join(",")})`
        : `linear-gradient(to right, ${Array.from(
            { length: 20 },
            (_, i) => valueToColor(min + ((max - min) * i) / 19, min, max)
          ).join(",")})`;
    } else {
      // Thresholded gradient
      const steps = 40;
      return diamondView
        ? `linear-gradient(to top, ${Array.from(
            { length: steps },
            (_, i) => {
              const v = min + ((max - min) * i) / (steps - 1);
              return valueToColor(v, min, max, threshold);
            }
          )
            .reverse()
            .join(",")})`
        : `linear-gradient(to right, ${Array.from(
            { length: steps },
            (_, i) => {
              const v = min + ((max - min) * i) / (steps - 1);
              return valueToColor(v, min, max, threshold);
            }
          ).join(",")})`;
    }
  };

  return (
  <div
    ref={containerRef}
    className="flex-1 relative overflow-visible w-full h-full"
    style={{ display: "flex", flexDirection: "column" }}
  >
    {/* Row wrapper so the legend can live OUTSIDE the grid+labels block */}
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        width: "100%",
        position: "relative",
      }}
    >
      {/* ---- Heatmap block (grid + its own labels) ---- */}
      <div
        className="relative"
        style={{
          width: gridWidth + labelSpace,
          height: gridHeight + labelSpace,
          fontFamily: "monospace",
          marginTop: diamondView ? 30 : 0,
        }}
      >
        {/* Column/Row labels for square view only */}
        {!diamondView && !hideLabels && (
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

        {!diamondView && !hideLabels && (
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

        {/* Heatmap grid - canvas */}
        <div
          onMouseMove={handleGridMouseMove}
          onPointerLeave={handleGridMouseLeave}
          onClick={handleGridClick}
          style={{
            marginLeft: labelSpace,
            marginTop: hideLabels? 0 : labelSpace,
            width: gridWidth,
            height: gridHeight,
            cursor: "crosshair",
          }}
        >
          <canvas ref={canvasRef} />
        </div>

        {/* --- diamond top ticks + labels --- */}
        {diamondView && (
          <>
            {/* ticks */}
            <svg
              style={{
                position: "absolute",
                left: labelSpace,
                top: labelSpace + diamondHeight, // sit right below the diamond
                width: gridWidth,
                height: 12,
                overflow: "visible",
                pointerEvents: "none",
              }}
            >
              {labels.map((lab, k) => {
                if (k % showEvery !== 0) return null;
                const x = topXForIndex(k, gridWidth, n);
                return (
                  <line
                    key={`tick-${k}`}
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={8}
                    stroke="rgba(0,0,0,0.45)"
                    strokeWidth={1}
                  />
                );
              })}
            </svg>

            {/* text labels */}
            <div
              style={{
                position: "absolute",
                align: "right",
                left: 0,
                textAlign: "left",
                top: diamondHeight + labelSpace + 8,
                width: gridWidth,
                overflow: "visible",
                height: labelSpace,
                pointerEvents: "none",
              }}
            >
              {labels.map((lab, k) => {
                if (k % showEvery !== 0) return null;
                const x = topXForIndex(k, gridWidth, n);
                return (
                  <div
                    key={`lab-${k}`}
                    title={lab}
                    style={{
                      position: "absolute",
                      left: x,
                      transform: "translateX(-100%) rotate(-60deg)",
                      transformOrigin: "100% 0%",
                      fontSize: `${labelFontSize}px`,
                      fontFamily: "monospace",
                      fontWeight: 200,
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
                    }}
                  >
                    {lab}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ---- Colorbar outside the grid+labels area (right side) ---- */}
 {showLegend && diamondView && (
      <div
        style={{
          marginLeft: 0,
          marginTop: 5,
          height: gridHeight,
          width: 46,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pointerEvents: "auto",
          userSelect: "none",
          position: "relative",
        }}
      >
        <div
          style={{
            width: 12,
            height: gridHeight,
            background: getColorbarGradient(),
            borderRadius: 4,
            border: "1px solid #ccc",
            position: "relative",
            cursor: "pointer",
          }}
          onMouseMove={handleColorbarMouseMove}
          onMouseLeave={handleColorbarMouseLeave}
          onClick={handleColorbarClick}
        />
          {/* Tick labels to the right of the bar */}
          <div
            style={{
              position: "absolute",
              left: 34,
              top: 0,
              height: gridHeight,
              width: 60,
              fontSize: 10,
              color: "#333",
            }}
          >
            <span style={{ position: "absolute", top: -3 }}>{min.toFixed(3)}</span>
            <span style={{ position: "absolute", top: gridHeight * 0.25 - 13 }}>
              {(min+(max-min) / 4).toFixed(3)}
            </span>
            <span style={{ position: "absolute", top: gridHeight * 0.5 - 13 }}>
              {(min+(max-min) / 2).toFixed(3)}
            </span>
            <span style={{ position: "absolute", top: gridHeight * 0.75 - 13 }}>
              {(min+(max-min)*3/4).toFixed(3)}
            </span>
            <span style={{ position: "absolute", top: gridHeight - 14 }}>
              {max.toFixed(3)}
            </span>
          </div>
        </div>
      )}
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


    {/* Bottom color legend for square view */}
 {/* Bottom color legend for square view */}
    {showlegend && !diamondView && (
      <div
        style={{
          width: gridWidth,
          marginLeft: labelSpace,
          marginTop: 4,
          alignSelf: "center",
          height: 36,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          pointerEvents: "auto",
          userSelect: "none",
        }}
      >
        <div
          style={{
            width: "100%",
            height: 12,
            background: getColorbarGradient(),
            borderRadius: 4,
            border: "1px solid #ccc",
            pointerEvents: "auto",
            cursor: "pointer",
          }}
          onMouseMove={handleColorbarMouseMove}
          onMouseLeave={handleColorbarMouseLeave}
          onClick={handleColorbarClick}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            marginTop: 2,
            color: "#333",
          }}
        >
          <span>{min.toFixed(3)}</span>
          <span>{(min+(max-min) / 4).toFixed(3)}</span>
          <span>{(min+(max-min) / 2).toFixed(3)}</span>
          <span>{(min+(max-min)* 3 / 4).toFixed(3)}</span>
          <span>{max.toFixed(3)}</span>
        </div>
      </div>
    )}

    {/* Tooltip for colorbar */}

    {colorbarTooltip.visible && (
  <div
    className="absolute pointer-events-none z-50 bg-white text-black text-xs px-2 py-1 rounded"
    style={{
      left: colorbarTooltip.x,
      top: colorbarTooltip.y,
      transform: "translateY(-50%)",
      whiteSpace: "nowrap",
    }}
  >
    {colorbarTooltip.value.toFixed(4)}
  </div>
)}
  </div>
);
    }

export default React.memo(PhylipHeatmap);