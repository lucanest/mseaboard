// Seqlogo.jsx
import React, { useMemo, useRef, useEffect, useCallback } from "react";
import { residueSvgColors } from "../constants/colors.js";

function log2(x) {
  return x <= 0 ? 0 : Math.log2(x);
}

export default React.memo(function SequenceLogoCanvas({
  sequences,
  height = 160,
  fontFamily = "monospace",
  onHighlight,
  highlightedSite = null,
}) {
  const canvasRef = useRef(null);

  const seqLen = sequences[0]?.length || 0;
  const colWidth = 24;
  const logoWidth = colWidth * seqLen;
  const xAxisHeight = 30;
  const canvasHeight = height + xAxisHeight;

  // alphabet logic
  const alphabet = useMemo(() => {
    const set = new Set();
    sequences.forEach((seq) => {
      for (let c of seq) set.add(c.toUpperCase());
    });
    set.delete("-");
    set.delete(".");
    return Array.from(set).sort();
  }, [sequences]);

  // column stats logic
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
      Object.keys(freq).forEach((k) => (freq[k] /= total || 1));
      let entropy = 0;
      Object.values(freq).forEach((p) => (entropy -= p * log2(p)));
      const s = alphabet.length || 1;
      const info = log2(s) - entropy;

      const ordered = Object.entries(freq).sort((a, b) => a[1] - b[1]); // bottom->top
      results.push({ freq, ordered, info, total });
    }
    return results;
  }, [sequences, seqLen, alphabet.length]);

  // scaling
  const maxInfo = log2(alphabet.length) || 2;
  const yScale = (val) => (val / maxInfo) * height;

  // text nominal height (vertically scale it per stack slice)
  const textHeightPx = colWidth * 1.1;

  // draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // set drawing buffer size (not CSS)
    // Backing store: high-res
    canvas.width = Math.max(1, Math.floor(logoWidth * 2));
    canvas.height = Math.max(1, Math.floor(canvasHeight * 2));
    // CSS (layout) size: logical px (unchanged)
    canvas.style.width = `${logoWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw in CSS units; scale the context
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    // Optional: crisper shapes; text remains vector-rendered by the browser
    ctx.imageSmoothingEnabled = true;

    // crisp text
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = `700 ${textHeightPx}px ${fontFamily}`;

    // background
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, logoWidth, canvasHeight);

    // highlight column
    if (highlightedSite != null) {
      ctx.fillStyle = "#FEF9C3";
      ctx.fillRect(highlightedSite * colWidth, 0, colWidth, height);
    }

    // columns
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      let y0 = height; // stack from bottom
      // column hit area is drawn transparent;
      for (const [res, p] of col.ordered) {
        const h = yScale(p * col.info);
        if (h < 0.1) continue;
        y0 -= h;

        // glyph color
        ctx.fillStyle = residueSvgColors[res] || "#444";

        // transform: translate to (xCenter, bottomOfSlice) and scaleY
        const xCenter = i * colWidth + colWidth / 2;
        ctx.save();
        ctx.translate(xCenter, y0 + h); // baseline at bottom of slice
        ctx.scale(1, h / textHeightPx); // vertical squash/stretch
        ctx.fillText(res, 0, -2); // -2 to add a bit of top padding
        ctx.restore();
      }
    }

    // X axis numbers
    ctx.fillStyle = "#888";
    for (let i = 0; i < seqLen; i++) {
      const label = String(i + 1);
      const len = label.length;
      let fontSize = colWidth * 0.55;
      if (len > 2) fontSize = (colWidth / len) * 1.2;
      ctx.font = `${fontSize}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(label, i * colWidth + colWidth / 2, height + 25);
    }
  }, [
    sequences,
    columns,
    seqLen,
    logoWidth,
    canvasHeight,
    height,
    colWidth,
    textHeightPx,
    fontFamily,
    highlightedSite,
  ]);

  // hover → column index → onHighlight
  const handleMouseMove = useCallback(
    (e) => {
      if (!onHighlight) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const i = Math.floor(x / colWidth);
      if (i >= 0 && i < seqLen) onHighlight(i);
      else onHighlight(null);
    },
    [onHighlight, colWidth, seqLen]
  );

  const handleMouseLeave = useCallback(() => {
    onHighlight && onHighlight(null);
  }, [onHighlight]);

  const handleClick = useCallback(
    (e) => {
      if (!onHighlight) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const i = Math.floor(x / colWidth);
      if (i >= 0 && i < seqLen) onHighlight(i);
    },
    [onHighlight, colWidth, seqLen]
  );

  return (
    <canvas
      ref={canvasRef}
      width={logoWidth}
      height={canvasHeight}
      style={{ cursor: "default", userSelect: "none", display: "block" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    />
  );
});