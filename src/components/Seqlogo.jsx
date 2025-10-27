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
  scrollLeft = 0,
  viewportWidth = 0,
}) {
  const canvasRef = useRef(null);
  const seqLen = sequences[0]?.length || 0;
  const colWidth = 24;
  const xAxisHeight = 30;
  const canvasHeight = height + xAxisHeight;

  const alphabet = useMemo(() => {
    if (!sequences || sequences.length === 0) return [];
    const set = new Set();
    sequences.forEach((seq) => {
      for (const c of seq) set.add(c.toUpperCase());
    });
    set.delete("-");
    set.delete(".");
    return Array.from(set).sort();
  }, [sequences]);

  const columns = useMemo(() => {
    if (seqLen === 0 || !sequences || sequences.length === 0) return [];
    const results = [];
    for (let i = 0; i < seqLen; ++i) {
      const freq = {};
      let total = 0;
      for (const seq of sequences) {
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
      const ordered = Object.entries(freq).sort((a, b) => a[1] - b[1]);
      results.push({ ordered, info });
    }
    return results;
  }, [sequences, seqLen, alphabet]);

  const maxInfo = log2(alphabet.length) || 2;
  const yScale = (val) => (val / maxInfo) * height;
  const textHeightPx = colWidth * 1.1;

  // Simple virtualization approach
  const startCol = Math.max(0, Math.floor(scrollLeft / colWidth) - 2);
  const endCol = Math.min(seqLen, Math.ceil((scrollLeft + viewportWidth) / colWidth) + 2);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || viewportWidth <= 0) return;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.ceil(viewportWidth * dpr);
    canvas.height = Math.ceil(canvasHeight * dpr);
    canvas.style.width = `${viewportWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear background
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, viewportWidth, canvasHeight);

    // Draw highlighted site if visible
    if (highlightedSite != null && highlightedSite >= startCol && highlightedSite < endCol) {
      const highlightX = highlightedSite * colWidth - scrollLeft;
      ctx.fillStyle = "#FEF9C3";
      ctx.fillRect(highlightX, 0, colWidth, height);
    }
    
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    // Render only visible columns
    for (let i = startCol; i < endCol; i++) {
      const col = columns[i];
      if (!col) continue;
      
      const xPos = i * colWidth - scrollLeft;
      let y0 = height;
      
      for (const [res, p] of col.ordered) {
        const charHeight = yScale(p * col.info);
        if (charHeight < 0.1) continue;
        y0 -= charHeight;
        ctx.fillStyle = residueSvgColors[res] || "#444";
        const xCenter = xPos + colWidth / 2;
        
        // Use a consistent rendering approach
        ctx.save();
        ctx.translate(xCenter, y0 + charHeight);
        
        // Calculate scale factor and ensure it's consistent
        const scaleY = Math.max(0.1, charHeight / textHeightPx);
        ctx.scale(1, scaleY);
        
        ctx.font = `700 ${textHeightPx}px ${fontFamily}`;
        ctx.fillText(res, 0, -2);
        ctx.restore();
      }

      // Draw axis labels
        const label = String(i + 1);
        const len = label.length;
        let fontSize = 12;
        if (len > 2) fontSize = (colWidth / len) * 1.2;
        ctx.font = `${fontSize}px monospace`;
        ctx.fillStyle = "#888";
        ctx.fillText(label, xPos + colWidth / 2, height + 25);
      
    }
  }, [
    columns, height, colWidth, fontFamily, highlightedSite, 
    yScale, viewportWidth, canvasHeight, textHeightPx, 
    startCol, endCol, seqLen
  ]);

  const getSiteFromEvent = useCallback((e) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const i = Math.floor((x + scrollLeft) / colWidth);
    return i >= 0 && i < seqLen ? i : null;
  }, [scrollLeft, colWidth, seqLen]);

  const handleMouseMove = useCallback((e) => {
    if (onHighlight) onHighlight(getSiteFromEvent(e));
  }, [onHighlight, getSiteFromEvent]);

  const handleMouseLeave = useCallback(() => {
    if (onHighlight) onHighlight(null);
  }, [onHighlight]);

  const handleClick = useCallback((e) => {
    const siteIndex = getSiteFromEvent(e);
    if (onHighlight && siteIndex !== null) onHighlight(siteIndex);
  }, [onHighlight, getSiteFromEvent]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        cursor: "default",
        userSelect: "none",
        display: "block",
        position: "sticky",
        left: 0,
        top: 0,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    />
  );
});