// Heatmap.jsx
import React, { useRef, useEffect, useState, useMemo } from "react";
import { residueColorHex } from "../constants/colors";

function hexToRgb(hex) {
  if (!hex) return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [ parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16) ]
    : null;
}

function valueToColor(val, min, max, threshold = null, lowColorStr, highColorStr) {
  // Handle NaN or non-finite values by returning black
  if (!Number.isFinite(val)) return "#000000";

  const lowColor = lowColorStr || '#FFFF00';  // Default: Yellow
  const highColor = highColorStr || '#3C00A0'; // Default: Purple

  if (max === min) return lowColor;
  
  if (threshold !== null) {
    return val < threshold ? lowColor : highColor;
  }
  
  const t = (val - min) / (max - min);
  
  const c1 = hexToRgb(lowColor);
  const c2 = hexToRgb(highColor);

  // Fallback to default if hex parsing fails
  if (!c1 || !c2) {
    const r_def = Math.round(255 - 195 * t); const g_def = Math.round(255 - 255 * t); const b_def = Math.round(0 + 160 * t);
    return `rgb(${r_def},${g_def},${b_def})`;
  }

  const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
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

function Heatmap({
  labels: legacyLabels,
  rowLabels: rowLabelsProp,
  colLabels: colLabelsProp,
  matrix,
  onHighlight,
  id,
  highlightedCells = [],
  onCellClick,
  linkedHighlightCell,
  showlegend = true,
  diamondView = true,
  threshold,
  onThresholdChange,
  minVal,
  maxVal,
  highColor,
  lowColor,
  isMsaColorMatrix,
}) {
  const containerRef = useRef();
  const canvasRef = useRef();
  const rafIdRef = useRef(null);
  const lastHoverRef = useRef({ row: null, col: null });
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

  // Handle both new and legacy label props for backward compatibility
  const rowLabels = rowLabelsProp || legacyLabels;
  const colLabels = colLabelsProp || legacyLabels;

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

  if (!rowLabels || !colLabels || !matrix) return null;
  
  const nRows = rowLabels.length;
  const nCols = colLabels.length;
  const isSquare = nRows === nCols;
  
  // Diamond view only available for square matrices.
  const isDiamondView = isSquare && diamondView;


  /* ----- responsive label sizing ----- */
  const base = Math.max(0, Math.min(dims.width, dims.height));
  const labelFontSize = Math.max(10, base / 60);
  const hideLabelThreshold = 10.5;

  const hideLabels = isDiamondView || labelFontSize < hideLabelThreshold || nRows > 80 || nCols > 80;
  const labelSpace = hideLabels ? 4 : Math.ceil(labelFontSize * 4.5);

  /* ----- grid sizing ----- */
  const availableWidth  = Math.max(dims.width  - labelSpace, 40);
  const availableHeight = Math.max(dims.height - labelSpace, 40);

  let cellSize;
  let gridWidth;
  let gridHeight;

  if (!isDiamondView) {
    cellSize   = Math.min(availableWidth / nCols, availableHeight / nRows);
    gridWidth  = cellSize * nCols;
    gridHeight = cellSize * nRows;
  } else {
    const steps = Math.max(nRows - 1, 1);
    cellSize    = Math.min(availableWidth, availableHeight) / steps; // diamond diameter
    gridWidth   = cellSize * steps;
    gridHeight  = cellSize * steps; // diamond bounding square height
  }

  const showGridLines = cellSize > 10;
  const showHoverHighlight = cellSize > 6;

const { min, max } = useMemo(() => {
    if (isMsaColorMatrix) {
      return { min: 0, max: 1 }; // Values not used, but return a default range
    }
    // If minVal/maxVal are passed as props, use them directly.
    if (typeof minVal === 'number' && typeof maxVal === 'number') {
      return { min: minVal, max: maxVal };
    }
    // Fallback for any case where the props aren't provided
    if (matrix && typeof matrix.flat === 'function') {
        // Filter out non-finite values (like NaN) before getting min/max
        const values = matrix.flat().filter(v => Number.isFinite(v));
        // If there are no valid numbers, return a default range
        if (values.length === 0) return { min: 0, max: 1 };
        return { min: Math.min(...values), max: Math.max(...values) };
    }
    // Default values if matrix is invalid
    return { min: 0, max: 1 };
  }, [matrix, minVal, maxVal, isMsaColorMatrix]);

  /* ----- mouse → cell ----- */
  const computeCellFromEvent = (event) => {
    const gridEl = canvasRef.current;
    if (!gridEl) return null;
    const rect = gridEl.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;

    if (!isDiamondView) {
      const col = Math.floor(x / cellSize);
      const row = Math.floor(y / cellSize);
      if (row < 0 || col < 0 || row >= nRows || col >= nCols) return null;
      return { row, col, x, y };
    } else {
      const ij = ijFromXY_D(x, y, cellSize, gridWidth, nRows);
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
          rowLabel: rowLabels[row],
          colLabel: colLabels[col],
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
    if (isDiamondView) {
      const relY = e.clientY - rect.top;
      value = min + ((relY / rect.height) * (max - min));
      value = Math.max(min, Math.min(max, value));
    } else {
      const relX = e.clientX - rect.left;
      value = min + ((relX / rect.width) * (max - min));
      value = Math.max(min, Math.min(max, value));
    }
    if (onThresholdChange) {
      onThresholdChange(threshold === null ? value : null);
    }
  };

  // Convert linkedHighlightCell (labels) to indices
  let linkedHighlightCellIdx = null;
  if (
    linkedHighlightCell &&
    typeof linkedHighlightCell.row === "string" &&
    typeof linkedHighlightCell.col === "string"
  ) {
    const rowIdx = rowLabels.indexOf(linkedHighlightCell.row);
    const colIdx = colLabels.indexOf(linkedHighlightCell.col);
    if (rowIdx !== -1 && colIdx !== -1) {
      linkedHighlightCellIdx = { row: rowIdx, col: colIdx };
    }
  }


const handleColorbarMouseMove = (e) => {
  const bar = e.currentTarget;
  const rect = bar.getBoundingClientRect();
  let value, x, y;

  if (isDiamondView) {
    const relY = e.clientY - rect.top;
    value = min + ((relY / rect.height) * (max - min));
    value = Math.max(min, Math.min(max, value));
    x = rect.left + rect.width + 0 - containerRef.current.getBoundingClientRect().left;
    y = relY + rect.top - containerRef.current.getBoundingClientRect().top;
  } else {
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

    if (!isDiamondView) {
      if (isMsaColorMatrix) { // modality for MSA character matrices
        for (let i = 0; i < nRows; i++) {
          for (let j = 0; j < nCols; j++) {
            const char = matrix[i]?.[j]?.toUpperCase();
            ctx.fillStyle = residueColorHex[char] || '#FFFFFF'; // Use canvas colors, default to white
            ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
          }
        }
      } else { // original modality for numeric matrices
        for (let i = 0; i < nRows; i++) {
          for (let j = 0; j < nCols; j++) {
            ctx.fillStyle = valueToColor(matrix[i][j], min, max, threshold, lowColor, highColor);
            ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
          }
        }
      }
      if (showGridLines) {
        ctx.strokeStyle = "rgba(220,220,220,0.5)";
        ctx.lineWidth = 1 / dpr;
        for (let i = 1; i < nRows; i++) {
          ctx.beginPath(); ctx.moveTo(0, i * cellSize); ctx.lineTo(gridWidth, i * cellSize); ctx.stroke();
        }
        for (let j = 1; j < nCols; j++) {
            ctx.beginPath(); ctx.moveTo(j * cellSize, 0); ctx.lineTo(j * cellSize, gridHeight); ctx.stroke();
        }
      }
    } else {
      // diamond (lower triangle)
      const d = cellSize;
      for (let i = 1; i < nRows; i++) {
        for (let j = 0; j < i; j++) {
          const val = matrix[i][j];
          const { cx, cy } = dCenterFromIJ(i, j, d, gridWidth);
          ctx.fillStyle = valueToColor(val, min, max, threshold, lowColor, highColor);
          drawDiamond(ctx, cx, cy, d);
          ctx.fill();
        }
      }
      if (showGridLines) {
      ctx.strokeStyle = "rgba(220,220,220,0.6)";
      ctx.lineWidth = 1 / dpr;
      for (let i = 1; i < nRows; i++) {
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
      if (!isDiamondView) {
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

    // Highlight for a full column
    const strokeCol = (col, color) => {
        if (col == null) return;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(col * cellSize, 0, cellSize, gridHeight);
        ctx.restore();
    }

    highlightedCells.forEach(({ row, col }) => strokeSel(row, col, "#cc0066"));
    
    // Handle both cell and column highlighting from linked panels
    if (linkedHighlightCellIdx) {
        if (linkedHighlightCellIdx.row !== undefined && linkedHighlightCellIdx.col !== undefined) {
            strokeSel(linkedHighlightCellIdx.row, linkedHighlightCellIdx.col, "rgba(0, 0, 0, 1)");
        } else if (linkedHighlightCellIdx.col !== undefined) {
            strokeCol(linkedHighlightCellIdx.col, "rgba(0, 0, 0, 1)");
        }
    }

    if (hoverCell && showHoverHighlight)  strokeSel(hoverCell.row, hoverCell.col, "rgba(0, 0, 0, 1)");
  }, [isDiamondView, matrix, gridWidth, gridHeight, cellSize, nRows, nCols, min, max,
     hoverCell, highlightedCells, linkedHighlightCellIdx, showGridLines,threshold,showHoverHighlight, lowColor, highColor, isMsaColorMatrix]);

  let linkedTooltip = null;
  if (
    linkedHighlightCellIdx &&
    (!hoverCell ||
      hoverCell.row !== linkedHighlightCellIdx.row ||
      hoverCell.col !== linkedHighlightCellIdx.col) &&
    matrix &&
    matrix[linkedHighlightCellIdx.row] &&
    typeof matrix[linkedHighlightCellIdx.row][linkedHighlightCellIdx.col] !== "undefined"
  ) {
    const x = labelSpace + (linkedHighlightCellIdx.col + 0.5) * cellSize - 40;
    const y = labelSpace + (linkedHighlightCellIdx.row + 0.5) * cellSize - 30;
    const linkedVal = matrix[linkedHighlightCellIdx.row][linkedHighlightCellIdx.col];

    linkedTooltip = (
      <div
        className="absolute px-2 py-1 text-sm  text-gray-700 bg-gray-100 rounded-xl pointer-events-none z-[9999] shadow border border-gray-400"
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
            {rowLabels[linkedHighlightCellIdx.row]}:{colLabels[linkedHighlightCellIdx.col]}
          </strong>
        </div>
        <div>
          <strong>
            {Number.isFinite(linkedVal) ? Number(linkedVal).toFixed(4) : String(linkedVal)}
          </strong>
        </div>
      </div>
    );
  }

  const stepX = isDiamondView && nRows > 1 ? gridWidth / (nRows - 1) : 0;
  const minLabelSpacing = Math.max(10, labelFontSize * 1.1); // px between labels
  const showEvery = isDiamondView ? Math.max(1, Math.ceil(minLabelSpacing / stepX)) : 1;
  const diamondHeight = isDiamondView ? cellSize * (nRows/2) : 0;
  const needToHideLegend = isDiamondView && (labelSpace + gridWidth + 10 + 46 > dims.width);
  const showLegend = showlegend && !needToHideLegend && !isMsaColorMatrix;

  const getColorbarGradient = () => {
    if (threshold === null) {
      return isDiamondView
        ? `linear-gradient(to top, ${Array.from({ length: 20 }, (_, i) => valueToColor(min + ((max - min) * i) / 19, min, max, null, lowColor, highColor)).reverse().join(",")})`
        : `linear-gradient(to right, ${Array.from({ length: 20 }, (_, i) => valueToColor(min + ((max - min) * i) / 19, min, max, null, lowColor, highColor)).join(",")})`;
    } else {
      const steps = 40;
      return isDiamondView
        ? `linear-gradient(to top, ${Array.from({ length: steps }, (_, i) => { const v = min + ((max - min) * i) / (steps - 1); return valueToColor(v, min, max, threshold, lowColor, highColor); }).reverse().join(",")})`
        : `linear-gradient(to right, ${Array.from({ length: steps }, (_, i) => { const v = min + ((max - min) * i) / (steps - 1); return valueToColor(v, min, max, threshold, lowColor, highColor); }).join(",")})`;
    }
  };

  return (
  <div
    ref={containerRef}
    className="flex-1 relative overflow-visible w-full h-full py-1"
    style={{ display: "flex", flexDirection: "column" }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        width: "100%",
        position: "relative",
      }}
    >
      <div
        className="relative"
        style={{
          width: gridWidth + labelSpace,
          height: gridHeight + labelSpace,
          fontFamily: "monospace",
          marginTop: isDiamondView ? 30 : 0,
        }}
      >
        {!isDiamondView && !hideLabels && (
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
            {colLabels.map((label, col) => (
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
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)'
                }}
                title={label}
              >
                {label}
              </div>
            ))}
          </div>
        )}

        {!isDiamondView && !hideLabels && (
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
            {rowLabels.map((label, row) => (
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

        {isDiamondView && (
          <>
            <svg
              style={{
                position: "absolute",
                left: labelSpace,
                top: labelSpace + diamondHeight,
                width: gridWidth,
                height: 12,
                overflow: "visible",
                pointerEvents: "none",
              }}
            >
              {rowLabels.map((lab, k) => {
                if (k % showEvery !== 0) return null;
                const x = topXForIndex(k, gridWidth, nRows);
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
              {rowLabels.map((lab, k) => {
                if (k % showEvery !== 0) return null;
                const x = topXForIndex(k, gridWidth, nRows);
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

 {showLegend && isDiamondView && (
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

    {tooltip.visible && tooltip.content && (
      <div
        className="absolute px-2 py-1 text-sm  text-gray-700 bg-gray-100 rounded-xl pointer-events-none z-[9999] shadow border border-gray-400"
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
          {Number.isFinite(tooltip.content.value) ? tooltip.content.value.toFixed(4) : String(tooltip.content.value)}
        </div>
      </div>
    )}

    {linkedTooltip}

    {showLegend && !isDiamondView && (
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

export default React.memo(Heatmap);