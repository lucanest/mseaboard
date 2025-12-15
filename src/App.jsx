/**
 * @license
 * Copyright (C) 2025 MSEABOARD
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 **/

// App.jsx
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import 'katex/dist/katex.min.css';
import React, { useState, useRef, useEffect, useCallback, useMemo,useLayoutEffect  } from 'react';
import throttle from 'lodash.throttle'
import debounce from 'lodash.debounce';
import GridLayout from 'react-grid-layout';
import ReactDOM from 'react-dom';
import pako from 'pako';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as d3 from 'd3'; 
import { useDistanceMatrixWorker } from './hooks/useDistanceMatrixWorker.js';
import { createMatrixView } from './components/MatrixView.js';
import { subtooltipClass } from './constants/styles.js';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import {DuplicateButton, RemoveButton, LinkButton, RadialToggleButton,
CodonToggleButton, TranslateButton, SiteStatsButton, LogYButton,
SeqlogoButton, SequenceButton, DistanceMatrixButton, ZeroOneButton,
 DownloadButton, GitHubButton, SearchButton, TreeButton, ColorButton,
 DiamondButton, BranchLengthsButton, PruneButton, SubMSAButton,
 TableChartButton, OmegaButton, PictureButton, ShuffleButton, MarkdownButton,
UndoButton, RedoButton, SaveBoardButton, LoadBoardButton, ShareButton 
 } from './components/Buttons.jsx';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import { translateNucToAmino, isNucleotide, parsePhylipDistanceMatrix, parseFasta, getLeafOrderFromNewick,
newickToDistanceMatrix, detectFileType, toFasta, toPhylip, computeSiteStats, buildTreeFromDistanceMatrix,
computeNormalizedHammingMatrix, pickAlignedSeqForChain, chainIdFromSeqId, residueIndexToMsaCol, 
reorderHeatmapByLeafOrder, reorderMsaByLeafOrder, msaColToResidueIndex,
parsePdbChains, mkDownload, baseName, removeGappedSequences, convertFastMeToNhx, msaToPhylip, computeCorrelationMatrix, uint8ArrayToBase64, base64ToUint8Array,
computeTreeStats, parseTsvMatrix, parseNewick, toNewick, detectIndexingMode, sanitizeSchema,
} from './components/Utils.jsx';
import { residueColors, logoColors, linkpalette, residueSvgColors } from './constants/colors.js';
import { CELL_SIZE, LABEL_WIDTH } from './constants/sizes.js';
import { TitleFlip, AnimatedList } from './components/Animations.jsx';
import PhyloTreeViewer from './components/PhyloTreeViewer.jsx';
import Heatmap from "./components/Heatmap.jsx";
import Histogram from './components/Histogram.jsx';
import TableViewer from './components/TableViewer.jsx';
import SequenceLogoCanvas from './components/Seqlogo.jsx';
import StructureViewer from './components/StructureViewer.jsx';
import useElementSize from './hooks/useElementSize.js'
import { useOmegaModel } from './hooks/useOmegaModel.js';


function useIsVisible(ref) {
  const [isIntersecting, setIntersecting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIntersecting(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setIntersecting(entry.isIntersecting);
    });

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [ref]);

  return isIntersecting;
}

const MemoizedButtonWithHover = React.memo(function ButtonWithHover({ name, children, handleEnter, handleLeave }) {
  return (
    <div
      className="w-7 h-7 flex items-center justify-center"
      onMouseEnter={() => handleEnter(name, false)}
      onPointerLeave={handleLeave}
      onFocus={() => handleEnter(name, false)}
      onBlur={handleLeave}
    >
      {children}
    </div>
  );
});

const MemoizedLinkBadge = React.memo(function LinkBadge({ partnerId, active, colorForLink, id, onUnlink, onRestoreLink, handleEnter, handleLeave }) {
  const baseColor = colorForLink?.(id, partnerId, true) ?? 'bg-blue-400';
  return (
    <button
      type="button"
      className={`w-4 h-4 rounded-full shadow hover:scale-110
        ${active ? baseColor : 'bg-gray-300'}
        ${!active ? `hover:bg-blue-300` : ''}`}
      onMouseEnter={() => handleEnter(partnerId, true)}
      onPointerLeave={handleLeave}
      onFocus={() => handleEnter(partnerId, true)}
      onBlur={handleLeave}
      onClick={(e) => {
        e.stopPropagation();
        if (active) onUnlink?.(id, partnerId);
        else onRestoreLink?.(id, partnerId);
      }}
    />
  );
});


const PanelHeader = React.memo(function PanelHeader({
  id,
  prefix = '',
  filename,
  setPanelData,
  extraButtons = [],
  onDuplicate,
  onLinkClick,
  isLinkModeActive,
  isEligibleLinkTarget,
  onRemove,
  linkBadges = [],
  onRestoreLink,
  onUnlink,
  colorForLink,
  forceHideTooltip = false,
}) {
  const [hoveredBtn, setHoveredBtn] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredBadge, setHoveredBadge] = useState(null);
  const [showBadgeTooltip, setShowBadgeTooltip] = useState(false);

  // Refs for managing show/hide timers to prevent race conditions
  const showTimer = useRef();
  const hideTimer = useRef();

  // Centralized cleanup function for tooltips
  const clearAllTooltips = useCallback(() => {
    clearTimeout(showTimer.current);
    setShowTooltip(false);
    setHoveredBtn(null);
    setShowBadgeTooltip(false);
    setHoveredBadge(null);
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(showTimer.current);
      clearTimeout(hideTimer.current);
    };
  }, []);

  useEffect(() => {
    function handleGlobalMouseMove(e) {
      if (
        !(e.target instanceof Element) ||
        (!e.target.closest('.panel-drag-handle') &&
         !e.target.closest('.absolute.text-center'))
      ) {
        clearAllTooltips();
      }
    }
    document.addEventListener('mousemove', handleGlobalMouseMove);
    return () => document.removeEventListener('mousemove', handleGlobalMouseMove);
  }, [clearAllTooltips]);

  useEffect(() => {
    if (!hoveredBtn && !hoveredBadge && showTooltip) {
      setShowTooltip(false);
      setShowBadgeTooltip(false);
    }
  }, [hoveredBtn, hoveredBadge, showTooltip]);

  const handleLeave = useCallback(() => {
    clearTimeout(showTimer.current);
    hideTimer.current = setTimeout(() => {
      clearAllTooltips();
    }, 5);
  }, [clearAllTooltips]);

  const handleEnter = useCallback((name, isBadge = false) => {
    if (forceHideTooltip) {
      return;
    }
    clearTimeout(hideTimer.current);
    showTimer.current = setTimeout(() => {
      if (isBadge) {
        setHoveredBadge(name);
        setShowBadgeTooltip(true);
      } else {
        setHoveredBtn(name);
        setShowTooltip(true);
      }
    }, 150);
  }, [forceHideTooltip]);

  useEffect(() => {
    if (forceHideTooltip) {
      clearAllTooltips();
    }
  }, [forceHideTooltip, clearAllTooltips]);

  useEffect(() => {
    setHoveredBtn(null);
    setShowTooltip(false);
    setHoveredBadge(null);
    setShowBadgeTooltip(false);
  }, [extraButtons]);

  const tooltipMap = {
    duplicate: "Duplicate panel",
    remove: "Remove panel",
    link: "Link panel",
  };

  return (
    <div
      className="upload-btn-trigger panel-drag-handle bg-gradient-to-b from-gray-100 to-white pt-1 px-1 mb-1 cursor-move
             flex flex-wrap items-center justify-between gap-x-2 gap-y-1 font-bold"
      onBlur={handleLeave}
      tabIndex={-1}
    >
      <div className="flex items-center gap-1 pl-1">
        {linkBadges.map(({ partnerId, active }) => (
          <div key={partnerId} className="w-5 h-5">
            <MemoizedLinkBadge
              partnerId={partnerId}
              active={active}
              colorForLink={colorForLink}
              id={id}
              onUnlink={onUnlink}
              onRestoreLink={onRestoreLink}
              handleEnter={handleEnter}
              handleLeave={handleLeave}
            />
          </div>
        ))}
      </div>

      {showBadgeTooltip && hoveredBadge && (
        <div className="absolute top-12 left-2 z-30 px-2 py-1
          rounded-xl bg-gray-200 text-black text-sm
          transition-opacity whitespace-nowrap opacity-100 border border-gray-400"
          onMouseEnter={() => clearTimeout(hideTimer.current)}
          onPointerLeave={handleLeave}
        >
          {(() => {
            const badge = linkBadges.find(b => b.partnerId === hoveredBadge);
            if (!badge) return hoveredBadge;
            return badge.active
              ? (<>{badge.title}<br /><span className={subtooltipClass}>Click to disable link</span></>)
              : (<>{badge.title}<br /><span className={subtooltipClass}>Click to restore link</span></>)
          })()}
        </div>
      )}

      <div className="flex-1 flex justify-center">
        <EditableFilename
          id={id}
          filename={filename}
          setPanelData={setPanelData}
          prefix={prefix}
        />
      </div>

      <div
        className="flex flex-wrap items-center gap-1"
        onBlur={handleLeave}
        tabIndex={-1}
      >
        <div className="flex flex-wrap items-center gap-0">
          {extraButtons.map((btn, i) => {
            const name = `extra${i}`;
            const tooltipText = btn.tooltip || tooltipMap[name] || "Extra action";
            const element = btn.element || btn;
            tooltipMap[name] = tooltipText;

            return (
              <MemoizedButtonWithHover key={i} name={name} handleEnter={handleEnter} handleLeave={handleLeave}>
                {element}
              </MemoizedButtonWithHover>
            );
          })}
          <MemoizedButtonWithHover name="duplicate" handleEnter={handleEnter} handleLeave={handleLeave}>
            <DuplicateButton tooltip={null} onClick={() => onDuplicate(id)} />
          </MemoizedButtonWithHover>
          {onLinkClick && (
            <MemoizedButtonWithHover name="link" handleEnter={handleEnter} handleLeave={handleLeave}>
              <LinkButton
                onClick={() => onLinkClick(id)}
                isLinkModeActive={isLinkModeActive}
                isEligibleLinkTarget={isEligibleLinkTarget}
              />
            </MemoizedButtonWithHover>
          )}
          <MemoizedButtonWithHover name="remove" handleEnter={handleEnter} handleLeave={handleLeave}>
            <RemoveButton onClick={() => onRemove(id)} />
          </MemoizedButtonWithHover>
        </div>
      </div>

      {showTooltip && hoveredBtn && (
        <div className="absolute text-center top-12 right-2 z-30 px-2 py-1
               rounded-xl bg-gray-200 text-black text-sm
              transition-opacity whitespace-nowrap opacity-100 border border-gray-400"
          onMouseEnter={() => clearTimeout(hideTimer.current)}
          onPointerLeave={handleLeave}
        >
          {tooltipMap[hoveredBtn] ||
            (hoveredBtn.startsWith("extra") ? "Extra action" : "")}
        </div>
      )}
    </div>
  );
});


function EditableFilename({ id, filename, setPanelData, prefix = '', className = '' }) {
  const [editing, setEditing] = useState(false);
  const [filenameInput, setFilenameInput] = useState(filename);

  useEffect(() => {
    setFilenameInput(filename);
  }, [filename]);

  const commit = () => {
    setPanelData(prev => ({
      ...prev,
      [id]: { ...prev[id], filename: filenameInput }
    }));
    setEditing(false);
  };

  return editing ? (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        commit();             
      }}
      className={`inline ${className}`}
    >
      <input
        className="border rounded w-32 text-sm mt-1 mb-1"
        value={filenameInput}
        onChange={e => setFilenameInput(e.target.value)}
        autoFocus
        onBlur={commit}        
        onKeyDown={(e) => {
          if (e.key === 'Escape') setEditing(false);
        }}
      />
    </form>
  ) : (
    <div className="flex items-center">
      <span>{prefix}{filename}</span>
      <button
        type="button"
        className="ml-2 p-0.5 hover:bg-gray-200 rounded-lg"
        onClick={() => setEditing(true)}
        title="Edit filename"
      >
        <span className="inline-flex items-center justify-center w-6 h-5">
          <PencilSquareIcon className="w-4 h-4 text-gray-700"/>
        </span>
      </button>
    </div>
  );
}

function MSATooltip({ x, y, children, boundary }) {
  const ref = React.useRef(null);
  const [size, setSize] = React.useState({ w: 0, h: 0 });

  React.useLayoutEffect(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    if (Math.abs(r.width - size.w) > 0.5 || Math.abs(r.height - size.h) > 0.5) {
      setSize({ w: r.width, h: r.height });
    }
  }, [x, y, size.w, size.h]);

  const GAP = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const rightEdge = boundary ? boundary.right : vw;

  // 3. Calculate flip based on the right edge.
  const flipX = x + 15 * GAP > rightEdge;


  const flipY = y + GAP + size.h > vh;

  const left = x + (flipX ? -GAP : GAP);
  const top  = y + (flipY ? -GAP : GAP);

  const clampedLeft = Math.max(4, Math.min(vw - 4, left));
  const clampedTop  = Math.max(4, Math.min(vh - 4, top));

  return ReactDOM.createPortal(
    <div
      ref={ref}
      className="fixed px-1 py-0.5 text-sm bg-gray-100 rounded-xl pointer-events-none z-[9999] shadow border border-gray-400"
      style={{
        left: clampedLeft,
        top: clampedTop,
        transform: `translate(${flipX ? '-100%' : '0'}, ${flipY ? '-100%' : '0'})`,
        willChange: 'transform, left, top',
      }}
    >
      {children}
    </div>,
    document.body
  );
}
function PanelContainer({
  id,
  linkedTo,
  hoveredPanelId,
  setHoveredPanelId,
  children,
  onSelect = () => {},
  isEligibleLinkTarget = false, 
  justLinkedPanels = [],
  panelLinks,            
}) {
  const isJustLinked = justLinkedPanels.includes(id);
  const [forceHideTooltip, setForceHideTooltip] = useState(false);
  const isLinkedToHovered = Array.isArray(linkedTo) && hoveredPanelId && linkedTo.includes(hoveredPanelId);
  // Check if the hovered panel is linked to this panel
  const isHoveredLinkedToThis =
  hoveredPanelId &&
  panelLinks &&
  Array.isArray(panelLinks[hoveredPanelId]) &&
  panelLinks[hoveredPanelId].includes(id);
  return (
    <div
className={`border rounded-2xl overflow-hidden h-full flex flex-col bg-white
        shadow-lg
        ${
          isJustLinked
            ? 'shadow-green-400/80'
            : isLinkedToHovered || isHoveredLinkedToThis || hoveredPanelId === id
            ? 'shadow-blue-400/50'
            : ''
        }
        ${isEligibleLinkTarget ? 'ring-2 ring-blue-400' : ''}
      `}
      tabIndex={0}
      onClick={() => onSelect(id)}
      onFocus={() => onSelect(id)}
      onMouseEnter={() => setHoveredPanelId(id)}
      onPointerLeave={() => {
        setHoveredPanelId(null);
        setForceHideTooltip(true);
      }}
    >
      {children}
    </div>
  );
}


const SeqLogoPanel = React.memo(function SeqLogoPanel({
  id, data, onRemove, onDuplicate, hoveredPanelId, setHoveredPanelId, setPanelData,
  onHighlight, linkedTo, panelLinks,
  onLinkClick, isLinkModeActive, isEligibleLinkTarget, justLinkedPanels,
  linkBadges, onRestoreLink, colorForLink, onUnlink,
}) {
  const sequences = useMemo(() => {
    if (!data?.msa) return [];
    if (Array.isArray(data.msa) && typeof data.msa[0] === "object") {
      return data.msa.map(seq => seq.sequence.toUpperCase());
    }
    if (Array.isArray(data.msa)) return data.msa.map(s => s.toUpperCase());
    return [];
  }, [data.msa]);

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
    if (sequences.length === 0 || sequences[0].length === 0) return [];
    const seqLen = sequences[0].length;
    const results = [];
    const log2 = (x) => (x <= 0 ? 0 : Math.log2(x));
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
  }, [sequences, alphabet]);

  const scrollContainerRef = useRef(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const isScrollingRef = useRef(false);
  const scrollRafRef = useRef(null);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const downloadOptionsRef = useRef(null);
  const pictureButtonWrapperRef = useRef(null);

  useEffect(() => {
    if (!showDownloadOptions) return;
    const closeOnClickOutside = (e) => {
      if (
        downloadOptionsRef.current &&
        !downloadOptionsRef.current.contains(e.target) &&
        (!pictureButtonWrapperRef.current || !pictureButtonWrapperRef.current.contains(e.target))
      ) {
        setShowDownloadOptions(false);
      }
    };
    document.addEventListener('mousedown', closeOnClickOutside);
    return () => document.removeEventListener('mousedown', closeOnClickOutside);
  }, [showDownloadOptions]);

  // Use requestAnimationFrame for smoother scrolling
  const onScroll = useCallback((e) => {
    const target = e?.currentTarget;
    if (!target) return;
    
    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
    }

    isScrollingRef.current = true;
    scrollRafRef.current = requestAnimationFrame(() => {
      const newScrollLeft = target.scrollLeft;
      setScrollLeft(newScrollLeft);
      isScrollingRef.current = false;
    });
  }, []);



  const Highlighted = (
    data.highlightedSite != null &&
    (hoveredPanelId === id || (Array.isArray(linkedTo) && linkedTo.includes(hoveredPanelId)))
  );

  // Update viewport width when container resizes
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateViewportWidth = () => {
      setViewportWidth(container.clientWidth);
    };

    updateViewportWidth();
    
    const resizeObserver = new ResizeObserver(updateViewportWidth);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);


  useEffect(() => {
    const container = scrollContainerRef.current;
    if (
      data.highlightedSite != null && 
      Number.isInteger(Number(data.highlightedSite)) &&
      Number(data.highlightedSite) >= 0 &&
      Array.isArray(linkedTo) && 
      linkedTo.includes(hoveredPanelId) &&
      hoveredPanelId !== id &&
      container &&
      !isScrollingRef.current // Don't auto-scroll while user is manually scrolling
    ) {
      const colWidth = CELL_SIZE;
      const containerWidth = container.clientWidth;
      const currentScroll = container.scrollLeft;
      
      const colLeft = data.highlightedSite * colWidth;
      const colRight = colLeft + colWidth;

      // Only scroll if the column is mostly out of view
      const visibleThreshold = containerWidth * 0.1; // 10% threshold
      if (colRight < currentScroll + visibleThreshold || colLeft > currentScroll + containerWidth - visibleThreshold) {
        const padding = containerWidth / 3;
        let targetScroll = currentScroll;
        
        if (colLeft < currentScroll + padding) {
          targetScroll = colLeft - padding;
        } else if (colRight > currentScroll + containerWidth - padding) {
          targetScroll = colRight - containerWidth + padding;
        }

        const maxScroll = container.scrollWidth - containerWidth;
        const clampedScroll = Math.max(0, Math.min(maxScroll, targetScroll));
        
        container.scrollTo({ left: clampedScroll});
      }
    }
  }, [data.highlightedSite, hoveredPanelId, linkedTo, id]);


  const handleDownloadFullImage = useCallback(() => {
    setShowDownloadOptions(false);
    if (!columns.length) return;

    // Constants for drawing, mirrored from Seqlogo.jsx
    const height = 200;
    const colWidth = CELL_SIZE;
    const fontFamily = "monospace";
    const xAxisHeight = 30;
    const canvasHeight = height + xAxisHeight;
    const seqLen = columns.length;
    const fullWidth = seqLen * colWidth;

    const maxInfo = Math.log2(alphabet.length) || 2;
    const yScale = (val) => (val / maxInfo) * height;
    const textHeightPx = colWidth * 1.1;

    const tempCanvas = document.createElement('canvas');
    let dpr = window.devicePixelRatio || 1;
    tempCanvas.width = Math.ceil(fullWidth * dpr);
    tempCanvas.height = Math.ceil(canvasHeight * dpr);
    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, fullWidth, canvasHeight);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    
    for (let i = 0; i < seqLen; i++) {
      const col = columns[i];
      if (!col) continue;

      const xPos = i * colWidth;
      let y0 = height;

      for (const [res, p] of col.ordered) {
        const charHeight = yScale(p * col.info);
        if (charHeight < 0.1) continue;
        y0 -= charHeight;
        ctx.fillStyle = residueSvgColors[res] || "#444";
        const xCenter = xPos + colWidth / 2;
        
        ctx.save();
        ctx.translate(xCenter, y0 + charHeight);
        const scaleY = Math.max(0.1, charHeight / textHeightPx);
        ctx.scale(1, scaleY);
        ctx.font = `700 ${textHeightPx}px ${fontFamily}`;
        ctx.fillText(res, 0, -2);
        ctx.restore();
      }
      
      // Draw axis labels
      const label = String(i + 1);
      const len = label.length;
      let fontSize = CELL_SIZE/2;
      if (len > 2) fontSize = (colWidth / len) * 1.2;
      ctx.font = `${fontSize}px monospace`;
      ctx.fillStyle = "#888";
      ctx.fillText(label, xPos + colWidth / 2, height + 25);
    }
    
    // Trigger download
    const base = (data?.filename || 'sequence_logo_full').replace(/\.[^.]+$/, '');
    try {
      const url = tempCanvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${base}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Full PNG export failed:', e);
      alert('Full PNG export failed in this browser.');
    }
  }, [data, columns, alphabet]);

  const handleDownloadVisibleImage = useCallback(() => {
    setShowDownloadOptions(false);
    const sourceCanvas = scrollContainerRef.current?.querySelector('canvas');
    if (!sourceCanvas) {
      alert('Could not find canvas to download.');
      return;
    }
    
    // The sourceCanvas represents the visible, scrolled area.
    const base = (data?.filename || 'sequence_logo_visible').replace(/\.[^.]+$/, '');
    try {
      const url = sourceCanvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${base}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Visible PNG export failed:', e);
      alert('Visible PNG export failed in this browser.');
    }
  }, [data]);

const handleDownloadTSV = useCallback(() => {
    if (!sequences || sequences.length === 0) return;

    const seqLen = sequences[0].length;
    const numSeqs = sequences.length;

    const allChars = new Set(sequences.join(''));
    const dnaChars = new Set(['A', 'C', 'G', 'T', 'U', 'N', '-', '.', '*']);
    let isProtein = false;
    for (const char of allChars) {
      if (!dnaChars.has(char.toUpperCase())) {
        isProtein = true;
        break;
      }
    }
    const alphabetSize = isProtein ? 20 : 4;
    const log2s = Math.log2(alphabetSize);

    let tsvContent = 'site\tresidue\tinformation content (bits)\n';

    for (let i = 0; i < seqLen; i++) {
      const counts = {};
      let totalNonGap = 0;

      for (let j = 0; j < numSeqs; j++) {
        const char = sequences[j][i];
        if (char && char !== '-' && char !== '.') {
          counts[char] = (counts[char] || 0) + 1;
          totalNonGap++;
        }
      }

      if (totalNonGap === 0) continue;

      let H = 0;
      for (const char in counts) {
        const p = counts[char] / totalNonGap;
        if (p > 0) {
          H -= p * Math.log2(p);
        }
      }

      const e_n = (alphabetSize - 1) / (2 * Math.LN2 * totalNonGap);
      const R = log2s - (H + e_n);
      const R_final = Math.max(0, R);

      for (const char in counts) {
        const p = counts[char] / totalNonGap;
        const height = p * R_final;
        tsvContent += `${i + 1}\t${char}\t${height.toFixed(4)}\n`;
      }
    }

    const base = (data?.filename || 'sequence_logo_data').replace(/\.[^.]+$/, '');
    mkDownload(base, tsvContent, 'tsv')();
  }, [sequences, data?.filename]);

  const extraButtons = useMemo(() => [
    { element: (
        <div ref={pictureButtonWrapperRef}>
          <PictureButton onClick={() => setShowDownloadOptions(s => !s)} />
        </div>
      ),
      tooltip: "Download image (.png)" },
    { element: <DownloadButton onClick={handleDownloadTSV} />,
      tooltip: "Download data (.tsv)" },
  ], [handleDownloadFullImage, handleDownloadVisibleImage, handleDownloadTSV]);

  const seqLen = sequences[0]?.length || 0;
  const totalWidth = seqLen * CELL_SIZE - 14; // CELL_SIZE px per residue - 14px adjustment for last column

  // Clean up RAF on unmount
  useEffect(() => {
    return () => {
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  return (
    <PanelContainer
      id={id}
      hoveredPanelId={hoveredPanelId}
      setHoveredPanelId={setHoveredPanelId}
      linkedTo={linkedTo}
      panelLinks={panelLinks}
      isEligibleLinkTarget={isEligibleLinkTarget}
      justLinkedPanels={justLinkedPanels}
    >
      {showDownloadOptions && (
        <div ref={downloadOptionsRef} className="absolute top-11 right-3 z-50 bg-white border border-gray-300 rounded-xl shadow px-1 py-1 flex flex-col items-stretch space-y-1">
          <button onClick={handleDownloadVisibleImage} className="text-sm text-left px-3 py-1 rounded-lg hover:bg-gray-200 whitespace-nowrap">
            Visible Area
          </button>
          <button onClick={handleDownloadFullImage} className="text-sm text-left px-3 py-1 rounded-lg hover:bg-gray-200 whitespace-nowrap">
            Full Logo
          </button>
        </div>
      )}
      <PanelHeader
        id={id}
        prefix=""
        filename={data.filename || "Sequence Logo"}
        setPanelData={setPanelData}
        onDuplicate={onDuplicate}
        onRemove={onRemove}
        onLinkClick={onLinkClick}
        isLinkModeActive={isLinkModeActive}
        isEligibleLinkTarget={isEligibleLinkTarget}
        linkBadges={linkBadges}
        onRestoreLink={onRestoreLink}
        onUnlink={onUnlink}
        colorForLink={colorForLink}
        extraButtons={extraButtons}
        forceHideTooltip={showDownloadOptions}
      />
      <div
        ref={scrollContainerRef}
        onScroll={onScroll}
        className="flex-1 p-2 bg-white overflow-x-auto"
        style={{ 
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {sequences.length === 0 ? (
          <div className="p-2 text-gray-400 text-center">
            No data to render sequence logo.
          </div>
        ) : (
          <div style={{ width: `${totalWidth}px`, height: '100%', position: 'relative' }}>
            <SequenceLogoCanvas
              sequences={sequences}
              height={200}
              highlightedSite={Highlighted ? data.highlightedSite : null}
              onHighlight={siteIdx => { if (onHighlight) onHighlight(siteIdx, id); }}
              scrollLeft={scrollLeft}
              viewportWidth={viewportWidth}
            />
          </div>
        )}
      </div>
    </PanelContainer>
  );
});

const HeatmapPanel = React.memo(function HeatmapPanel({
  id, data, onRemove, onDuplicate, onLinkClick, isLinkModeActive,isEligibleLinkTarget,
  hoveredPanelId, setHoveredPanelId, setPanelData, panelLinks,
  onHighlight, justLinkedPanels,linkBadges, onRestoreLink, colorForLink, onUnlink, onGenerateTree
}) {
  const { labels, rowLabels, colLabels, matrix, filename, threshold=null, minVal, maxVal } = data || {};
  const [showColorModal, setShowColorModal] = useState(false);
  const colorModalRef = useRef(null);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const downloadOptionsRef = useRef(null);
  const pictureButtonWrapperRef = useRef(null);
  const [containerRef, dims] = useElementSize({ debounceMs: 90 });

  // Handler for Canvas-Only PDF Download
  const handleDownloadCanvasPDF = useCallback(() => {
    setShowDownloadOptions(false);
    const canvas = containerRef.current?.querySelector('canvas');
    if (!canvas) {
      alert("Could not find the heatmap canvas.");
      return;
    }
    const base = baseName(filename, 'heatmap_canvas');
    try {
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${base}.pdf`);
    } catch (e) {
      console.error("PDF (Canvas) export failed:", e);
      alert("Failed to export canvas as PDF.");
    }
  }, [filename, containerRef]);

  // Handler for Full Figure PDF Download
  const handleDownloadFigurePDF = useCallback(async () => {
    setShowDownloadOptions(false);
    const contentToCapture = containerRef.current;
    if (!contentToCapture) {
      alert("Could not find the heatmap content to generate a PDF.");
      return;
    }
    const base = baseName(filename, 'heatmap_figure');
    const scale = 2; // resolution
    try {
      const canvas = await html2canvas(contentToCapture, { scale, useCORS: true, allowTaint: true, logging: false });
      const imgData = canvas.toDataURL('image/png', 1.0);
      const originalWidth = contentToCapture.offsetWidth;
      const originalHeight = contentToCapture.offsetHeight;
      const pdf = new jsPDF({
        orientation: originalWidth > originalHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [originalWidth, originalHeight]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, originalWidth, originalHeight);
      pdf.save(`${base}.pdf`);
    } catch (e) {
      console.error("PDF (Figure) export failed:", e);
      alert("Failed to export figure as PDF.");
    }
  }, [filename, containerRef]);
  
  // Robustly determine if the matrix is square, supporting old board formats.
  const isSquare = data.isSquare === true || (labels && !rowLabels);
  
  // Default to square view (diamondMode=false) if the property doesn't exist on old boards.
  const diamondMode = data.diamondMode === true;

useEffect(() => {
    if (!showColorModal && !showDownloadOptions) return;
    const closeOnEsc = (e) => {
      if (e.key === 'Escape') {
        setShowColorModal(false);
        setShowDownloadOptions(false);
      }
    };
    const closeOnClickOutside = (e) => {
      if (colorModalRef.current && !colorModalRef.current.contains(e.target)) {
        setShowColorModal(false);
      }
      // This condition now checks that the click is not on the download button
      if (
        downloadOptionsRef.current &&
        !downloadOptionsRef.current.contains(e.target) &&
        (!pictureButtonWrapperRef.current || !pictureButtonWrapperRef.current.contains(e.target))
      ) {
        setShowDownloadOptions(false);
      }
    };
    document.addEventListener('keydown', closeOnEsc);
    document.addEventListener('mousedown', closeOnClickOutside);
    return () => {
      document.removeEventListener('keydown', closeOnEsc);
      document.removeEventListener('mousedown', closeOnClickOutside);
    };
  }, [showColorModal, showDownloadOptions]);


  const handleDiamondToggle = useCallback(() => {
  setPanelData(pd => ({
    ...pd,
    [id]: {
      ...pd[id],
      diamondMode: !diamondMode
    }
  }));
}, [id, setPanelData, diamondMode]);

const handleDownload = useCallback(() => {
    const base = baseName(filename, 'matrix_data');
    
   // CONVERSION STEP: If the matrix is a proxy (its rows aren't arrays),
   // convert it to a standard 2D JavaScript array before proceeding.
    let matrixForDownload = matrix;
    if (matrix && matrix.length > 0 && !Array.isArray(matrix[0])) {
      const n = matrix.length;
      matrixForDownload = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => matrix[i][j])
      );
    }
    
    if (isSquare && !data.isMsaColorMatrix) {
      // Handle square matrices (distance matrices) -> PHYLIP format
      const downloadLabels = rowLabels || labels;
      if (!downloadLabels) return; 
      const content = toPhylip(downloadLabels, matrixForDownload);
      mkDownload(base, content, 'phy')();
    } else {
      // Handle non-square matrices (and MSA color matrices) -> tsv format
      if (!rowLabels || !colLabels) return;
      
      const header = ['', ...colLabels].join('\t');
      const dataRows = matrixForDownload.map((row, i) => {
        // If it's an MSA color matrix, the values are characters (strings), so don't use toFixed.
        if (data.isMsaColorMatrix) {
          return [rowLabels[i], ...row].join('\t');
        }
        // Otherwise, it's a numeric matrix, so format the numbers.
        return [rowLabels[i], ...row.map(val => Number.isFinite(val) ? val.toFixed(4) : String(val))].join('\t');
      });
      
      const content = [header, ...dataRows].join('\n');
      mkDownload(base, content, 'tsv')();
    }
  }, [filename, isSquare, rowLabels, colLabels, labels, matrix, data.isMsaColorMatrix]);

  const handleCellClick = (cell, id) => {
    setPanelData(prev => {
      const current = prev[id] || {};
      const prevHighlights = current.highlightedCells || [];
      
      const alreadyHighlighted = prevHighlights.some(
        c => c.row === cell.row && c.col === cell.col
      );

      const updated = alreadyHighlighted
        ? prevHighlights.filter(c => c.row !== cell.row || c.col !== cell.col)
        : [...prevHighlights, cell];

      return {
        ...prev,
        [id]: {
          ...current,
          highlightedCells: updated,
        },
      };
    });
  };

    const handleThresholdChange = useCallback(
    (newThreshold) => {
      setPanelData(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          threshold: newThreshold,
        },
      }));
    },
    [id, setPanelData]
  );

const downloadFormat = isSquare && !data.isMsaColorMatrix ? '.phy' : '.tsv';
  
const extraButtons = useMemo(() => {
    const commonButtons = [
      { 
        element: (
          <div ref={pictureButtonWrapperRef}>
            <PictureButton onClick={() => setShowDownloadOptions(s => !s)} />
          </div>
        ),
        tooltip: (<>Download figure<br /><span className={subtooltipClass}> (.pdf)</span></>)
      },
      { 
        element: <DownloadButton onClick={handleDownload} />,
        tooltip: (<>Download matrix<br /><span className={subtooltipClass}> ({downloadFormat})</span></>)
      },
    ];

    if (data.isMsaColorMatrix) {
        return commonButtons;
    }

    const buttons = [];
    buttons.push({
    element: <ColorButton onClick={() => setShowColorModal(s => !s)} />,
    tooltip: "Change colors"
    });
    if (isSquare) {
      buttons.push({ 
          element: <TreeButton onClick={() => onGenerateTree(id)} />,
          tooltip: (<>Build tree from distances<br /><span className={subtooltipClass}>Neighbor-Joining</span></>)
      });
      buttons.push({ 
          element: diamondMode ? <DistanceMatrixButton onClick={handleDiamondToggle} /> : <DiamondButton onClick={handleDiamondToggle} />,
          tooltip: diamondMode ? <>Switch to square view</> : <>Switch to diamond view</>
      });
    }
    return buttons.concat(commonButtons);
  }, [id, onGenerateTree, diamondMode, handleDiamondToggle, handleDownload, handleDownloadCanvasPDF, handleDownloadFigurePDF, isSquare, setShowColorModal, data.isMsaColorMatrix]);

  if (!matrix) {
    return (
      <PanelContainer id={id} hoveredPanelId={hoveredPanelId} setHoveredPanelId={setHoveredPanelId}>
        <PanelHeader {...{id, filename, setPanelData, onDuplicate, onLinkClick, isLinkModeActive, onRemove,}}/>
        <div className="flex-1 flex items-center justify-center text-gray-400">No data</div>
      </PanelContainer>
    );
  }

  return (
    <PanelContainer
      id={id}
      hoveredPanelId={hoveredPanelId}
      setHoveredPanelId={setHoveredPanelId}
      isEligibleLinkTarget={isEligibleLinkTarget}
      justLinkedPanels={justLinkedPanels}
    >
      <PanelHeader
            id={id}
            prefix=""
            filename={filename}
            setPanelData={setPanelData}
            onDuplicate={onDuplicate}
            onLinkClick={onLinkClick}
            panelLinks={panelLinks} 
            isEligibleLinkTarget={isEligibleLinkTarget}
            isLinkModeActive={isLinkModeActive}
            linkBadges={linkBadges}
            onRestoreLink={onRestoreLink}
            onUnlink={onUnlink}
            colorForLink={colorForLink}
            onRemove={onRemove}
            forceHideTooltip={showColorModal || showDownloadOptions}
            extraButtons={extraButtons}
      />
      {showDownloadOptions && (
        <div ref={downloadOptionsRef} className="absolute top-11 right-3 z-50 bg-white border border-gray-300 rounded-xl shadow px-1 py-1 flex flex-col items-stretch space-y-1">
          <button onClick={handleDownloadFigurePDF} className="text-sm text-left px-3 py-1 rounded-lg hover:bg-gray-200 whitespace-nowrap">
            Full Figure
          </button>
          <button onClick={handleDownloadCanvasPDF} className="text-sm text-left px-3 py-1 rounded-lg hover:bg-gray-200 whitespace-nowrap">
            Matrix Only
          </button>
        </div>
      )}
      {showColorModal && (
       <div ref={colorModalRef} className="absolute top-11 right-3 z-50 bg-white border border-gray-300 rounded-xl shadow px-2 py-2 flex items-center space-x-2">
         <div className="flex flex-col items-center">
           <span className="text-xs font-semibold text-gray-600 py-1">High</span>
           <label className="w-6 h-6 rounded-lg border border-gray-300 cursor-pointer" style={{ backgroundColor: data.highColor || '#3C00A0' }}>
             <input type="color" className="opacity-0 w-0 h-0" value={data.highColor || '#3C00A0'}
                    onChange={(e) => setPanelData(p => ({...p, [id]: {...p[id], highColor: e.target.value}}))} />
           </label>
         </div>
         <div className="flex flex-col items-center">
           <span className="text-xs font-semibold text-gray-600 py-1">Low</span>
           <label className="w-6 h-6 rounded-lg border border-gray-300 cursor-pointer" style={{ backgroundColor: data.lowColor || '#FFFF00' }}>
             <input type="color" className="opacity-0 w-0 h-0" value={data.lowColor || '#FFFF00'}
                    onChange={(e) => setPanelData(p => ({...p, [id]: {...p[id], lowColor: e.target.value}}))} />
           </label>
         </div>
         <div className="flex flex-col items-center">
           <span className="text-xs font-semibold text-gray-600 py-1">Invert</span>
           <button
             onClick={() => {
              const currentHigh = data.highColor || '#3C00A0';
              const currentLow = data.lowColor || '#FFFF00';
              setPanelData(p => ({...p, [id]: {...p[id], highColor: currentLow, lowColor: currentHigh}}));
            }}
             className="w-6 h-6 rounded-lg border border-gray-300 bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-300"
             title="Switch high and low colors"
           >
             <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <path d="M8 7l4-4 4 4"/>
               <path d="M16 17l-4 4-4-4"/>
             </svg>
           </button>
         </div>
         
       </div>
     )}
    <div ref={containerRef} className="flex-1 p-0 pb-4 pr-1 overflow-hidden">
      {(rowLabels || labels) && matrix ? (
        <Heatmap
          id={id}
          labels={labels}
          rowLabels={rowLabels}
          colLabels={colLabels}
          matrix={matrix}
          minVal={minVal}
          maxVal={maxVal}
          highlightSite={data.highlightedSite}
          onHighlight={onHighlight}
          onCellClick={handleCellClick}
          diamondView={isSquare && diamondMode}
          highlightedCells={data.highlightedCells || []}
          linkedHighlightCell={data.linkedHighlightCell}
          threshold={threshold}                      
          onThresholdChange={handleThresholdChange}
          highColor={data.highColor}
          lowColor={data.lowColor}
          isMsaColorMatrix={data.isMsaColorMatrix}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400">No data</div>
      )}
    </div>
  </PanelContainer>
);
});

const StructurePanel = React.memo(function StructurePanel({
  id, data, onRemove, onDuplicate, hoveredPanelId, setHoveredPanelId, setPanelData,
  onCreateSequenceFromStructure, 
  onGenerateDistance,
  onLinkClick, isLinkModeActive,isEligibleLinkTarget,
  linkedTo, onHighlight, linkedPanelData, justLinkedPanels,
   linkBadges, onRestoreLink, colorForLink,   onUnlink, panelLinks,
}) {
  const { pdb, filename, surface = false } = data || {};
  const [showChainPicker, setShowChainPicker] = useState(false);

  const { calculate, isCalculatingDistances, result, error, reset } = useDistanceMatrixWorker();

  useEffect(() => {
    if (result) {
      onGenerateDistance(id, result);
      // Reset the state immediately after consuming it to prevent a loop
      reset(); 
    }
    if (error) {
      alert(`Failed to generate distance matrix: ${error}`);
      // Also reset on error
      reset();
    }
  }, [result, error, id, onGenerateDistance, reset]);

  // Parse available chains (by CA presence)
const chainIds = React.useMemo(() => {
    if (!pdb) return [];
    const seen = new Set(); const ids = [];
    for (const line of pdb.split(/\r?\n/)) {
      if (!line.startsWith('ATOM')) continue;
      if (line.slice(12,16).trim() !== 'CA') continue;
      const cid = (line[21] || 'A').trim() || 'A';
      if (!seen.has(cid)) { seen.add(cid); ids.push(cid); }
    }
    return ids;
  }, [pdb]);

  const pickerItems = React.useMemo(() => {
    const items = [];
    if (chainIds.length > 1) {
      items.push('All chains');
    }
    chainIds.forEach(cid => items.push(`Chain ${cid}`));
    return items;
  }, [chainIds]);


  const handleDownload = useCallback(() => {
    if (!pdb) return;
    const base = baseName(filename, 'structure');
    mkDownload(base, pdb, 'pdb')();
  }, [pdb, filename]);



const pickChain = React.useCallback((choice) => {
      const s = data; // panelData[id]
      if (!s?.pdb) return;

      const chains = parsePdbChains(s.pdb);
      let atoms = [];
      if (choice === 'ALL') {
          for (const { atomsCA } of chains.values()) atoms = atoms.concat(atomsCA);
      } else {
          atoms = chains.get(choice)?.atomsCA || [];
      }

      if (atoms.length < 2) {
          alert('Not enough residues to build a distance map.');
          return;
      }
      
      // Trigger the worker calculation
      calculate(atoms);
      setShowChainPicker(false);
  }, [data, calculate]);

  const handleMatrixClick = React.useCallback(() => {
      if (isCalculatingDistances) return;
      if (!chainIds.length) { alert('No chains detected.'); return; }
      if (chainIds.length === 1) {
        pickChain(chainIds[0]);
      } else {
        setShowChainPicker(true);
      }
    }, [chainIds, id, isCalculatingDistances, pickChain]);

  const handleChainSelect = React.useCallback((item) => {
    if (item === 'All chains') {
      pickChain('ALL');
    } else {
      const cid = item.replace('Chain ', '');
      pickChain(cid);
    }
  }, [pickChain]);
  
  const extraButtons = useMemo(() => [
    { element: <SequenceButton onClick={() => onCreateSequenceFromStructure(id)} />,
      tooltip: "Extract sequences from structure" },
    { element: <DistanceMatrixButton onClick={handleMatrixClick} title='Build distance matrix from structure' />,
      tooltip: "Generate residue distance matrix" },
    { element: <DownloadButton onClick={handleDownload} />,
      tooltip: "Download PDB file" }
  ], [id, onCreateSequenceFromStructure, handleMatrixClick, handleDownload]);
  
  return (
    <PanelContainer
      id={id}
      hoveredPanelId={hoveredPanelId}
      setHoveredPanelId={setHoveredPanelId}
      isEligibleLinkTarget={isEligibleLinkTarget}
      justLinkedPanels={justLinkedPanels}
      panelLinks={panelLinks} 
    >
      <PanelHeader
        id={id}
        prefix=""
        filename={filename}
        setPanelData={setPanelData}
        onLinkClick={onLinkClick}
        isLinkModeActive={isLinkModeActive}
        isEligibleLinkTarget={isEligibleLinkTarget}
        linkBadges={linkBadges}
        onRestoreLink={onRestoreLink}
        onUnlink={onUnlink}
        colorForLink={colorForLink}
        onDuplicate={onDuplicate}
        onRemove={onRemove}
        extraButtons={extraButtons}
      />

      {/* loading overlay while calculating distances */}
      {isCalculatingDistances && (
        <div className="absolute inset-0 z-[1001] bg-black/50 flex items-center justify-center rounded-2xl">
            <div className="text-white text-4xl font-semibold animate-pulse">
                Calculating Distances...
                <br />
                <span className="text-2xl">Warning: very big matrices may freeze the UI</span>
            </div>
        </div>
      )}
      {/* picker overlay */}
      {showChainPicker && (
        <div
          className="absolute inset-0 z-[1000] bg-black/40 flex items-center justify-center rounded-2xl"
          onClick={() => setShowChainPicker(false)}
        >
          <div
            className="py-12 max-w-lg w-[min(90vw,36rem)] h-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            style={{
        overflowY: 'auto',
      }}
          >
            <div className="text-3xl font-bold text-white mb-4 flex-shrink-0 text-center">Choose primary structure chain for distance map</div>
            <div className="flex-1 flex items-center justify-center w-full max-w-xs">
              <AnimatedList
                items={pickerItems}
                onItemSelect={handleChainSelect}
                itemClassName="text-center font-semibold !py-3"
                className="h-full"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 p-2 bg-white overflow-hidden relative">
        {pdb ? (
          <div className="h-full w-full">
            <StructureViewer
              pdb={pdb}
              panelId={id}
              surface={surface}
              data={data}
              setPanelData={setPanelData}
              linkedTo={linkedTo}
              highlightedSite={data.highlightedSite ?? data.linkedResidueIndex}
              onHighlight={onHighlight}
              linkedPanelData={linkedPanelData}
            />
          </div>
        ) : (
          <div className="text-gray-400 text-center">
            No PDB data. Drag and drop a PDB file to view a structure.
          </div>
        )}
      </div>
    </PanelContainer>
  );
});

const MSACell = React.memo(function MSACell({
  style,
  char,
  isHoverHighlight,
  isLinkedHighlight,
  isPersistentHighlight,
  isSearchHighlight,
  rowIndex,
  columnIndex
}) {
  const background = residueColors[char?.toUpperCase()] || 'bg-white';
  
  let highlightClass = '';
  if (isHoverHighlight || isLinkedHighlight) {
    highlightClass = 'alignment-highlight';
  } else if (isPersistentHighlight) {
    highlightClass = 'persistent-alignment-highlight';
  }
  
  const searchClass = isSearchHighlight ? 'search-alignment-highlight' : '';
  
  const className = `flex items-center justify-center ${background} ${highlightClass} ${searchClass}`.trim();

  return (
    <div
      data-cell="1"
      data-row={rowIndex}
      data-col={columnIndex}
      style={style}
      className={className}
    >
      {char}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.char === nextProps.char &&
    prevProps.isHoverHighlight === nextProps.isHoverHighlight &&
    prevProps.isLinkedHighlight === nextProps.isLinkedHighlight &&
    prevProps.isPersistentHighlight === nextProps.isPersistentHighlight &&
    prevProps.isSearchHighlight === nextProps.isSearchHighlight &&
    prevProps.style === nextProps.style
  );
});

const useVirtualization = (scrollTop, scrollLeft, viewportWidth, viewportHeight, totalRows, totalCols, itemHeight, itemWidth) => {
    return useMemo(() => {
        const overscan = 5; // extra rows/cols to render beyond the viewport

        const visibleRows = Math.ceil(viewportHeight / itemHeight);
        const visibleCols = Math.ceil(viewportWidth / itemWidth);

        const firstRow = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
        const lastRow = Math.min(totalRows, firstRow + visibleRows + (overscan * 2));

        const firstCol = Math.max(0, Math.floor(scrollLeft / itemWidth) - overscan);
        const lastCol = Math.min(totalCols, firstCol + visibleCols + (overscan * 2));
        return { firstRow, lastRow, firstCol, lastCol };

    }, [scrollTop, scrollLeft, viewportWidth, viewportHeight, totalRows, totalCols, itemHeight, itemWidth]);
};


const AlignmentPanel = React.memo(function AlignmentPanel({
  id,
  data,
  onRemove, onDuplicate, onDuplicateTranslate, onCreateSeqLogo,
  onCreateSiteStatsHistogram, onGenerateDistance, onGenerateFastMEDistance,
  onLinkClick, isLinkModeActive, isEligibleLinkTarget, linkedTo,
  highlightOrigin, onHighlight, externalScrollLeft, onFastME, panelLinks,
  highlightedSequenceId, setHighlightedSequenceId,
  hoveredPanelId, setHoveredPanelId, setPanelData, justLinkedPanels,
  linkBadges, onRestoreLink, colorForLink, onUnlink, onCreateSubsetMsa,onCreateColorMatrix,
  onPredictOmega,
  modelLoading,
}) {
  const msaData = useMemo(() => data.data, [data.data]);
  const filename = data.filename;
  const [isUiElementHovered, setIsUiElementHovered] = useState(false);
  const containerRef = useRef(null);
  const isVisible = useIsVisible(containerRef);

  const [viewportRef, viewportSize] = useElementSize({ debounceMs: 90 });
  const scrollContainerRef = useRef(null);

  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const [tooltipSite, setTooltipSite] = useState(null);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  const [ShowFastMEOptions, setShowFastMEOptions] = React.useState(false);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSequences, setSelectedSequences] = useState(new Set());

  const [labelWidth, setLabelWidth] = useState(data.labelWidth ?? LABEL_WIDTH);

  const [showReorderOptions, setShowReorderOptions] = useState(false);
  const reorderOptionsRef = useRef(null);
  const shuffleButtonWrapperRef = useRef(null);



   // Store original order of IDs if it doesn't exist yet
  useEffect(() => {
    if (data.data && !data.originalOrder) {
      const order = data.data.map(seq => seq.id);
      setPanelData(pd => ({
        ...pd,
        [id]: {
          ...pd[id],
          originalOrder: order
        }
      }));
    }
  }, [id, data.data, data.originalOrder, setPanelData]);

  const isOrderChanged = useMemo(() => {
    if (!data.originalOrder || !data.data) return false;
    if (data.originalOrder.length !== data.data.length) return true;
    for (let i = 0; i < data.data.length; i++) {
      if (data.data[i].id !== data.originalOrder[i]) {
        return true;
      }
    }
    return false;
  }, [data.data, data.originalOrder]);

  const restoreOriginalOrder = useCallback(() => {
    if (!data.originalOrder || !data.data) return;
    
    // Create a map for efficient lookup of the current sequence objects by their ID
    const currentDataMap = new Map(data.data.map(seq => [seq.id, seq]));
    
    // Rebuild the data array in the original order
    const restoredData = data.originalOrder
      .map(id => currentDataMap.get(id))
      .filter(Boolean); // Filter out any sequences that might have been deleted

    setPanelData(pd => ({
      ...pd,
      [id]: { ...pd[id], data: restoredData }
    }));
    setShowReorderOptions(false);
  }, [id, data.data, data.originalOrder, setPanelData]);

  const sortAlphabetically = useCallback(() => {
    const sortedData = [...data.data].sort((a, b) => a.id.localeCompare(b.id));
    setPanelData(pd => ({
      ...pd,
      [id]: { ...pd[id], data: sortedData }
    }));
    setShowReorderOptions(false);
  }, [id, data.data, setPanelData]);

  const reverseCurrentOrder = useCallback(() => {
    const reversedData = [...data.data].reverse();
    setPanelData(pd => ({
      ...pd,
      [id]: { ...pd[id], data: reversedData }
    }));
    setShowReorderOptions(false);
  }, [id, data.data, setPanelData]);

  useEffect(() => {
    if (!showReorderOptions) return;
    const closeOnEsc = (e) => {
      if (e.key === 'Escape') {
        setShowReorderOptions(false);
      }
    };
    const closeOnClickOutside = (e) => {
      if (
        reorderOptionsRef.current &&
        !reorderOptionsRef.current.contains(e.target) &&
        (!shuffleButtonWrapperRef.current || !shuffleButtonWrapperRef.current.contains(e.target))
      ) {
        setShowReorderOptions(false);
      }
    };
    document.addEventListener('keydown', closeOnEsc);
    document.addEventListener('mousedown', closeOnClickOutside);
    return () => {
      document.removeEventListener('keydown', closeOnEsc);
      document.removeEventListener('mousedown', closeOnClickOutside);
    };
  }, [showReorderOptions]);



  // --- Pre-calculation for Linking/Highlighting ---
  // Determine the active linked site once per render
  const finalLinkedSite = useMemo(() => {
    const linkedSiteFromData = data.linkedSiteHighlight;
    // data.highlightedSite is populated by handleHighlight for simple links
    return linkedSiteFromData ?? data.highlightedSite;
  }, [data.linkedSiteHighlight, data.highlightedSite]);

  // Determine if this panel should show linked highlights from others
  const isGlobalLinkActive = useMemo(() => {
      return Array.isArray(linkedTo) && hoveredPanelId !== id && linkedTo.includes(hoveredPanelId);
  }, [linkedTo, hoveredPanelId, id]);

  // Convert persistent highlights to a Set for O(1) lookup
  const persistentHighlightSet = useMemo(() => new Set(data.highlightedSites || []), [data.highlightedSites]);
  
  // Convert linked sequence name highlights to a Set for O(1) lookup
  const linkedHighlightsSet = useMemo(() => new Set(data.linkedHighlights || []), [data.linkedHighlights]);

  const dragRef = useRef();
  const isDraggingLabel = useRef(false);

  const handleDrag = (e) => {
    if (!isDraggingLabel.current) return;
    const delta = e.clientX - dragRef.current;
    dragRef.current = e.clientX;
    setLabelWidth(w => {
      const clamped = Math.max(40, Math.min(300, w + delta));
      setPanelData(prev => ({ ...prev, [id]: { ...prev[id], labelWidth: clamped } }));
      return clamped;
    });
  };

  const handleDragEnd = () => {
    isDraggingLabel.current = false;
    document.body.style.cursor = '';
    window.removeEventListener('mousemove', handleDrag);
    window.removeEventListener('mouseup', handleDragEnd);
  };

  const handleDragStart = (e) => {
    isDraggingLabel.current = true;
    dragRef.current = e.clientX;
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', handleDrag);
    window.addEventListener('mouseup', handleDragEnd);
  };


  const [searchRanges, setSearchRanges] = useState([]);
  const [searchActiveIdx, setSearchActiveIdx] = useState(0);
  const [searchHighlightPositions, setSearchHighlightPositions] = useState(new Set());

  useEffect(() => {
    if (showSearch) {
      setTimeout(() => {
        const el = searchInputRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(0, el.value.length);
      }, 0);
    }
  }, [showSearch]);

  const [hoveredCol, setHoveredCol] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [codonMode, setCodonModeState] = useState(data.codonMode || false);
  const [isSyncScrolling, setIsSyncScrolling] = useState(false);
  const isNuc = useMemo(() => isNucleotide(msaData), [msaData]);

  const [showDistOptions, setShowDistOptions] = useState(false);
  const distOptionsRef = useRef(null);
  const distButtonWrapperRef = useRef(null);

  useEffect(() => {
    if (!showDistOptions) return;
    const closeOnClickOutside = (e) => {
      if (
        distOptionsRef.current &&
        !distOptionsRef.current.contains(e.target) &&
        (!distButtonWrapperRef.current || !distButtonWrapperRef.current.contains(e.target))
      ) {
        setShowDistOptions(false);
      }
    };
    document.addEventListener('mousedown', closeOnClickOutside);
    return () => document.removeEventListener('mousedown', closeOnClickOutside);
  }, [showDistOptions]);


  const [fastMEOptions, setFastMEOptions] = useState({});

  const methodOptions = ['NJ', 'BIONJ','UNJ', 'TaxAdd_BalME', 'TaxAdd_OLSME'];
  const dnaModels = ['p-distance', 'RY', 'JC69', 'K2P', 'F81', 'F84', 'TN93', 'LogDet'];
  const proteinModels = ['p-distance','F81', 'LG', 'WAG', 'JTT', 'Dayhoff', 'DCMut', 'CpRev', 'MtREV', 'RtREV', 'HIVb', 'HIVw', 'FLU'];
  const availableModels = isNuc ? dnaModels : proteinModels;

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (e.target instanceof Element && e.target.closest('.upload-btn-trigger')) {
        setHoveredCol(null); setHoveredRow(null);
        if (id === highlightOrigin) onHighlight(null, id);
      }
    };
    document.addEventListener('mousemove', handleGlobalMouseMove);
    return () => document.removeEventListener('mousemove', handleGlobalMouseMove);
  }, [id, highlightOrigin, onHighlight]);

  const handleTreeClick = React.useCallback(() => {
      if (!msaData || msaData.length  < 4) { alert('At least 4 sequences are required.'); return; }
      
      const isProtein = !isNuc;
      setFastMEOptions(prev => ({
          ...prev,
          model: isProtein ? 'LG' : 'F84',
          method: 'BIONJ',
          spr: false,
          nni: false,
          gamma: '',
          bootstrap: 0
      }));
      
      setShowFastMEOptions(true);
  }, [msaData, isNuc]);

  const handleFastMESubmit = () => {
    onFastME(id, fastMEOptions);
    setShowFastMEOptions(false);
  };
  

  const handleDownload = useCallback(() => { mkDownload(baseName(data?.filename, 'alignment'), toFasta(data?.data || []), 'fasta')(); }, [data]);

  const rangesFromMask = useCallback((mask) => {
    const cols = Array.from(mask).sort((a, b) => a - b);
    if (cols.length === 0) return [];
    const out = []; let s = cols[0], prev = cols[0];
    for (let i = 1; i < cols.length; i++) {
      const c = cols[i];
      if (c === prev + 1) { prev = c; }
      else { out.push({ start: s, end: prev + 1 }); s = c; prev = c; }
    }
    out.push({ start: s, end: prev + 1 });
    return out;
  }, []);

  const centerColumn = useCallback((col) => {
    if (col == null || !scrollContainerRef.current) return;
    const scroller = scrollContainerRef.current;
    const itemWidth = codonMode ? 3 * CELL_SIZE : CELL_SIZE;
    const viewportWidth = scroller.clientWidth - labelWidth;

    const targetStart = col * itemWidth;
    const targetScroll = Math.max(0, targetStart - (viewportWidth / 2) + (itemWidth / 2));

    scroller.scrollTo({ left: targetScroll });
  }, [codonMode, labelWidth]);

  const finalHighlightedSite = data.linkedSiteHighlight ?? data.highlightedSite;

  const handleScrollEnd = useMemo(() => debounce(() => { setIsSyncScrolling(false); }, 1), []);
  const throttledHighlight = useMemo(() => throttle((col, originId) => onHighlight(col, originId), 90, { leading: true, trailing: true }), [onHighlight]);

const onScroll = useMemo(() => 
  throttle((e) => {
    // Check if the event target still exists
    if (!e?.currentTarget) return;
    
    const { scrollTop: newScrollTop, scrollLeft: newScrollLeft } = e.currentTarget;
    setScrollTop(newScrollTop);
    setScrollLeft(newScrollLeft);

    if (hoveredCol == null && hoveredRow != null) {
      setTooltipSite(null);
    }

    if (!isSyncScrolling && hoveredPanelId === id) {
      const gridRect = e.currentTarget.getBoundingClientRect();
      const mouseXRelative = lastMousePosRef.current.x - gridRect.left;
      const itemWidth = codonMode ? 3 * CELL_SIZE : CELL_SIZE;
      const currentColumn = Math.floor((newScrollLeft + mouseXRelative - labelWidth) / itemWidth);
      setTooltipSite(currentColumn);

      if (hoveredCol != null) {
        throttledHighlight(currentColumn, id);
      }
      const mouseYRelative = lastMousePosRef.current.y - gridRect.top;
      const RULER_HEIGHT = CELL_SIZE/Math.round(1.5);
      const currentRow = Math.floor((newScrollTop + mouseYRelative - RULER_HEIGHT) / CELL_SIZE);
      if (currentRow >= 0 && currentRow < msaData.length) {
        setHoveredRow(currentRow);
        if (Array.isArray(linkedTo) && linkedTo.length > 0 && setHighlightedSequenceId) {
          const seqId = msaData[currentRow]?.id;
          if (seqId) setHighlightedSequenceId(seqId);
        }
      }
    }
    handleScrollEnd();
  }, 8, { trailing: true }),
  [
    id, codonMode, handleScrollEnd, msaData, linkedTo,
    setHighlightedSequenceId, throttledHighlight, isSyncScrolling,
    hoveredPanelId, labelWidth, hoveredCol, hoveredRow,
  ]
);

  useEffect(() => {

      if (typeof externalScrollLeft !== 'number' || !scrollContainerRef.current) {
          return;
      }
      
      const scroller = scrollContainerRef.current;

      const itemWidth = codonMode ? 3 * CELL_SIZE : CELL_SIZE;
      const viewportWidth = scroller.clientWidth - labelWidth;
      const currentScrollLeft = scroller.scrollLeft;

      const MARGIN = 0;
      const padding = viewportWidth / 3;

      const targetStart = externalScrollLeft;
      const targetEnd = targetStart + itemWidth;

      let targetScroll = null;

      // Condition 1: The target is off the left side of the viewport (or inside the margin)
      if (targetStart < currentScrollLeft + MARGIN) {
          targetScroll = targetStart - padding;
      }
      // Condition 2: The target is off the right side of the viewport (or inside the margin)
      else if (targetEnd > currentScrollLeft + viewportWidth - MARGIN) {
          // Calculation: scroll to a position where the target's start is visible,
          // plus padding, adjusted for its own width.
          targetScroll = targetStart - viewportWidth + itemWidth + padding;
      }

      // Only perform the scroll if one of the conditions was met
      if (targetScroll !== null) {
          setIsSyncScrolling(true);

          // Ensure the calculated scroll position is within valid bounds
          const maxScroll = scroller.scrollWidth - scroller.clientWidth;
          const clampedScroll = Math.max(0, Math.min(targetScroll, maxScroll));

          scroller.scrollTo({
              left: clampedScroll,
          });
      }
  }, [externalScrollLeft, codonMode, labelWidth, viewportSize.width]);


  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const scroller = scrollContainerRef.current;
    const gridRect = scroller.getBoundingClientRect();
    const itemWidth = codonMode ? 3 * CELL_SIZE : CELL_SIZE;
    const RULER_HEIGHT = CELL_SIZE/Math.round(1.5);
    const gridVisibleHeight = gridRect.height - RULER_HEIGHT;

    let x, y;
    if (hoveredPanelId === id && tooltipSite != null) {
      // Local hover: use mouse position
      x = lastMousePosRef.current.x;
      y = lastMousePosRef.current.y;
    } else if (finalHighlightedSite != null && Number.isInteger(finalHighlightedSite) && finalHighlightedSite >= 0) {
      // External highlight: center tooltip on highlighted column
      x = gridRect.left + labelWidth + (finalHighlightedSite * itemWidth) - scroller.scrollLeft + (itemWidth / 2);
      y = gridRect.top + RULER_HEIGHT + (gridVisibleHeight / 2);
    } else {
      return;
    }
    setTooltipPos({ x, y });
  }, [finalHighlightedSite, codonMode, labelWidth, viewportSize, scrollLeft, hoveredCol, hoveredPanelId, tooltipSite]);

  const runSearch = useCallback(() => {
    if (!searchQuery?.trim() || !msaData || msaData.length === 0) return;
    const q = searchQuery.trim();
    const asInt = Number(q);
    setSearchRanges([]);
    setSearchActiveIdx(0);
    setSearchHighlightPositions(new Set());
    setPanelData(prev => ({ ...prev, [id]: { ...prev[id], searchHighlight: undefined } }));

    if (Number.isInteger(asInt) && String(asInt) === q) {
      const col = asInt - 1;
      if (col < 0 || col >= (msaData[0]?.sequence?.length || 0)) { alert('Index out of bounds'); return; }
      centerColumn(col);
      const newPositions = new Set();
      for (let i = 0; i < msaData.length; i++) {
          newPositions.add(`${i}-${col}`);
      }
      setSearchHighlightPositions(newPositions);
      setSearchRanges([{ start: col, end: col + 1 }]);
      setPanelData(prev => ({ ...prev, [id]: { ...prev[id], searchHighlight: { start: col, end: col + 1 } } }));
      return;
    }

    const motif = q.toUpperCase();
    const newPositions = new Set();
    const mask = new Set();
    msaData.forEach((row, r) => {
      const seq = row.sequence.toUpperCase();
      let idx = seq.indexOf(motif);
      while (idx >= 0) {
        for (let c = idx; c < idx + motif.length; c++) {
            newPositions.add(`${r}-${c}`);
            mask.add(c);
        }
        idx = seq.indexOf(motif, idx + 1);
      }
    });

    if (mask.size === 0) { alert('No match found.'); return; }
    const ranges = rangesFromMask(mask);
    setSearchHighlightPositions(newPositions);
    setSearchRanges(ranges);
    setSearchActiveIdx(0);
    centerColumn(ranges[0].start);
    setPanelData(prev => ({ ...prev, [id]: { ...prev[id], searchHighlight: ranges[0] } }));
  }, [searchQuery, msaData, id, setPanelData, centerColumn, rangesFromMask]);

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setSearchQuery('');
    setSearchRanges([]);
    setSearchActiveIdx(0);
    setSearchHighlightPositions(new Set());
    setPanelData(prev => ({ ...prev, [id]: { ...prev[id], searchHighlight: undefined } }));
  }, [id, setPanelData]);

  const setCodonMode = useCallback((val) => setCodonModeState(prev => {
    const next = typeof val === 'function' ? val(prev) : val;
    setPanelData(d => ({ ...d, [id]: { ...d[id], codonMode: next, highlightedSites: [] } }));
    return next;
  }), [id, setPanelData]);
  
  const handleToggleSelectionMode = useCallback(() => { if (isSelectionMode) setSelectedSequences(new Set()); setIsSelectionMode(prev => !prev); }, [isSelectionMode]);
  const handleGoClick = () => { if (selectedSequences.size === 0) return; onCreateSubsetMsa(id, Array.from(selectedSequences)); setIsSelectionMode(false); setSelectedSequences(new Set()); };
  const handleCancelSelection = () => { setIsSelectionMode(false); setSelectedSequences(new Set()); };
  const handleLabelClick = (index) => { if (!isSelectionMode) return; const sel = new Set(selectedSequences); if (sel.has(index)) sel.delete(index); else sel.add(index); setSelectedSequences(sel); };

  // Memoized extraButtons to prevent re-render loops.
  
  const extraButtons = useMemo(() => (
    isNuc ? [ 
        { element: <SearchButton onClick={() => { setShowSearch(s => !s); if (!showSearch) {setShowFastMEOptions(false); setIsSelectionMode(false); setSelectedSequences(new Set()); } }} />, tooltip: "Search site or motif" },
        { element: <CodonToggleButton onClick={() => setCodonMode(m => !m)} isActive={codonMode} />, tooltip: "Toggle codon mode" },
        { element: <TranslateButton onClick={() => onDuplicateTranslate(id)} />, tooltip: "Translate to amino acids" },
        { 
            element: <OmegaButton onClick={() => onPredictOmega(id)} disabled={modelLoading} />, 
            tooltip: modelLoading ? "Model is loading..." : <>Predict omega values <br /><span className={subtooltipClass}>Predict per-codon omega (dN/dS) values <br /> with DaNaiDeS (experimental)</span></> 
        },
        { element: <TreeButton onClick={() => { setIsSelectionMode(false); setShowSearch(false); handleTreeClick(); }} />, tooltip: <>Build phylogenetic tree <br /> <span className={subtooltipClass}>FastME</span></> },
        { element: <SeqlogoButton onClick={() => onCreateSeqLogo(id)} />, tooltip: "Create sequence logo" },
        { element: <SiteStatsButton onClick={() => onCreateSiteStatsHistogram(id)} />, tooltip: <>Compute {codonMode ? "per-codon" : "per-site"} statistics<br /><span className={subtooltipClass}>Conservation and gap fraction</span></> },
        { 
            element: (
                <div ref={distButtonWrapperRef}>
                    <DistanceMatrixButton onClick={() => setShowDistOptions(s => !s)} />
                </div>
            ), 
            tooltip: "Build distance matrix"
        },
        { element: <RadialToggleButton onClick={() => onCreateColorMatrix(id)} />, tooltip: "Create alignment color matrix"},
        { element: <SubMSAButton onClick={() => { setShowSearch(false); handleToggleSelectionMode(); }} isActive={isSelectionMode} />, tooltip : <> Extract sequences <br /> <span className={subtooltipClass}>Choose a subset to create a new panel </span> </> },
        { element: <div ref={shuffleButtonWrapperRef}><ShuffleButton onClick={() => setShowReorderOptions(s => !s)} /></div>, tooltip: "Reorder sequences" },
        { element: <DownloadButton onClick={handleDownload} />, tooltip: "Download alignment" }
    ] : [
        { element: <SearchButton onClick={() => { setShowSearch(s => !s); if (!showSearch) {setShowFastMEOptions(false); setIsSelectionMode(false); setSelectedSequences(new Set()); } }} />, tooltip: "Search site or motif" },
        { element: <TreeButton onClick={() => { setIsSelectionMode(false); setShowSearch(false); handleTreeClick(); }} />, tooltip: <>Build phylogenetic tree <br /> <span className={subtooltipClass}>FastME</span></> },
        { element: <SeqlogoButton onClick={() => onCreateSeqLogo(id)} />, tooltip: "Create sequence logo" },
        { element: <SiteStatsButton onClick={() => onCreateSiteStatsHistogram(id)} />, tooltip: <>Compute {codonMode ? "per-codon" : "per-site"} statistics<br /><span className={subtooltipClass}>Conservation and gap fraction</span></> },
        { 
            element: (
                <div ref={distButtonWrapperRef}>
                    <DistanceMatrixButton onClick={() => setShowDistOptions(s => !s)} />
                </div>
            ), 
            tooltip: "Build distance matrix" 
        },
        { element: <RadialToggleButton onClick={() => onCreateColorMatrix(id)} />, tooltip: "Create alignment color matrix"},
        { element: <SubMSAButton onClick={() => { setShowSearch(false); handleToggleSelectionMode(); }} isActive={isSelectionMode} />, tooltip : <> Extract sequences <br /> <span className={subtooltipClass}>Choose a subset to create a new panel </span> </> },
        { element: <div ref={shuffleButtonWrapperRef}><ShuffleButton onClick={() => setShowReorderOptions(s => !s)} /></div>, tooltip: "Reorder sequences" },
        { element: <DownloadButton onClick={handleDownload} />, tooltip: "Download alignment" },
        
    ]
  ), [isNuc, id, codonMode, isSelectionMode, handleTreeClick, setCodonMode, onDuplicateTranslate, onCreateSeqLogo, onCreateSiteStatsHistogram,
     onGenerateDistance, handleToggleSelectionMode, handleDownload, onCreateColorMatrix,onPredictOmega, modelLoading]);

  useEffect(() => { if (data.codonMode !== codonMode) setCodonModeState(data.codonMode || false); }, [data.codonMode, codonMode]);
  useEffect(() => {
      const clear = () => {
        setHoveredCol(null);
        setHoveredRow(null);
        setTooltipSite(null);
        
        setHighlightedSequenceId(null);
        if (id === highlightOrigin) onHighlight(null, id);
      };

      // Clear all the local hover state when the globally hovered panel is not this one (and not a panel linked to this one),
      if (hoveredPanelId !== id && !(Array.isArray(linkedTo) && linkedTo.includes(hoveredPanelId))) {
        clear();
      }
    }, [hoveredPanelId, id, linkedTo, highlightOrigin, onHighlight, setHighlightedSequenceId]);

  const rowCount = msaData.length;
  const colCount = msaData[0]?.sequence.length || 0;
  const totalGridWidth = colCount * CELL_SIZE;
  const totalGridHeight = rowCount * CELL_SIZE;
  const RULER_HEIGHT = CELL_SIZE/Math.round(1.5);

  const pickCellFromEvent = useCallback((e) => {
    const el = e.target.closest('[data-cell="1"]');
    if (!el) return null;
    return { rowIndex: Number(el.dataset.row), columnIndex: Number(el.dataset.col) };
  }, []);

const handleGridMouseMove = useMemo(() => 
  throttle((e) => {
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    const hit = pickCellFromEvent(e);
    if (!hit || Number.isNaN(hit.rowIndex)) return;

    const { rowIndex, columnIndex } = hit;
    const idx = codonMode ? Math.floor(columnIndex / 3) : columnIndex;
    
    // Batch state updates
    setHoveredRow(rowIndex); 
    setHoveredCol(idx); 
    setTooltipSite(idx);
    setTooltipPos({ x: e.clientX, y: e.clientY });
    
    throttledHighlight(idx, id);
    
    if (Array.isArray(linkedTo) && linkedTo.length > 0 && setHighlightedSequenceId) {
      setHighlightedSequenceId(msaData[rowIndex]?.id);
    }
  }, 16, { leading: true, trailing: true }), // ~60fps throttling
  [pickCellFromEvent, codonMode, throttledHighlight, id, linkedTo, setHighlightedSequenceId, msaData]
);

  const handleGridMouseLeave = useCallback(() => {
    throttledHighlight.cancel(); setHoveredCol(null); setHoveredRow(null);
    setTooltipSite(null);
    if (id === highlightOrigin) onHighlight(null, id);
  }, [throttledHighlight, id, highlightOrigin, onHighlight, linkedTo, setHighlightedSequenceId]);

  const handleGridClick = useCallback((e) => {
    const hit = pickCellFromEvent(e);
    if (!hit || Number.isNaN(hit.rowIndex)) return;
    const idx = codonMode ? Math.floor(hit.columnIndex / 3) : hit.columnIndex;
    setPanelData(prev => {
      const h = prev[id]?.highlightedSites || [];
      const updated = h.includes(idx) ? h.filter(i => i !== idx) : [...h, idx];
      return { ...prev, [id]: { ...prev[id], highlightedSites: updated } };
    });
  }, [codonMode, id, setPanelData, pickCellFromEvent]);

  const sequenceLabels = useMemo(() => msaData.map((seq, index) => ({ index, rawId: seq.id.replace(/\s+/g, ' ').trim(), id: seq.id })), [msaData]);

  useEffect(() => () => { throttledHighlight.cancel(); handleScrollEnd.cancel(); }, [throttledHighlight, handleScrollEnd]);

  // Optimization: Get the boundaries object from the hook
  const { firstRow, lastRow, firstCol, lastCol } = useVirtualization(
      scrollTop,
      scrollLeft,
      viewportSize.width - labelWidth,
      viewportSize.height - RULER_HEIGHT,
      rowCount,
      colCount,
      CELL_SIZE,
      CELL_SIZE
  );

  // Optimization: Create lightweight arrays of indices to map over in JSX
  const rowIndices = useMemo(() => Array.from({ length: lastRow - firstRow }, (_, i) => firstRow + i), [firstRow, lastRow]);
  const colIndices = useMemo(() => Array.from({ length: lastCol - firstCol }, (_, i) => firstCol + i), [firstCol, lastCol]);

  return (
    <PanelContainer 
    id={id}
    linkedTo={linkedTo}
    panelLinks={panelLinks}
    hoveredPanelId={hoveredPanelId}
    setHoveredPanelId={setHoveredPanelId}
    isEligibleLinkTarget={isEligibleLinkTarget}
    justLinkedPanels={justLinkedPanels}>
      <div ref={containerRef} className="relative flex flex-col h-full rounded-xl bg-white overflow-hidden">
        {/* Panel Header and UI Buttons */}
        <div onMouseEnter={() => setIsUiElementHovered(true)} onMouseLeave={() => setIsUiElementHovered(false)}>
            <PanelHeader
            id={id}
            filename={filename} 
            setPanelData={setPanelData} 
            forceHideTooltip={showSearch || isSelectionMode || showReorderOptions || ShowFastMEOptions || showDistOptions} 
            extraButtons={extraButtons}
            onDuplicate={onDuplicate}
            onLinkClick={onLinkClick} 
            isLinkModeActive={isLinkModeActive} 
            isEligibleLinkTarget={isEligibleLinkTarget} 
            linkBadges={linkBadges} onRestoreLink={onRestoreLink} 
            onUnlink={onUnlink} 
            colorForLink={colorForLink} 
            onRemove={onRemove} />
        </div>

        {/* --- Overlays --- */}
        {showReorderOptions && (
          <div ref={reorderOptionsRef} className="absolute top-11 right-3 z-50 bg-white border border-gray-300 rounded-xl shadow px-1 py-1 flex flex-col items-stretch space-y-1"
          onMouseEnter={() => setIsUiElementHovered(true)} 
          onMouseLeave={() => setIsUiElementHovered(false)}>
            {isOrderChanged && (
              <button onClick={restoreOriginalOrder} className="text-sm text-left px-3 py-1 rounded-lg hover:bg-gray-200 whitespace-nowrap">
                Restore original order
              </button>
            )}
            <button onClick={sortAlphabetically} className="text-sm text-left px-3 py-1 rounded-lg hover:bg-gray-200 whitespace-nowrap">
              Alphabetical order
            </button>
            <button onClick={reverseCurrentOrder} className="text-sm text-left px-3 py-1 rounded-lg hover:bg-gray-200 whitespace-nowrap">
              Reverse order
            </button>
          </div>
        )}
        {ShowFastMEOptions && ( 
    <div className="absolute inset-0 z-[1000] bg-black/40 flex items-center justify-center rounded-2xl"
         onClick={() => setShowFastMEOptions(false)}> 
      <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full flex flex-col gap-4 text-sm"
           onClick={(e) => e.stopPropagation()}> 
        
        <h3 className="text-xl font-bold text-gray-800 border-b pb-2">FastME Options</h3>

        {/* --- Substitution Model --- */}
        <div className="flex flex-col gap-1">
            <label className="font-semibold text-gray-600">Substitution Model</label>
            <select 
                className="border rounded-md px-2 py-1 bg-gray-50"
                value={fastMEOptions.model}
                onChange={e => setFastMEOptions({...fastMEOptions, model: e.target.value})}
            >
                {(isNuc ? dnaModels : proteinModels).map(m => (
                    <option key={m} value={m}>{m}</option>
                ))}
            </select>
        </div>

        {/* --- Inference Method --- */}
        <div className="flex flex-col gap-1">
            <label className="font-semibold text-gray-600">Tree Inference Method</label>
            <select 
                className="border rounded-md px-2 py-1 bg-gray-50"
                value={fastMEOptions.method}
                onChange={e => setFastMEOptions({...fastMEOptions, method: e.target.value})}
            >
                {methodOptions.map(m => (
                    <option key={m} value={m}>{m}</option>
                ))}
            </select>
        </div>

        {/* --- Gamma Rate Variation --- */}
        <div className="flex flex-col gap-1">
            <label className="font-semibold text-gray-600">
                Gamma Parameter (Alpha)
                <span className="text-gray-400 font-normal ml-2 text-xs">(Empty = none)</span>
            </label>
            <input 
                type="number" 
                step="0.1" 
                min="0"
                placeholder="e.g. 1.0"
                className="border rounded-md px-2 py-1"
                value={fastMEOptions.gamma}
                onChange={e => setFastMEOptions({...fastMEOptions, gamma: e.target.value})}
            />
        </div>

        {/* --- Topology Search (Checkboxes) --- */}
        <div className="flex flex-col gap-1">
            <label className="font-semibold text-gray-600">Topology Optimization</label>
            <div className="flex gap-4 mt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={fastMEOptions.nni}
                        onChange={e => setFastMEOptions({...fastMEOptions, nni: e.target.checked})}
                    />
                    NNI
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={fastMEOptions.spr}
                        onChange={e => setFastMEOptions({...fastMEOptions, spr: e.target.checked})}
                    />
                    SPR
                </label>
            </div>
        </div>

        {/* --- Bootstrap --- */}
         <div className="flex flex-col gap-1">
            <label className="font-semibold text-gray-600">
                Bootstraps
                <span className="text-gray-400 font-normal ml-2 text-xs">(0 = none)</span>
            </label>
            <input 
                type="number" 
                step="1" 
                min="0"
                max="1000"
                className="border rounded-md px-2 py-1"
                value={fastMEOptions.bootstrap}
                onChange={e => setFastMEOptions({...fastMEOptions, bootstrap: e.target.value})}
            />
        </div>

        {/* --- Buttons --- */}
        <div className="flex justify-end gap-2 mt-2 pt-3 border-t">
            <button 
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                onClick={() => setShowFastMEOptions(false)}
            >
                Cancel
            </button>
            <button 
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-semibold shadow-md"
                onClick={handleFastMESubmit}
            >
                Build Tree
            </button>
        </div>

      </div> 
    </div>
    )}
    {/* Distance matrix options */}
        {showDistOptions && (
        <div 
            ref={distOptionsRef}
            className="absolute top-11 right-3 z-50 bg-white border border-gray-300 rounded-xl shadow px-1 py-1 flex flex-col items-stretch space-y-1"
            onMouseEnter={() => setIsUiElementHovered(true)} 
            onMouseLeave={() => setIsUiElementHovered(false)}
            style={{ maxHeight: '60vh', overflowY: 'auto' }} // Safety for many protein models
        >
          {/* Normalized Hamming */}
          <button 
            onClick={() => { onGenerateDistance(id); setShowDistOptions(false); }} 
            className="text-sm text-left px-3 py-1 rounded-lg hover:bg-gray-200 whitespace-nowrap font-semibold border-b border-gray-100"
          >
            Normalized Hamming
          </button>

          {/* Header for FastME */}
          <div className="px-3 py-1 text-xs text-gray-400 font-bold uppercase tracking-wider">
            FastME Models
          </div>

          {/* FastME Options */}
          {availableModels.map(model => (
            <button 
                key={model}
                onClick={() => { onGenerateFastMEDistance(id, model); setShowDistOptions(false); }} 
                className="text-sm text-left px-3 py-1 rounded-lg hover:bg-gray-200 whitespace-nowrap"
            >
                {model}
            </button>
          ))}
        </div>
      )}

        {showSearch && (
        <div className="absolute right-3 top-10 z-[1100] bg-white border rounded-xl shadow p-2 flex items-center gap-2" 
        onMouseEnter={() => setIsUiElementHovered(true)} 
        onMouseLeave={() => setIsUiElementHovered(false)}> 
          <input ref={searchInputRef} 
          autoFocus 
          className="border rounded-md px-2 py-1 w-32" 
          placeholder="e.g. 128 or ACTT" 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)} 
          onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); if (e.key === 'Escape') closeSearch(); }} /> 
             <button 
             className="px-2 py-0 rounded-md text-gray-700 bg-gray-300 hover:bg-gray-400 disabled:opacity-50 text-lg"
             onClick={() => { 
              if (!searchRanges.length) return;
               const next = (searchActiveIdx - 1 + searchRanges.length) % searchRanges.length;
              setSearchActiveIdx(next); 
              centerColumn(searchRanges[next].start); 
              setPanelData(prev => ({ ...prev, [id]: { ...prev[id], searchHighlight: searchRanges[next] }}));
             }}
             disabled={searchRanges.length < 2} 
             title="Previous hit">
              ‹
              </button>
              <button
              className="px-2 py-0 rounded-md text-gray-700 bg-gray-300 hover:bg-gray-400 disabled:opacity-50 text-lg" 
              onClick={() => {
                if (!searchRanges.length) return;
                const next = (searchActiveIdx + 1) % searchRanges.length;
                setSearchActiveIdx(next);
                centerColumn(searchRanges[next].start);
                setPanelData(prev => ({ ...prev, [id]: { ...prev[id], searchHighlight: searchRanges[next] }}));
              }} 
              disabled={searchRanges.length < 2} 
              title="Next hit">
                ›
              </button> 
              {searchRanges.length > 0 && (
                <span className="text-sm text-gray-600 w-12 text-center tabular-nums">{searchActiveIdx + 1}/{searchRanges.length}</span>
              )} <button className="px-2 py-1 text-gray-600 rounded-md bg-gray-200 hover:bg-red-300" 
              onClick={closeSearch} 
              title="Close search">✕</button> </div> )}
              {isSelectionMode && (
                <div className="absolute right-3 top-10 z-[1100] bg-white border rounded-xl shadow p-2 flex items-center gap-2"
                onMouseEnter={() => setIsUiElementHovered(true)} 
                onMouseLeave={() => setIsUiElementHovered(false)}> 
                <input type="text" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} 
                autoFocus 
                onKeyDown={(e) => { if (e.key === 'Enter') handleGoClick(); if (e.key === 'Escape') handleCancelSelection(); }} 
                tabIndex={-1} 
                /> 
                <span className="text-sm text-gray-700 px-2">
                  Click sequence labels to select or deselect them<br /><strong>{selectedSequences.size}/{msaData.length} selected</strong>
                </span>
                <button className="px-2 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-red-300" 
                onClick={handleCancelSelection}>
                  Cancel
                </button> 
                <button className="px-2 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50" 
                onClick={handleGoClick} 
                disabled={selectedSequences.size === 0}>
                  Go
                  </button> 
                  </div> )}
        
        {/* --- Unified Tooltip Logic --- */}
        {(() => {
          if (ShowFastMEOptions || isUiElementHovered || hoveredRow != null && hoveredCol == null) return null;
          const isLocalHover = tooltipSite != null && hoveredPanelId === id;
          const isExternalHighlight = (finalHighlightedSite != null && Number.isInteger(finalHighlightedSite) && finalHighlightedSite >= 0);
          if (!isVisible || (!isLocalHover && !isExternalHighlight)) return null;
          const siteToDisplay = isLocalHover ? tooltipSite : finalHighlightedSite;
          const siteLabel = codonMode ? `Codon ${siteToDisplay + 1}` : `Site ${siteToDisplay + 1}`;
          const panelBoundary = scrollContainerRef.current?.getBoundingClientRect();
          return (
            <MSATooltip x={tooltipPos.x} y={tooltipPos.y} boundary={panelBoundary}>
              <div className="flex flex-col items-center">
                <span className="font-bold">{siteLabel}</span>
                {isLocalHover && hoveredRow != null && msaData[hoveredRow] && (
                  <span className="text-gray-700 font-mono text-sm">{msaData[hoveredRow].id}</span>
                )}
              </div>
            </MSATooltip>
          );
        })()}
        
        {/* --- Main Alignment Grid --- */}
        <div ref={viewportRef} className="flex-1 flex flex-col overflow-hidden font-mono text-sm">
            <div ref={scrollContainerRef} className="w-full h-full overflow-auto" onScroll={onScroll}>
                <div
                  className="relative"
                  style={{ width: totalGridWidth + labelWidth, height: totalGridHeight + RULER_HEIGHT }}
                  onMouseMove={handleGridMouseMove}
                  onClick={handleGridClick}
                  onPointerLeave={handleGridMouseLeave}
                >
                 {/* Top Row: Sticky Corner + Sticky Ruler */}
                 <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 6 }}>
                   <div style={{ left: 0, width: labelWidth, height: RULER_HEIGHT, background: 'white', zIndex: 6, }}>
                     <div className="w-full h-full"/>
                   </div>
                   <div style={{ left: 0, width: totalGridWidth, height: RULER_HEIGHT, background: 'white', zIndex: 3, display: 'flex', position: 'relative',marginTop:-1 }}>
                  <div className="relative w-full h-full ">
                    {useMemo(() => 
                      colIndices.map((columnIndex) => {
                        const p = columnIndex + 1;
                        const showNum = p % 10 === 0 || p === 1 || p === colCount;
                        const showTick = p % 5 === 0 && !showNum;
                        if (!showNum && !showTick) return null;
                        
                        return (
                          <div key={columnIndex}
                              className="absolute flex items-center justify-center text-xs text-gray-600"
                              style={{ left: columnIndex * CELL_SIZE, width: CELL_SIZE, height: RULER_HEIGHT }}>
                            {showNum ? p : '·'}
                          </div>
                        );
                      }), 
                      [colIndices, colCount, CELL_SIZE]
                    )}
                  </div>
                   </div>
                 </div>
                 {/* --- Unified Sticky Left Column (Labels + Drag Handle) --- */}
                 <div style={{ position: 'sticky', top: RULER_HEIGHT, left: 0, width: labelWidth, height: totalGridHeight+4, zIndex: 5 }}>
                    <div style={{ width: '100%', height: '100%', background: 'white', position: 'relative' }}>
                      <div className="relative w-full h-full ">
                      {rowIndices.map((rowIndex) => {
                          const { rawId, id: seqId } = sequenceLabels[rowIndex];
                          
                          // Use the pre-calculated Set for an O(1) check
                          const isNameHighlight = (hoveredRow === rowIndex) || 
                                                  (highlightedSequenceId === seqId && Array.isArray(linkedTo) && linkedTo.includes(hoveredPanelId)) || 
                                                  linkedHighlightsSet.has(seqId);
                          const isSelected = selectedSequences.has(rowIndex);
                          
                          const maxChars = Math.floor((labelWidth - 12) / 8);
                          const displayId = rawId.length > maxChars ? rawId.slice(0, maxChars - 2) + '..' : rawId;
                          
                          return ( 
                              <div key={rowIndex} 
                                // Position each label absolutely within the container
                                style={{ position:'absolute', transform: `translateY(${rowIndex * CELL_SIZE}px) scaleY(1.01)`, left:0, width: '100%', height: CELL_SIZE, lineHeight: `${CELL_SIZE}px` }} 
                                className={`flex items-center text-right font-bold truncate ${isNameHighlight ? 'bg-yellow-100' : ''} ${isSelectionMode ? 'cursor-pointer hover:bg-gray-100' : ''} ${isSelected ? '!bg-blue-200' : ''}`} 
                                title={rawId} 
                                onClick={() => handleLabelClick(rowIndex)} 
                                onMouseEnter={() => { setHoveredRow(rowIndex); setHoveredCol(null); if (id === highlightOrigin) onHighlight(null, id); if (setHighlightedSequenceId) { setHighlightedSequenceId(seqId); } }} 
                              >
                                  <span className="block pl-2">{displayId}</span>
                              </div> 
                          );
                      })}
                  </div>
                    </div>
                    <div style={{ position: 'absolute', top: 0, right: 0, width: 8, height: '100%', cursor: 'col-resize', zIndex: 10, background: 'rgba(0, 0, 0, 0.02)' }} onMouseDown={handleDragStart} />
                  </div>

                    {/* Optimization: Virtualized Grid of Cells using nested maps */}
                    <div className="grid-container" style={{ position: 'absolute', top: RULER_HEIGHT, left: labelWidth, height: totalGridHeight, width: totalGridWidth, marginTop:0 }}>
                    {useMemo(() => {
                      const cells = [];
                      const cellStyleBase = { height: CELL_SIZE, width: CELL_SIZE };
                      
                      for (let rowIndex of rowIndices) {
                        const rowSequence = msaData[rowIndex].sequence;
                        
                        for (let columnIndex of colIndices) {
                          const char = rowSequence[columnIndex];
                          const idx = codonMode ? Math.floor(columnIndex / 3) : columnIndex;

                          // O(1) Checks using pre-computed data
                          const isPersistentHighlight = persistentHighlightSet.has(idx);
                          const isSearchHighlight = searchHighlightPositions.has(`${rowIndex}-${columnIndex}`);
                          const isHoverHighlight = hoveredCol === idx;

                          // Optimized Link Highlight Logic
                          let isLinkedHighlight = false;
                          if (finalLinkedSite !== null) {
                            const matchesSite = codonMode ? idx === finalLinkedSite : columnIndex === finalLinkedSite;
                            if (matchesSite && (data.linkedSiteHighlight != null || isGlobalLinkActive)) {
                              isLinkedHighlight = true;
                            }
                          }
                          
                          // Create style object once per cell
                          const style = { 
                            ...cellStyleBase,
                            position: 'absolute', 
                            top: rowIndex * CELL_SIZE, 
                            left: columnIndex * CELL_SIZE,
                          };

                          cells.push(
                            <MSACell 
                              key={`${rowIndex}-${columnIndex}`} 
                              columnIndex={columnIndex}
                              rowIndex={rowIndex}
                              style={style}
                              char={char}
                              isHoverHighlight={isHoverHighlight}
                              isLinkedHighlight={isLinkedHighlight}
                              isPersistentHighlight={isPersistentHighlight}
                              isSearchHighlight={isSearchHighlight}
                            />
                          );
                        }
                      }
                      return cells;
                    }, [
                      rowIndices, colIndices, msaData, codonMode, persistentHighlightSet, 
                      searchHighlightPositions, hoveredCol, finalLinkedSite, 
                      data.linkedSiteHighlight, isGlobalLinkActive, CELL_SIZE
                    ])}
                  </div>
                </div>
            </div>
        </div>
      </div>
    </PanelContainer>
  );
});


const TreePanel = React.memo(function TreePanel({
  id, data, onRemove, onDuplicate, onGenerateDistance,
  highlightedSequenceId, onHoverTip, panelLinks,
  linkedTo,
  onLinkClick, isLinkModeActive,isEligibleLinkTarget,hoveredPanelId,
  setHoveredPanelId, setPanelData,justLinkedPanels,
  linkBadges, onRestoreLink, colorForLink, onUnlink, onCreateTreeStats, onCreateSubtree,
}) {
  const { filename, isNhx, RadialMode= true, drawBranchLengths=false, pruneMode = false } = data || {};
  const [extractMode, setExtractMode] = useState(false);
  const [selectedLeaves, setSelectedLeaves] = useState(new Set());
  const treeContainerRef = useRef(null);

  const [totalLeaves, setTotalLeaves] = useState(0);

  const handleRadialToggle = useCallback(() => {
    setPanelData(pd => ({
      ...pd,
      [id]: {
        ...pd[id],
        RadialMode: !RadialMode
      }
    }));
  }, [id, setPanelData, RadialMode]);

  const handleBranchLengthsToggle = useCallback(() => {
    setPanelData(pd => ({
      ...pd,
      [id]: {
        ...pd[id],
        drawBranchLengths: !drawBranchLengths
      }
    }));
  }, [id, setPanelData, drawBranchLengths]);

  const handlePruneToggle = useCallback(() => {
    setPanelData(pd => ({
      ...pd,
      [id]: {
        ...pd[id],
        pruneMode: !pruneMode
      }
    }));
  }, [id, setPanelData, pruneMode]);

  const handleDownload = useCallback(() => {
    const text = data?.data || '';
    const base = baseName(data?.filename, 'tree');
    const ext  = data?.isNhx ? 'nhx' : 'nwk';
    mkDownload(base, text, ext)();
  }, [data]);

  const handleDownloadPNG = useCallback(() => {
    const svgEl = treeContainerRef.current?.querySelector('svg');
    if (!svgEl) {
      alert('Could not find the tree SVG to download.');
      return;
    }

    const { width, height } = svgEl.getBoundingClientRect();
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgEl);

    // Add a white background by wrapping the SVG content in a new SVG with a rect
    source = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
                <rect width="100%" height="100%" fill="white"></rect>
                ${svgEl.innerHTML}
              </svg>`;

    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const dpr = 5;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.drawImage(img, 0, 0);

      const pngUrl = canvas.toDataURL('image/png');
      const base = baseName(data?.filename, 'tree_figure');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `${base}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
        alert("Failed to convert tree to PNG.");
        URL.revokeObjectURL(url);
    }
    img.src = url;
  }, [data?.filename]);

  const handleExtractToggle = useCallback(() => {
    if (extractMode) {
        setSelectedLeaves(new Set());
    }
    setExtractMode(prev => !prev);
  }, [extractMode]);

  const handleGoClick = () => {
    if (selectedLeaves.size === 0) return;
    onCreateSubtree(id, selectedLeaves);
    setExtractMode(false);
    setSelectedLeaves(new Set());
  };

  const handleCancelSelection = () => {
    setExtractMode(false);
    setSelectedLeaves(new Set());
  };

  const handleLeafSelect = useCallback((node) => {
    if (!extractMode) return;

    const newSelection = new Set(selectedLeaves);

    // Check if the clicked node is an internal node or a leaf.
    if (!node.children || node.children.length === 0) {
        // It's a leaf node. Toggle its selection status as before.
        const leafName = node.data.name;
        if (newSelection.has(leafName)) {
            newSelection.delete(leafName);
        } else {
            newSelection.add(leafName);
        }
    } else {
        // It's an internal node. Get all its descendant leaves.
        const descendantLeaves = node.leaves().map(leaf => leaf.data.name);

        // Iterate through each descendant and invert its individual selection status.
        descendantLeaves.forEach(leafName => {
            if (newSelection.has(leafName)) {
                newSelection.delete(leafName);
            } else {
                newSelection.add(leafName);
            }
        });
    }
    setSelectedLeaves(newSelection);
  }, [extractMode, selectedLeaves]);
  
  // Memoize extraButtons to prevent re-render loops.
  const extraButtons = useMemo(() => [
    { element: <BranchLengthsButton onClick={handleBranchLengthsToggle} isActive={drawBranchLengths} />, tooltip: !drawBranchLengths ? "Draw using branch lengths" : "Draw ignoring branch lengths" },
    { element: <RadialToggleButton onClick={handleRadialToggle} isActive={RadialMode}  />,
     tooltip: RadialMode ? "Switch to rectangular view" : "Switch to radial view" },
    { 
      element: <SiteStatsButton onClick={() => onCreateTreeStats(id)} />,
      tooltip: (
        <>
          Compute leaf statistics<br />
          <span className={subtooltipClass}>Distance to root and average distance to others</span>
        </>
      )
    },
    { element: <DistanceMatrixButton   onClick={() => onGenerateDistance(id)}  />,
     tooltip: (
      <>
      Build distance matrix <br />
      <span className={subtooltipClass}>Patristic distance</span>
      </>
     )
    },
    { element: <PruneButton onClick={handlePruneToggle} isActive={pruneMode} />, tooltip: pruneMode ? "Exit prune mode" : 
      (
        <>Prune tree <br /> <span className={subtooltipClass}>Remove branches and their descendants</span></>
      )
    },
    {
      element: <TreeButton onClick={handleExtractToggle} isActive={extractMode} />,
      tooltip: <>Extract subtree<br /><span className={subtooltipClass}>Choose a subset of leaves to create a new tree</span></>
    },
    { element: <PictureButton onClick={handleDownloadPNG} />, 
      tooltip: "Download image (.png)" },
    { element: <DownloadButton onClick={handleDownload} />,
     tooltip: "Download tree" }
  ], [id, drawBranchLengths, RadialMode, pruneMode, extractMode, handleBranchLengthsToggle, handleRadialToggle, onCreateTreeStats, onGenerateDistance, handlePruneToggle, handleDownload, handleDownloadPNG, handleExtractToggle]);

  // Dynamic version of the panel data.
  // This lets us merge stored highlights (from clicks) with live highlights (from hovers).
  const dynamicPanelData = useMemo(() => {
    const baseHighlights = data.highlightedNodes || [];
    const isHoverActive = hoveredPanelId === id || (Array.isArray(linkedTo) && linkedTo.includes(hoveredPanelId));

    // Add the sequence ID from a linked panel if hover is active
    const finalHighlightedNodes = isHoverActive && highlightedSequenceId
      ? [...new Set([...baseHighlights, highlightedSequenceId])] // Use a Set to prevent duplicates
      : baseHighlights;

    // Return a new object that includes the dynamic highlights
    return {
      ...data,
      highlightedNodes: finalHighlightedNodes,
    };
  }, [data, highlightedSequenceId, hoveredPanelId, id, linkedTo]);

  return (
    <PanelContainer
    id={id}
    linkedTo={linkedTo}
    hoveredPanelId={hoveredPanelId}
    setHoveredPanelId={setHoveredPanelId}
    panelLinks={panelLinks}
    isEligibleLinkTarget={isEligibleLinkTarget}
    justLinkedPanels={justLinkedPanels}
    >
      <PanelHeader
      id={id}
      prefix=""
      filename={filename}
      setPanelData={setPanelData}
      onDuplicate={onDuplicate}
      onLinkClick={onLinkClick}
      isEligibleLinkTarget={isEligibleLinkTarget}
      isLinkModeActive={isLinkModeActive}
      extraButtons={extraButtons}
      forceHideTooltip={extractMode} 
      linkBadges={linkBadges}
      onRestoreLink={onRestoreLink}
      onUnlink={onUnlink}
      colorForLink={colorForLink}
      onRemove={onRemove}
      />
      {extractMode && (
          <div className="absolute right-3 top-10 z-[1100] bg-white border rounded-xl shadow p-2 flex items-center gap-2">
              <span className="text-sm text-gray-700 px-2">
                  Click nodes to select or deselect all its children<br /><strong>{selectedLeaves.size}/{totalLeaves} leaves selected</strong>
              </span>
              <button className="px-2 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-red-300"
                  onClick={handleCancelSelection}>
                  Cancel
              </button>
              <button className="px-2 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  onClick={handleGoClick}
                  disabled={selectedLeaves.size === 0}>
                  Go
              </button>
          </div>
      )}
      <div ref={treeContainerRef} className="w-full h-full flex-1 overflow-auto flex items-center justify-center">
          <PhyloTreeViewer
            // Pass the entire data object. It contains the newick string,
            // saved settings, and the dynamically calculated highlights.
            panelData={dynamicPanelData}

            id={id}
            setPanelData={setPanelData}
            onHoverTip={onHoverTip}
            linkedTo={linkedTo}
            toNewick={toNewick}
            
            isNhx={isNhx}
            radial={RadialMode}
            useBranchLengths={drawBranchLengths}
            pruneMode={pruneMode}
            extractMode={extractMode}
            onLeafSelect={handleLeafSelect}
            selectedLeaves={selectedLeaves}
            onCountLeaves={setTotalLeaves}

            // This prop is also dynamic and used for a different highlight effect
            linkedHighlights={
              (hoveredPanelId === id || (Array.isArray(linkedTo) && linkedTo.includes(hoveredPanelId)))
                ? (data.linkedHighlights ? [...data.linkedHighlights, highlightedSequenceId] : [highlightedSequenceId])
                : (data.linkedHighlights || [])
            }
          />
      </div>
    </PanelContainer>
  );
});

const ImagePanel = React.memo(function ImagePanel({
  id, data, onRemove, onDuplicate, hoveredPanelId, panelLinks,
  setHoveredPanelId, setPanelData,isEligibleLinkTarget, justLinkedPanels,
}) {

  const handleDownload = useCallback(() => {
    if (!data?.src) return;
    const a = document.createElement('a');
    a.href = data.src;
    a.download = data.filename || 'image.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [data]);

  const extraButtons = useMemo(() => [
    { element: <DownloadButton onClick={handleDownload} />, tooltip: "Download png" }
  ], [handleDownload]);

  return (
    <PanelContainer
      id={id}
      hoveredPanelId={hoveredPanelId}
      setHoveredPanelId={setHoveredPanelId}
      isEligibleLinkTarget={isEligibleLinkTarget}
      panelLinks={panelLinks}
      justLinkedPanels={justLinkedPanels}
    >
      <PanelHeader
        id={id}
        filename={data.filename || "Image"}
        setPanelData={setPanelData}
        onDuplicate={onDuplicate}
        onRemove={onRemove}
        extraButtons={extraButtons}
      />
      <div className="flex-1 p-2 flex items-center justify-center overflow-hidden">
        {data.src ? (
          <img src={data.src} alt={data.filename} className="max-w-full max-h-full object-contain" />
        ) : (
          <div className="text-gray-400">No image loaded.</div>
        )}
      </div>
    </PanelContainer>
  );
});

const NotepadPanel = React.memo(function NotepadPanel({
  id, data, onRemove, onDuplicate, hoveredPanelId, panelLinks,
  setHoveredPanelId, setPanelData,isEligibleLinkTarget, justLinkedPanels,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const textInputRef = useRef(null);
  const renderedViewRef = useRef(null);
  const scrollRatioRef = useRef(0);

  const { filename = "Notes", text = "", markdownMode = false } = data;

  const handleDownload = useCallback(() => {
    const fileExtension = markdownMode ? 'md' : 'txt';
    const base = baseName(filename, `notes`);
    mkDownload(base, text || '', fileExtension)();
  }, [filename, text, markdownMode]);

  const handleToggleMarkdown = useCallback(() => {
    setPanelData(prev => ({ ...prev, [id]: { ...prev[id], markdownMode: !markdownMode } }));
    setIsEditing(false);
  }, [id, setPanelData, markdownMode]);

  const extraButtons = useMemo(() => [
    { 
      element: (
        <MarkdownButton onClick={handleToggleMarkdown} isActive={markdownMode} />
      ),
      tooltip: markdownMode ? "Turn off Markdown rendering" : "Render as Markdown"
    },
    { 
      element: <DownloadButton onClick={handleDownload} />,
      tooltip: `Download ${markdownMode ? 'markdown (.md)' : 'text (.txt)'}` 
    }
  ], [handleDownload, handleToggleMarkdown, markdownMode]);

  const storeScrollRatio = (element) => {
    if (!element) return;
    const { scrollTop, scrollHeight, clientHeight } = element;
    const effectiveScrollHeight = scrollHeight - clientHeight;
    scrollRatioRef.current = effectiveScrollHeight > 0 ? scrollTop / effectiveScrollHeight : 0;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      storeScrollRatio(textInputRef.current);
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    storeScrollRatio(textInputRef.current);
    setIsEditing(false);
  };
  
  const handleDoubleClick = () => {
    storeScrollRatio(renderedViewRef.current);
    setIsEditing(true);
  };

  useLayoutEffect(() => {
    if (markdownMode) {
      if (isEditing && textInputRef.current) {
        const { scrollHeight, clientHeight } = textInputRef.current;
        textInputRef.current.scrollTop = scrollRatioRef.current * (scrollHeight - clientHeight);
        textInputRef.current.focus();
      } else if (!isEditing && renderedViewRef.current) {
        const { scrollHeight, clientHeight } = renderedViewRef.current;
        renderedViewRef.current.scrollTop = scrollRatioRef.current * (scrollHeight - clientHeight);
      }
    }
  }, [isEditing, markdownMode, text]);

  const renderContent = () => {
    if (!markdownMode) {
      return (
        <textarea
          className="w-full h-full p-2 border rounded-xl resize-none font-mono tracking-normal"
          value={text}
          onChange={e => setPanelData(prev => ({ ...prev, [id]: { ...prev[id], text: e.target.value } }))}
          placeholder="Write your notes here..."
          spellCheck={false} wrap="soft"
          style={{ minHeight: 120, tabSize: 2, fontVariantLigatures: 'none' }}
        />
      );
    }

    if (isEditing) {
      return (
        <textarea
          ref={textInputRef}
          className="w-full h-full p-2 border rounded-xl resize-none font-mono tracking-normal"
          value={text}
          onChange={e => setPanelData(prev => ({ ...prev, [id]: { ...prev[id], text: e.target.value } }))}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Write your markdown here..."
          spellCheck={false} wrap="soft"
          style={{ minHeight: 120, tabSize: 2, fontVariantLigatures: 'none' }}
        />
      );
    } else {
      return (
        <div
          ref={renderedViewRef}
          className="w-full h-full prose prose-sm max-w-none p-3 overflow-y-auto cursor-text select-text"
          onDoubleClick={handleDoubleClick}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            // Pass our custom schema to the sanitizer
            rehypePlugins={[rehypeRaw, rehypeKatex, [rehypeSanitize, sanitizeSchema]]}
          >
            {text || "*Empty note. Double-click to edit.*"}
          </ReactMarkdown>
        </div>
      );
    }
  };

  return (
    <PanelContainer
      id={id}
      hoveredPanelId={hoveredPanelId}
      setHoveredPanelId={setHoveredPanelId}
      isEligibleLinkTarget={isEligibleLinkTarget}
      panelLinks={panelLinks}
      justLinkedPanels={justLinkedPanels}
    >
      <PanelHeader
        id={id}
        prefix=""
        filename={filename}
        setPanelData={setPanelData}
        onDuplicate={onDuplicate}
        onRemove={onRemove}
        extraButtons={extraButtons}
      />
      <div className="flex-1 p-2 bg-white overflow-hidden">
        {renderContent()}
      </div>
    </PanelContainer>
  );
});

const HistogramPanel = React.memo(function HistogramPanel({ 
  id, data, onRemove, onDuplicate,
  onLinkClick, isLinkModeActive, isEligibleLinkTarget, linkedTo, panelLinks,
  highlightOrigin, onHighlight, hoveredPanelId, justLinkedPanels,
  setHoveredPanelId, setPanelData,
  linkBadges, onRestoreLink, colorForLink, onUnlink,
  onGenerateCorrelationMatrix
}) {
  const { filename, indexingMode = '1-based' } = data;
  const isTabular = !Array.isArray(data.data);
  
  // Get all available columns
  const availableCols = useMemo(() => {
    if (!isTabular) return [];
    return data.data.headers || [];
  }, [isTabular, data.data]);

  // Get numeric columns for Y-axis and correlation matrix
  const numericCols = useMemo(() => {
    if (!isTabular) return [];
    return data.data.headers.filter(h =>
      data.data.rows.every(row => typeof row[h] === 'number')
    );
  }, [isTabular, data]);

  const [selectedCol, setSelectedCol] = useState(
    isTabular
      ? (data.selectedCol || numericCols[0])
      : null
  );
  const [yLog, setYLog] = useState(Boolean(data?.yLog));
  const [tableViewMode, setTableViewMode] = useState(Boolean(data?.tableViewMode));
  
  useEffect(() => {
    setYLog(Boolean(data?.yLog));
    setTableViewMode(Boolean(data?.tableViewMode));
  }, [data?.yLog, data?.tableViewMode]);

  const [selectedXCol, setSelectedXCol] = useState(
    isTabular
      ? (data.selectedXCol || availableCols[0])
      : null
  );

  const handlePanelMouseLeave = useCallback(() => {
    setPanelData(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        highlightedSites: [],
      }
    }));
  }, [id, setPanelData]);

  const handleIndexingToggle = useCallback(() => {
    setPanelData(prev => {
      const currentMode = prev[id]?.indexingMode || '1-based';
      const newMode = currentMode === '1-based' ? '0-based' : '1-based';
      return {
        ...prev,
        [id]: { ...prev[id], indexingMode: newMode }
      };
    });
  }, [id, setPanelData]);

  const handleDownload = useCallback(() => {
    const base = baseName(filename, 'data');

    if (!Array.isArray(data.data)) {
      // tabular: headers + rows -> CSV
      const { headers, rows } = data.data;
      const csv = [
        headers.join(','),
        ...rows.map(r => headers.map(h => r[h]).join(','))
      ].join('\n');
      mkDownload(base, csv, 'csv', 'text/csv;charset=utf-8')();
    } else {
      // plain numeric list -> TXT
      const values = data.data || [];
      const txt = values.join('\n');
      mkDownload(base, txt, 'txt')();
    }
  }, [data, filename]);

  // Toggle between chart and table view
  const handleTableViewToggle = useCallback(() => {
    setPanelData(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        tableViewMode: !tableViewMode
      }
    }));
  }, [id, setPanelData, tableViewMode]);

  // Handle correlation matrix generation
  const handleCorrelationMatrix = useCallback(() => {
    if (!isTabular) {
      alert('Correlation matrix can only be computed for tabular data with multiple numeric columns');
      return;
    }
    
    try {
      onGenerateCorrelationMatrix(id);
    } catch (error) {
      alert(`Failed to compute correlation matrix: ${error.message}`);
    }
  }, [id, isTabular, onGenerateCorrelationMatrix]);
  
  const extraButtons = useMemo(() => [
    ...(!tableViewMode ? [{
        element: <LogYButton onClick={() => {
          setPanelData(prev => ({ ...prev, [id]: { ...prev[id], yLog: !yLog } }));
          setYLog(v => !v);
        }} isActive={yLog} />,
        tooltip: "Toggle log scale on the y axis"
    }] : []),
    {
        element: <TableChartButton 
          onClick={handleTableViewToggle} 
          isActive={tableViewMode}
        />,
        tooltip: tableViewMode ? "Switch to barchart view" : "Switch to table view"
    },
    {
        element: <ZeroOneButton onClick={handleIndexingToggle} isActive={indexingMode === '1-based'} />,
        tooltip: (
          <>
            Switch indexing base for linking
            <br />
            <span className={subtooltipClass}>Current: {indexingMode === '1-based' ? '1-based (site 1 is first)' : '0-based (site 0 is first)'}</span>
          </>
        )
    },
    ...(isTabular && numericCols.length >= 2 ? [{
        element: <DistanceMatrixButton onClick={handleCorrelationMatrix} />,
        tooltip: (
          <>
            Compute correlation matrix<br />
            <span className={subtooltipClass}>Pearson</span>
          </>
        )
    }] : []),
    { 
        element: <DownloadButton onClick={handleDownload} />,
        tooltip: "Download data" 
    }
  ], [tableViewMode, yLog, id, setPanelData, handleTableViewToggle, handleIndexingToggle, indexingMode, isTabular, numericCols, handleCorrelationMatrix, handleDownload]);

  useEffect(() => {
    if (isTabular) {
      setSelectedCol(
        data.selectedCol || numericCols[0]
      );
      setSelectedXCol(
        data.selectedXCol || availableCols[0]
      );
    }
  }, [isTabular, data.selectedCol, data.selectedXCol, data.data, numericCols, availableCols]);

  const valuesToPlot = useMemo(() => {
    if (isTabular && selectedCol) {
      return data.data.rows.map(row => row[selectedCol]);
    }
    if (!isTabular) {
      return data.data;
    }
    return [];
  }, [isTabular, selectedCol, data]);
  
  const xValues = useMemo(() => {
    if (isTabular && selectedXCol) {
      return data.data.rows.map(row => row[selectedXCol]);
    }
    if (isTabular) {
      return data.data.rows.map((_, i) => i + 1);
    }
    return data.xValues || data.data.map((_, i) => i + 1);
  }, [isTabular, selectedXCol, data]);
  
  const [chartContainerRef, { height: containerHeight }] = useElementSize({ debounceMs: 90 });

  return (
    <PanelContainer
      id={id}
      linkedTo={linkedTo}
      hoveredPanelId={hoveredPanelId}
      setHoveredPanelId={setHoveredPanelId}
      panelLinks={panelLinks} 
      isEligibleLinkTarget={isEligibleLinkTarget}
      justLinkedPanels={justLinkedPanels}
    >
      <PanelHeader
        id={id}
        prefix=""
        filename={filename}
        setPanelData={setPanelData}
        onDuplicate={onDuplicate}
        onLinkClick={onLinkClick}
        isLinkModeActive={isLinkModeActive}
        isEligibleLinkTarget={isEligibleLinkTarget}
        linkBadges={linkBadges}
        onRestoreLink={onRestoreLink}
        onUnlink={onUnlink}
        colorForLink={colorForLink}
        onRemove={onRemove}
        onMouseEnter={handlePanelMouseLeave}
        extraButtons={extraButtons}
      />
      
      {!tableViewMode && (
        <div className="p-2" >
          {isTabular && (
            <div className="flex items-center gap-4">
              <div>
                <label className="mr-2">X:</label>
                <select
                  value={selectedXCol ?? ''}
                  onChange={e => {
                    setSelectedXCol(e.target.value);
                    setPanelData(prev => ({
                      ...prev,
                      [id]: {
                        ...prev[id],
                        selectedXCol: e.target.value
                      }
                    }));
                  }}
                  className="border rounded-xl p-1"
                >
                  {availableCols.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mr-2">Y:</label>
                <select
                  value={selectedCol ?? ''}
                  onChange={e => {
                    setSelectedCol(e.target.value);
                    setPanelData(prev => ({
                      ...prev,
                      [id]: {
                        ...prev[id],
                        selectedCol: e.target.value
                      }
                    }));
                  }}
                  className="border rounded-xl p-1"
                >
                  {numericCols.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div 
        ref={chartContainerRef} 
        className={`flex flex-col h-full px-2 pb-2 overflow-hidden ${
          tableViewMode ? 'pt-2' : ''
        }`}
        onPointerLeave={handlePanelMouseLeave}
      >
        {tableViewMode ? (
          <TableViewer
            data={data.data}
            selectedXCol={selectedXCol}
            selectedCol={selectedCol}
            height={containerHeight}
          />
        ) : (
          <Histogram
            values={valuesToPlot}
            xValues={xValues}
            panelId={id}
            onHighlight={onHighlight}
            highlightedSite={data.highlightedSite}
            setPanelData={setPanelData}
            highlightedSites={data?.highlightedSites || []}
            persistentHighlights={data?.persistentHighlights || []}
            linkedTo={linkedTo}
            height={containerHeight}
            yLogActive={yLog}
            indexingMode={indexingMode}
          />
        )}
      </div>
    </PanelContainer>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.data === nextProps.data &&
    prevProps.hoveredPanelId === nextProps.hoveredPanelId &&
    prevProps.highlightedSite === nextProps.highlightedSite &&
    //prevProps.highlightOrigin === nextProps.highlightOrigin &&
    prevProps.justLinkedPanels.join() === nextProps.justLinkedPanels.join()
  );
});


const usePanelProps = (panelId, {
  linkMode,
  panels,
  panelData,
  panelLinks,
  panelLinkHistory,
  hoveredPanelId,
  justLinkedPanels,
  handleRestoreLink,
  handleUnlink,
  colorForLink,
  removePanel,
  triggerUpload,
  duplicatePanel,
  handleLinkClick,
  handleHighlight,
  setHoveredPanelId,
  canLink
}) => {
  const originId = linkMode;
  const originPanel = originId ? panels.find(p => p.i === originId) : null;

  const activePartners = useMemo(() => panelLinks[panelId] || [], [panelLinks, panelId]);
  const historyPartners = useMemo(() => panelLinkHistory[panelId] || [], [panelLinkHistory, panelId]);

  const panel = panels.find(p => p.i === panelId);
  const panelType = panel?.type;
  
  const isEligibleLinkTarget = !!(
    originPanel &&
    originPanel.i !== panelId &&                
    canLink(originPanel.type, panelType)   
  );

  return useMemo(() => ({
    id: panelId,
    data: panelData[panelId],
    linkBadges: historyPartners.map(pid => ({
        partnerId: pid,
        active: activePartners.includes(pid),
        title: panelData[pid]?.filename || pid
      })),
    onRestoreLink: handleRestoreLink,
    onUnlink: handleUnlink,
    colorForLink,
    onRemove: removePanel,
    onDuplicate: duplicatePanel,
    onLinkClick: handleLinkClick,
    linkedTo: activePartners,
    isLinkModeActive: linkMode === panelId,
    onHighlight: handleHighlight,
    hoveredPanelId,
    setHoveredPanelId,
    isEligibleLinkTarget,    
    justLinkedPanels,
  }), [
    panelId,
    panelData,
    historyPartners,
    activePartners, 
    linkMode,
    hoveredPanelId,
    justLinkedPanels,
    panelType,
    handleRestoreLink,
    handleUnlink,
    colorForLink,
    removePanel,
    triggerUpload,
    duplicatePanel,
    handleLinkClick,
    handleHighlight,
    setHoveredPanelId,
    originPanel,
    isEligibleLinkTarget
  ]);
};

const PanelWrapper = React.memo(({ 
  panel, 
  linkMode,
  panels,
  panelData,
  panelLinks,
  panelLinkHistory,
  hoveredPanelId,
  justLinkedPanels,
  handleRestoreLink,
  handleUnlink,
  colorForLink,
  removePanel,
  triggerUpload,
  duplicatePanel,
  handleLinkClick,
  handleHighlight,
  setHoveredPanelId,
  canLink,
  // Additional props needed for specific panel types
  scrollPositions,
  highlightedSequenceId,
  setHighlightedSequenceId,
  handleDuplicateTranslate,
  handleCreateSeqLogo,
  handleCreateSiteStatsHistogram,
  handleAlignmentToDistance,
  handleTreeToDistance,
  handleHeatmapToTree,
  handleFastME,
  handleFastMEDistance,
  handleCreateSequenceFromStructure,
  handleStructureDistanceMatrix,
  handleGenerateCorrelationMatrix,
  handleCreateTreeStats,
  onCreateSubsetMsa,
  onCreateSubtree,
  onCreateColorMatrix,
  setPanelData,
  onPredictOmega,
  modelLoading,
}) => {
  const commonProps = usePanelProps(panel.i, {
    linkMode,
    panels,
    panelData,
    panelLinks,
    panelLinkHistory,
    hoveredPanelId,
    justLinkedPanels,
    handleRestoreLink,
    handleUnlink,
    colorForLink,
    removePanel,
    triggerUpload,
    duplicatePanel,
    handleLinkClick,
    handleHighlight,
    setHoveredPanelId,
    canLink
  });

  const data = panelData[panel.i];
  if (!data) return null;

  const linkedPanelData = useMemo(() => {
    if (panel.type !== 'structure') {
      return undefined;
    }
    const linkedIds = Array.isArray(panelLinks[panel.i])
      ? panelLinks[panel.i]
      : (panelLinks[panel.i] ? [panelLinks[panel.i]] : []);
    
    return linkedIds
      .map(pid => panelData[pid])
      .filter(d => d && d.type === 'alignment');
      
  }, [panel.type, panel.i, panelLinks, panelData]);
  // Add panel-specific props
  const additionalProps = {
    setPanelData,
    justLinkedPanels,
    ...(panel.type === 'alignment' && {
      externalScrollLeft: scrollPositions[panel.i],
      highlightedSequenceId,
      setHighlightedSequenceId,
      onDuplicateTranslate: handleDuplicateTranslate,
      onCreateSeqLogo: handleCreateSeqLogo,
      onCreateSiteStatsHistogram: handleCreateSiteStatsHistogram,
      onGenerateDistance: handleAlignmentToDistance,
      onGenerateFastMEDistance: handleFastMEDistance,
      onFastME: handleFastME,
      onCreateColorMatrix: onCreateColorMatrix,
      onCreateSubsetMsa: onCreateSubsetMsa,
      onPredictOmega: onPredictOmega,
      modelLoading: modelLoading,
    }),
    ...(panel.type === 'tree' && {
      highlightedSequenceId,
      onHoverTip: setHighlightedSequenceId,
      onGenerateDistance: handleTreeToDistance,
      onCreateTreeStats: handleCreateTreeStats,
      onCreateSubtree: onCreateSubtree,
    }),
    ...(panel.type === 'heatmap' && {
      onHighlight: handleHighlight,
      onGenerateTree: handleHeatmapToTree 
    }),
...(panel.type === 'histogram' && {
  onGenerateCorrelationMatrix: handleGenerateCorrelationMatrix
}),
    ...(panel.type === 'structure' && {
      onCreateSequenceFromStructure: handleCreateSequenceFromStructure,
      onGenerateDistance: handleStructureDistanceMatrix,
      linkedPanelData: linkedPanelData,
    }),
    ...(panel.type === 'seqlogo' && {
      onHighlight: handleHighlight,
      linkedTo: panelLinks[panel.i] || [],
      hoveredPanelId: hoveredPanelId,
      setHoveredPanelId: setHoveredPanelId,
      onLinkClick: handleLinkClick,
      isLinkModeActive: linkMode === panel.i
    })
  }

  switch (panel.type) {
    case 'alignment':
      return <AlignmentPanel {...commonProps} {...additionalProps} />;
    case 'tree':
      return <TreePanel {...commonProps} {...additionalProps} />;
    case 'histogram':
      return <HistogramPanel {...commonProps} {...additionalProps} />;
    case 'notepad':
      return <NotepadPanel {...commonProps} {...additionalProps} />;
    case 'heatmap':
      return <HeatmapPanel {...commonProps} {...additionalProps} />;
    case 'seqlogo':
      return <SeqLogoPanel {...commonProps} {...additionalProps} />;
    case 'structure':
      return <StructurePanel {...commonProps} {...additionalProps} />;
    case 'image':
      return <ImagePanel {...commonProps} {...additionalProps} />;
    default:
      return null;
  }
},(prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.panel.i === nextProps.panel.i &&
    prevProps.linkMode === nextProps.linkMode &&
    prevProps.panelData[prevProps.panel.i] === nextProps.panelData[nextProps.panel.i] &&
    prevProps.panelLinks[prevProps.panel.i] === nextProps.panelLinks[nextProps.panel.i] &&
    prevProps.hoveredPanelId === nextProps.hoveredPanelId &&
    prevProps.justLinkedPanels.join() === nextProps.justLinkedPanels.join() &&
    prevProps.scrollPositions[prevProps.panel.i] === nextProps.scrollPositions[nextProps.panel.i] &&
    prevProps.highlightedSequenceId === nextProps.highlightedSequenceId
  );
});

const TopBar = React.memo(function TopBar({
  canUndo, undo, canRedo, redo, handleSaveBoard, fileInputRefBoard, handleLoadBoard,
  handleShareBoard, addPanel, triggerUpload, fileInputRef, handleFileUpload, handleFetchPdb
}) {
  const [hoveredBtn, setHoveredBtn] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const showTimer = useRef();
  const hideTimer = useRef();
  
  //  Additions for PDB Search UI
  const [showStructureOptions, setShowStructureOptions] = useState(false);
  const [isSearchingPdb, setIsSearchingPdb] = useState(false);
  const [pdbSearchQuery, setPdbSearchQuery] = useState('');
  const structureBtnRef = useRef(null);
  
  useEffect(() => {
    if (!showStructureOptions) return;

    function handleClickOutside(event) {
      if (structureBtnRef.current && !structureBtnRef.current.contains(event.target)) {
        setShowStructureOptions(false);
        setIsSearchingPdb(false);
        setPdbSearchQuery('');
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showStructureOptions]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (pdbSearchQuery.trim()) {
        handleFetchPdb(pdbSearchQuery.trim());
        setShowStructureOptions(false);
        setIsSearchingPdb(false);
        setPdbSearchQuery('');
      }
    } else if (e.key === 'Escape') {
       setShowStructureOptions(false);
       setIsSearchingPdb(false);
       setPdbSearchQuery('');
    }
  };

  const clearAllTooltips = useCallback(() => {
    clearTimeout(showTimer.current);
    setShowTooltip(false);
    setHoveredBtn(null);
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(showTimer.current);
      clearTimeout(hideTimer.current);
    };
  }, []);

  const handleLeave = useCallback(() => {
    clearTimeout(showTimer.current);
    hideTimer.current = setTimeout(clearAllTooltips, 10); 
  }, [clearAllTooltips]);

const handleEnter = useCallback((name) => {
    // If the structure options are open, disable the tooltip for the main structure button.
    if (name === 'structure' && showStructureOptions) {
      return;
    }
    clearTimeout(hideTimer.current);
    showTimer.current = setTimeout(() => {
      setHoveredBtn(name);
      setShowTooltip(true);
    }, 125);
  }, [showStructureOptions]);

  const tooltipMap = {
    undo: <><b>Undo</b><br />Undo the last action</>,
    redo: <><b>Redo</b><br />Redo the last undone action</>,
    save: <><b>Save Board</b><br />Save this board layout, data<br /> and links to a file</>,
    load: <><b>Load Board</b><br />Load a saved board from a file</>,
    share: <><b>Share via Gist</b><br />Copy a shareable link to the clipboard</>,
    notepad: <><b>New Notepad</b><br />Add a notepad panel<br />  for notes and comments</>,
    msa: <><b>Upload MSA</b><br />Upload a sequence or multiple sequence<br />alignment in FASTA format (.fasta/.fas)</>,
    tree: <><b>Upload Tree</b><br />Upload a phylogenetic tree<br />in Newick format (.nwk/.nhx)</>,
    data: <><b>Upload Data</b><br />Upload tabular data (.tsv/.csv)<br />or a list of numbers (.txt)</>,
    matrix: <><b>Upload Matrix</b><br />Upload a distance matrix in PHYLIP format<br />(.phy/.phylip/.dist)<br />or an arbitrary matrix in tabular format (.tsv/.csv)</>,
    structure: <><b>Upload Structure</b><br />Upload a molecular structure<br />in PDB format (.pdb) <br /> ---------- <br />Load it from PDB's database <br /> with its identifier</>,
  };

  const Tooltip = ({ name }) => {
    if (!showTooltip || hoveredBtn !== name) return null;
    return (
      <div 
        className="absolute text-center mt-4 left-1/2 -translate-x-1/2 z-30 px-2 py-1
                   rounded-xl bg-gray-200 text-black text-sm
                   transition-opacity whitespace-nowrap opacity-100 border border-gray-400"
        onMouseEnter={() => clearTimeout(hideTimer.current)}
        onMouseLeave={handleLeave}
      >
        {tooltipMap[name]}
      </div>
    );
  };

  const uploadBtnClass =
  "w-24 upload-btn-trigger whitespace-normal break-words h-18 text-black px-4 py-4 rounded-xl shadow-lg hover:shadow-xl leading-tight transition";

  return (
    <div className="p-0 flex justify-between items-center fixed top-0 left-0 w-full z-50"
        style={{ pointerEvents: 'none' }}>
      <div style={{ height: 12 }} /> {/* Spacer for fixed header */}
      <div className="flex items-center gap-2"  style={{ pointerEvents: 'auto' }}>
        <div className="p-1/2 flex justify-between items-center"></div>
        <div className="flex items-center gap-2 mt-2 mr-4 px-1 py-2 rounded-xl bg-white-100/100">
          <div className="flex flex-wrap items-center gap-0">
            {/* Icon Buttons */}
            <div className="relative" onMouseEnter={() => handleEnter('undo')} onMouseLeave={handleLeave}>
              <UndoButton onClick={undo} disabled={!canUndo} />
              <Tooltip name="undo" />
            </div>
            <div className="relative" onMouseEnter={() => handleEnter('redo')} onMouseLeave={handleLeave}>
              <RedoButton onClick={redo} disabled={!canRedo} />
              <Tooltip name="redo" />
            </div>
            <div className="relative" onMouseEnter={() => handleEnter('save')} onMouseLeave={handleLeave}>
              <SaveBoardButton onClick={handleSaveBoard} />
              <Tooltip name="save" />
            </div>
            <div className="relative" onMouseEnter={() => handleEnter('load')} onMouseLeave={handleLeave}>
              <LoadBoardButton onClick={() => fileInputRefBoard.current.click()} />
              <Tooltip name="load" />
            </div>
            <div className="relative" onMouseEnter={() => handleEnter('share')} onMouseLeave={handleLeave}>
              <ShareButton onClick={handleShareBoard} />
              <Tooltip name="share" />
            </div>
          </div>
          
          {/* Upload Buttons */}
          <div className="relative" onMouseEnter={() => handleEnter('notepad')} onMouseLeave={handleLeave}>
            <button
              onClick={() => addPanel({ type: 'notepad', data: { filename: "Notes", text: "" }, layoutHint: { w: 4, h: 10 } })}
              className={`${uploadBtnClass} bg-yellow-100 hover:bg-yellow-200`}
            >Notepad</button>
            <Tooltip name="notepad" />
          </div>
          <div className="relative" onMouseEnter={() => handleEnter('msa')} onMouseLeave={handleLeave}>
            <button onClick={() => triggerUpload('alignment')} className={`${uploadBtnClass} bg-green-200 hover:bg-green-300`}>MSA</button>
            <Tooltip name="msa" />
          </div>
          <div className="relative" onMouseEnter={() => handleEnter('tree')} onMouseLeave={handleLeave}>
            <button onClick={() => triggerUpload('tree')} className={`${uploadBtnClass} bg-blue-200 hover:bg-blue-300`}>Tree</button>
            <Tooltip name="tree" />
          </div>
          <div className="relative" onMouseEnter={() => handleEnter('data')} onMouseLeave={handleLeave}>
            <button onClick={() => triggerUpload('histogram')}  className={`${uploadBtnClass} bg-orange-200 hover:bg-orange-300`}>Data</button>
            <Tooltip name="data" />
          </div>
          <div className="relative" onMouseEnter={() => handleEnter('matrix')} onMouseLeave={handleLeave}>
            <button onClick={() => triggerUpload('heatmap')}  className={`${uploadBtnClass} bg-red-200 hover:bg-red-300`}>Matrix</button>
            <Tooltip name="matrix" />
          </div>
<div ref={structureBtnRef} className="relative" onMouseEnter={() => handleEnter('structure')} onMouseLeave={handleLeave}>
            <button
                onClick={() => {
                  clearAllTooltips();
                  const nextState = !showStructureOptions;
                  setShowStructureOptions(nextState);
                  if (!nextState) {
                    setIsSearchingPdb(false);
                    setPdbSearchQuery('');
                  }
                }}
                className={`${uploadBtnClass} bg-purple-200 hover:bg-purple-300`}
              >
                Structure
              </button>
            <Tooltip name="structure" />
            {showStructureOptions && (
              <div className="absolute top-full mt-2 w-full flex flex-col items-center gap-2">
                {isSearchingPdb ? (
                  <input
                    type="text"
                    autoFocus
                    value={pdbSearchQuery}
                    onChange={(e) => setPdbSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder=" PDB ID "
                    className="w-full text-black px-2 py-2 rounded-xl shadow-lg border-2 border-purple-400 focus:outline-none"
                  />
                ) : (
                  <>
                    <button
                      onClick={() => {
                        triggerUpload('structure');
                        setShowStructureOptions(false);
                      }}
                      className={`${uploadBtnClass} !w-full bg-purple-200 hover:bg-purple-300`}
                    >
                      Upload PDB
                    </button>
                    <button
                      onClick={() => setIsSearchingPdb(true)}
                      className={`${uploadBtnClass} !w-full bg-purple-200 hover:bg-purple-300`}
                    >
                      Search PDB
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <GitHubButton />
          <input ref={fileInputRef} type="file" accept=".fasta,.nwk,.nhx,.txt,.tsv,.csv,.fas,.phy,.phylip,.dist,.pdb,.png,.jpg,.jpeg,.gif,.svg,.webp,.avif,.bmp,.ico" onChange={handleFileUpload} style={{ display: 'none' }} />
          <input ref={fileInputRefBoard} type="file" accept=".json" onChange={handleLoadBoard} style={{ display: 'none' }} />
        </div>
      </div>
    </div>
  );
});

function ConfirmationBanner({ isOpen, message, onConfirm, onCancel }) {
  // useEffect to handle keyboard events
  React.useEffect(() => {
    // Only listen for keys when the banner is visible
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event) => {
      // Confirm on Enter
      if (event.key === 'Enter') {
        event.preventDefault(); // Prevent any default browser action
        onConfirm();
      } 
      // Cancel on Escape
      else if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };

    // Add the event listener to the whole document
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup function to remove the listener
    // This runs when the component unmounts or `isOpen` becomes false
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10001] bg-black/50 flex items-center justify-center" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center" onClick={(e) => e.stopPropagation()}>
        <p className="mb-6 text-gray-800 text-lg font-medium">{message}</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onCancel}
            className="px-8 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            No
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className="px-8 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  // Undo/Redo state management
  const [history, setHistory] = useState(() => ({
    past: [],
    present: {
      panels: [],
      layout: [],
      panelData: {},
      panelLinks: {},
      panelLinkHistory: {},
      linkColors: {},
    },
    future: [],
  }));

  const { panels, layout, panelData, panelLinks, panelLinkHistory, linkColors } = history.present;
  
  
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  // Main state updater function. Can either save to history or just update the present.
  const setState = useCallback((updater, saveToHistory) => {
    setHistory(currentHistory => {
      const newPresent = typeof updater === 'function' ? updater(currentHistory.present) : updater;

      if (saveToHistory) {
        return {
          past: [...currentHistory.past, currentHistory.present],
          present: newPresent,
          future: [],
        };
      } else {
        return { ...currentHistory, present: newPresent };
      }
    });
  }, []);

  const undo = useCallback(() => {
    setHistory(h => {
      if (h.past.length === 0) return h;
      const previous = h.past[h.past.length - 1];
      const newPast = h.past.slice(0, h.past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [h.present, ...h.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(h => {
      if (h.future.length === 0) return h;
      const next = h.future[0];
      const newFuture = h.future.slice(1);
      return {
        past: [...h.past, h.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  // State not included in history (transient UI state)
  const [linkMode, setLinkMode] = useState(null);
  const [justLinkedPanels, setJustLinkedPanels] = useState([]);
  const [scrollPositions, setScrollPositions] = useState({});
  const [highlightOrigin, setHighlightOrigin] = useState(null);
  const [highlightedSequenceId, setHighlightedSequenceId] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [hoveredPanelId, setHoveredPanelId] = useState(null);
  const [showRestoreButton, setShowRestoreButton] = useState(false);

  const [confirmation, setConfirmation] = useState({
  isOpen: false,
  message: '',
  onConfirm: () => {},
  onCancel: () => {},
  });

  const fileInputRef = useRef(null);
  const fileInputRefBoard = useRef(null);
  const pendingTypeRef = useRef(null);
  const pendingPanelRef = useRef(null);
  const [titleFlipKey, setTitleFlipKey] = useState(() => Date.now());
  const hideErrors = true;
  const [transientMessage, setTransientMessage] = useState('');

  // state for GitHub Token
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('github-pat') || '');
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tempToken, setTempToken] = useState('');

    // This is the function passed to child components. It intelligently decides whether to save history.
    const setPanelData = useCallback(updater => {
        // By using the functional update form of `setHistory`, we get access to the latest
        // `currentHistory` state without needing to list `history.present` in the dependency array.
        // This makes the `setPanelData` callback stable across all re-renders.
        setHistory(currentHistory => {
            const oldPresent = currentHistory.present;
            const newPanelData = typeof updater === 'function' ? updater(oldPresent.panelData) : updater;

            // This logic now correctly detects a prune action using the guaranteed latest state.
            let isPruneAction = false;
            if (oldPresent && oldPresent.panelData) {
                for (const id in newPanelData) {
                    if (!oldPresent.panelData[id] || !oldPresent.panels) continue;
                    const panelType = oldPresent.panels.find(p => p.i === id)?.type;
                    if (panelType === 'tree') {
                        if (newPanelData[id].data !== oldPresent.panelData[id].data) {
                            isPruneAction = true;
                            break;
                        }
                    }
                }
            }
            
            const newPresent = { ...oldPresent, panelData: newPanelData };
            
            // Now, we build the next history state based on whether the action was undoable.
            if (isPruneAction) {
                return {
                    past: [...currentHistory.past, oldPresent],
                    present: newPresent,
                    future: [],
                };
            } else {
                return {
                    ...currentHistory,
                    present: newPresent,
                };
            }
        });
    }, [setHistory]); // `setHistory` from useState is guaranteed to be stable.


  useEffect(() => {
    if (transientMessage) {
      const timer = setTimeout(() => setTransientMessage(''), 1400);
      return () => clearTimeout(timer);
    }
  }, [transientMessage]);

  // Suppress known-but-benign errors from 3Dmol.js and WebGL

  useEffect(() => {
    if (!hideErrors) return;
    //if (process.env.NODE_ENV !== 'development') return;

    const matches = (msg = '') => {
      const m = String(msg).toLowerCase();
      return (
        // 3Dmol + WebGL collapse spam
        m.includes('webgl: invalid_framebuffer_operation') ||
        m.includes('framebuffer is incomplete') ||
        m.includes('attachment has zero size') ||
        m.includes('invalid_framebuffer_operation') ||
        m.includes("e.close") ||                    // 3Dmol internal NPE path
        // Safari / cross-origin “Script error.”
        m === 'script error.'
      );
    };

    const onError = (ev) => {
      if (matches(ev?.message)) {
        ev.preventDefault();
        ev.stopImmediatePropagation(); // <- blocks CRA/webpack overlay
      }
    };

    const onRejection = (ev) => {
      const r = ev?.reason;
      const msg = (r && (r.message || r.toString?.())) || '';
      if (matches(msg)) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
      }
    };

    window.addEventListener('error', onError, true);
    window.addEventListener('unhandledrejection', onRejection, true);

    return () => {
      window.removeEventListener('error', onError, true);
      window.removeEventListener('unhandledrejection', onRejection, true);
    };
  }, []);

  useEffect(() => {
  //if (process.env.NODE_ENV !== 'development') return;
  if (!hideErrors) return;

  const origErr = console.error.bind(console);
  const origWarn = console.warn.bind(console);

  const noisy = (...args) => {
    const s = args
      .map(a => (typeof a === 'string' ? a : (a?.message || a?.toString?.() || '')))
      .join(' ')
      .toLowerCase();
    return (
      s.includes('webgl: invalid_framebuffer_operation') ||
      s.includes('framebuffer is incomplete') ||
      s.includes('attachment has zero size')
    );
  };

  console.error = (...a) => { if (!noisy(...a)) origErr(...a); };
  console.warn  = (...a) => { if (!noisy(...a)) origWarn(...a); };

  return () => {
    console.error = origErr;
    console.warn  = origWarn;
  };
  }, []);

const upsertHistory = useCallback((a, b, currentPresent) => {
    const copy = { ...(currentPresent.panelLinkHistory) };
    const ensure = (id) => {
      let v = copy[id];
      if (Array.isArray(v)) v = new Set(v);
      else if (!(v instanceof Set)) v = new Set();
      copy[id] = v;
      return v;
    };
    ensure(a).add(b);
    ensure(b).add(a);
    const normalized = {};
    for (const [k, v] of Object.entries(copy)) {
      normalized[k] = v instanceof Set ? Array.from(v) : Array.isArray(v) ? v : [];
    }
    return normalized;
}, []);

const pairKey = useCallback((a,b) => [String(a), String(b)].sort().join('|'), []);

const assignPairColor = useCallback((a, b, currentPresent) => {
    const key = pairKey(a, b);
    const prevLinkColors = currentPresent.linkColors;
    if (prevLinkColors[key] != null) return prevLinkColors;
    
    const used = new Set(Object.values(prevLinkColors));
    let idx = 0;
    
    while (idx < linkpalette.length && used.has(idx)) idx++;
    
    if (idx >= linkpalette.length) {
      const counts = Array(linkpalette.length).fill(0);
      for (const v of Object.values(prevLinkColors)) counts[v] = (counts[v] || 0) + 1;
      let best = 0, bestCnt = counts[0];
      for (let i = 1; i < counts.length; i++) {
        if (counts[i] < bestCnt) { best = i; bestCnt = counts[i]; }
      }
      idx = best;
    }
    
    return { ...prevLinkColors, [key]: idx };
}, [linkpalette, pairKey]);

  
// Resolve badge color (active=pair color, inactive=gray; falls back to hash if unseen)
const colorForLink = useCallback((selfId, partnerId, active) => {
  if (!active) return 'bg-gray-300';
  
  const key = pairKey(selfId, partnerId);
  let idx = linkColors[key];
  
  // If a color hasn't been officially assigned yet use a stable hash-based fallback
  if (idx == null) {
    let h = 0; 
    for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    idx = h % linkpalette.length;
  }
  
  return linkpalette[idx];
}, [linkColors, pairKey, linkpalette]);


// Memoized cache for alignment <-> structure chain mapping
const alignmentStructureChainCache = useMemo(() => {
  const cache = new Map();
  // Iterate through all linked pairs
  for (const sourceId in panelLinks) {
    const targetIds = Array.isArray(panelLinks[sourceId]) ? panelLinks[sourceId] : [panelLinks[sourceId]];
    for (const targetId of targetIds) {
      const sourcePanel = panels.find(p => p.i === sourceId);
      const targetPanel = panels.find(p => p.i === targetId);

      // Check if it's an alignment-structure pair
      if (sourcePanel && targetPanel && sourcePanel.type === 'alignment' && targetPanel.type === 'structure') {
        const alnData = panelData[sourceId];
        const structData = panelData[targetId];

        if (alnData?.data && structData?.pdb) {
          const preferredChain = chainIdFromSeqId(alnData.data[0]?.id) || null;
          // Compute the best chain mapping once and store it
          const mapping = pickAlignedSeqForChain(alnData, preferredChain, null);
          const cacheKey = `${sourceId}|${targetId}`;
          cache.set(cacheKey, mapping);
        }
      }
    }
  }
  return cache;
}, [panelLinks, panelData, panels]); // Recalculates only when links or data change

const treeLeafNamesCache = useMemo(() => {
    const cache = new Map();
    for (const panelId in panelData) {
      const data = panelData[panelId];
      // Check if it's a tree panel with valid data
      if (data && panels.find(p => p.i === panelId)?.type === 'tree' && data.data) {
        try {
          const leafNames = getLeafOrderFromNewick(data.data);
          // Store as a Set for O(1) lookups
          cache.set(panelId, new Set(leafNames));
        } catch (e) {
          console.error(`Failed to parse newick for tree panel ${panelId}:`, e);
        }
      }
    }
    return cache;
  }, [panelData, panels])

const addPanel = useCallback((config = {}) => {
  const { type, data, layoutHint = {}, autoLinkTo = null } = config;
  const newId = `${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  setState(present => {
    let nextPresent = { ...present };
    
    nextPresent.panelData = { ...nextPresent.panelData, [newId]: data };
    
    const withoutFooterPanels = nextPresent.panels.filter(p => p.i !== '__footer');
    nextPresent.panels = [...withoutFooterPanels, { i: newId, type }, { i: '__footer', type: 'footer' }];

    const layoutWithoutFooter = nextPresent.layout.filter(l => l.i !== '__footer');
    const footer = nextPresent.layout.find(l => l.i === '__footer');
    const GRID_W = 12;
    const defaultW = layoutHint.w || 4;
    let defaultH = layoutHint.h || 20;

    if (type === 'alignment' && data?.data?.length > 0) {
      // Calculate a height proportional to the number of sequences.
      // (Approx. 2 grid units for header/padding + 0.8 units per sequence)
      const proportionalHeight = 2 + Math.ceil(data.data.length * 0.8);
      // Use the smaller of the proportional height and the standard default, ensuring it's not less than the minimum.
      defaultH = Math.max(3, Math.min(defaultH, proportionalHeight));
    }

    const occupancy = {};
    layoutWithoutFooter.forEach(l => {
      for (let x = l.x; x < l.x + l.w; x++) {
        for (let y = l.y; y < l.y + l.h; y++) {
          occupancy[`${x},${y}`] = true;
        }
      }
    });

    let found = false, newX = 0, newY = 0;
    outer: for (let y = 0; y < 100; y++) {
      for (let x = 0; x <= GRID_W - defaultW; x++) {
        let fits = true;
        for (let dx = 0; dx < defaultW; dx++) {
          for (let dy = 0; dy < defaultH; dy++) {
            if (occupancy[`${x+dx},${y+dy}`]) {
              fits = false;
              break;
            }
          }
          if (!fits) break;
        }
        if (fits) {
          newX = x;
          newY = y;
          found = true;
          break outer;
        }
      }
    }
    if (!found) {
      const maxY = layoutWithoutFooter.reduce((max, l) => Math.max(max, l.y + l.h), 0);
      newX = 0;
      newY = maxY;
    }

    const newLayoutItem = { i: newId, x: newX, y: newY, w: defaultW, h: defaultH, minW: 2, minH: 2, ...layoutHint };
    const nextLayout = [...layoutWithoutFooter, newLayoutItem];
    const newMaxY = nextLayout.reduce((max, l) => Math.max(max, l.y + l.h), 0);
    const newFooter = { ...(footer || {}), i: '__footer', x: 0, y: newMaxY, w: 12, h: 2, static: true };
    nextPresent.layout = [...nextLayout, newFooter];

    if (autoLinkTo) {
        let pl = { ...nextPresent.panelLinks };
        pl[newId] = Array.isArray(pl[newId]) ? pl[newId] : (pl[newId] ? [pl[newId]] : []);
        if (!pl[newId].includes(autoLinkTo)) pl[newId].push(autoLinkTo);
        let arr = Array.isArray(pl[autoLinkTo]) ? pl[autoLinkTo] : (pl[autoLinkTo] ? [pl[autoLinkTo]] : []);
        if (!arr.includes(newId)) arr.push(newId);
        pl[autoLinkTo] = arr;
        nextPresent.panelLinks = pl;

        nextPresent.panelLinkHistory = upsertHistory(newId, autoLinkTo, nextPresent);
        nextPresent.linkColors = assignPairColor(newId, autoLinkTo, nextPresent);
        setJustLinkedPanels([newId, autoLinkTo]);
        setTimeout(() => setJustLinkedPanels([]), 1000);
    }
    
    return nextPresent;
  }, true); // Save to history
  return newId;
}, [setState, upsertHistory, assignPairColor]);


// Omega model integration

// Initialize the model hook
  const { predict: predictOmega, loading: modelLoading, error: modelError } = useOmegaModel('./seqmodel.onnx');


  // Display model errors to the user
  useEffect(() => {
    if (modelError) {
      alert(`Model Error: ${modelError}`);
    }
  }, [modelError]);


  const handlePredictOmega = useCallback(async (alignmentPanelId) => {
    const alignmentPanelData = panelData[alignmentPanelId];
    if (!alignmentPanelData || !alignmentPanelData.data) {
        alert("Alignment data not found.");
        return;
    }

    if (!isNucleotide(alignmentPanelData.data)) {
        alert("Omega prediction is only available for nucleotide sequences.");
        return;
    }
    
    setTransientMessage('Predicting Omega values...'); // Give user feedback

    try {
        const omegaValues = await predictOmega(alignmentPanelData.data);
        
        // Format the results for a HistogramPanel
        const siteData = {
            headers: ['codon', 'predicted_omega'],
            rows: omegaValues.map((value, index) => ({
                'codon': index + 1,
                'predicted_omega': value,
            })),
        };

        const baseName = (alignmentPanelData.filename || 'alignment').replace(/\.[^.]+$/, '');

        // Create a new histogram panel with the results
        addPanel({
            type: 'histogram',
            data: {
                data: siteData,
                filename: `${baseName}_omega.csv`,
                selectedXCol: 'codon',
                selectedCol: 'predicted_omega',
                indexingMode: '1-based', // Sites are 1-based
            },
            layoutHint: { w: 12, h: 8 },
            // Automatically link to the source alignment if the latter is in codon mode
            autoLinkTo: alignmentPanelData.codonMode ? alignmentPanelId : null,
        });

    } catch (e) {
        console.error("Prediction failed:", e);
        alert(`Prediction Failed: ${e.message}`);
        setTransientMessage('');
    }
  }, [panelData, predictOmega, addPanel, setTransientMessage]);

// Functions to create subset MSA and subtree 

const handleCreateSubsetMsaRef = useRef();
const handleCreateSubtreeRef = useRef();

const handleCreateSubsetMsa = useCallback((id, selectedIndices, quiet = false) => {
    const sourceData = panelData[id];
    if (!sourceData || !Array.isArray(sourceData.data)) return;

    const createSubMsaPanel = () => {
        const subsetMsa = selectedIndices.map(index => sourceData.data[index]);
        const newFilename = (sourceData.filename ? sourceData.filename.replace(/\.[^.]+$/, '') : 'alignment') + '.subset.fasta';
        const newPanelData = { ...sourceData, data: subsetMsa, filename: newFilename };
        delete newPanelData.highlightedSites;
        delete newPanelData.searchHighlight;
        delete newPanelData.linkedSiteHighlight;
        newPanelData.originalOrder = sourceData.originalOrder ? sourceData.originalOrder.filter((_, idx) => selectedIndices.includes(idx)) : undefined;
        return addPanel({ type: 'alignment', data: newPanelData, basedOnId: id });
    };

    if (quiet) {
        return createSubMsaPanel();
    }

    const linkedTrees = (panelLinks[id] || [])
        .map(linkedId => panels.find(p => p.i === linkedId))
        .filter(p => p && p.type === 'tree');

    const selectedLeafNames = new Set(selectedIndices.map(index => sourceData.data[index].id));

    if (linkedTrees.length === 0 || selectedLeafNames.size < 2) {
        createSubMsaPanel();
        return;
    }

    const closeBanner = () => setConfirmation(prev => ({ ...prev, isOpen: false }));

    const handleConfirm = () => {
        const newMsaId = createSubMsaPanel();
        const pairsToLink = [];

        linkedTrees.forEach(treePanel => {
            // Call through the ref to get the latest function
            const newTreeId = handleCreateSubtreeRef.current(treePanel.i, selectedLeafNames, true);
            if (newTreeId) {
                pairsToLink.push([newMsaId, newTreeId]);
            }
        });

        if (pairsToLink.length > 0) {
            setState(present => {
                let next = { ...present };
                pairsToLink.forEach(([id1, id2]) => {
                    next.panelLinks[id1] = [...new Set([...(next.panelLinks[id1] || []), id2])];
                    next.panelLinks[id2] = [...new Set([...(next.panelLinks[id2] || []), id1])];
                    next.panelLinkHistory = upsertHistory(id1, id2, next);
                    next.linkColors = assignPairColor(id1, id2, next);
                });
                setJustLinkedPanels([newMsaId, ...pairsToLink.map(p => p[1])]);
                setTimeout(() => setJustLinkedPanels([]), 1000);
                return next;
            }, true);
        }
        closeBanner();
    };

    const handleCancel = () => {
        createSubMsaPanel();
        closeBanner();
    };

    setConfirmation({
        isOpen: true,
        message: "Extract corresponding sub-tree from linked trees?",
        onConfirm: handleConfirm,
        onCancel: handleCancel,
    });
}, [panelData, panelLinks, panels, setState, addPanel, upsertHistory, assignPairColor]);


const handleCreateSubtree = useCallback((id, selectedLeaves, quiet = false) => {
    const sourceData = panelData[id];
    if (!sourceData?.data || !selectedLeaves || selectedLeaves.size < 2) {
        if (!quiet) alert("Please select at least two leaves to create a subtree.");
        return null;
    }
    
    const createSubtreePanel = () => {
        try {
            const originalTree = parseNewick(sourceData.data);
            const leavesToKeep = new Set(Array.from(selectedLeaves));
            const convertToD3HierarchyData = (node) => {
                if (!node) return null;
                const nameWithNhx = node.name || '';
                const cleanName = nameWithNhx.replace(/\[&&NHX:[^\]]+\]/, '').trim();
                const nhxData = {};
                if (nameWithNhx.match(/\[&&NHX:([^\]]+)\]/)) {
                    const nhxString = nameWithNhx.match(/\[&&NHX:([^\]]+)\]/)[1];
                    nhxString.split(':').forEach(part => {
                        const [key, value] = part.split('=', 2);
                        if (key && value) nhxData[key.trim()] = value.trim();
                    });
                }
                const children = (node.children || []).map(convertToD3HierarchyData).filter(Boolean);
                return { name: cleanName, nhx: nhxData, length: node.length || 0, ...(children.length > 0 && { children }) };
            };
            const hierarchyData = convertToD3HierarchyData(originalTree);
            let root = d3.hierarchy(hierarchyData);
            const leavesToPrune = root.leaves().filter(leaf => !leavesToKeep.has(leaf.data.name));
            leavesToPrune.forEach(nodeToPrune => {
                if (!nodeToPrune.parent) return;
                const parent = nodeToPrune.parent;
                if (parent.children && parent.children.length === 2) {
                    const grandparent = parent.parent;
                    const sibling = parent.children.find(child => child !== nodeToPrune);
                    if (!sibling) return; 
                    sibling.data.length = (parent.data.length || 0) + (sibling.data.length || 0);
                    if (grandparent) {
                        const parentIndex = grandparent.children.indexOf(parent);
                        if (parentIndex !== -1) {
                            grandparent.children[parentIndex] = sibling;
                            sibling.parent = grandparent;
                        }
                    } else {
                        sibling.parent = null;
                        root = sibling;
                    }
                } else if (parent.children) {
                    parent.children = parent.children.filter(child => child !== nodeToPrune);
                }
            });
            if (!root || (root.children && root.children.length < 1 && !leavesToKeep.has(root.data.name))) {
                 if(!quiet) alert("Pruning resulted in an invalid tree. Please select at least two related leaves.");
                 return null;
            }
            const newNewickString = toNewick(root) + ';';
            const newFilename = (sourceData.filename ? sourceData.filename.replace(/\.[^.]+$/, '') : 'tree') + '.subset.nwk';
            return addPanel({
                type: 'tree',
                data: { ...sourceData, data: newNewickString, filename: newFilename, pruneMode: false },
                basedOnId: id,
            });
        } catch (error) {
            console.error("An error occurred during subtree creation:", error);
            if(!quiet) alert(`Could not create subtree: ${error.message}`);
            return null;
        }
    };
    
    if (quiet) {
        return createSubtreePanel();
    }

    const linkedAlignments = (panelLinks[id] || [])
        .map(linkedId => panels.find(p => p.i === linkedId))
        .filter(p => p && p.type === 'alignment');

    if (linkedAlignments.length === 0) {
        createSubtreePanel();
        return;
    }

    const closeBanner = () => setConfirmation(prev => ({ ...prev, isOpen: false }));

    const handleConfirm = () => {
        const newTreeId = createSubtreePanel();
        if (!newTreeId) {
            closeBanner();
            return;
        }
        const pairsToLink = [];
        linkedAlignments.forEach(alnPanel => {
            const alnData = panelData[alnPanel.i];
            if (!alnData || !Array.isArray(alnData.data)) return;
            const alnIndicesToKeep = alnData.data
                .map((seq, index) => selectedLeaves.has(seq.id) ? index : -1)
                .filter(index => index !== -1);
            if (alnIndicesToKeep.length > 0) {
                // Call through the ref to get the latest function
                const newMsaId = handleCreateSubsetMsaRef.current(alnPanel.i, alnIndicesToKeep, true);
                if (newMsaId) {
                    pairsToLink.push([newTreeId, newMsaId]);
                }
            }
        });
        if (pairsToLink.length > 0) {
            setState(present => {
                let next = { ...present };
                pairsToLink.forEach(([id1, id2]) => {
                    next.panelLinks[id1] = [...new Set([...(next.panelLinks[id1] || []), id2])];
                    next.panelLinks[id2] = [...new Set([...(next.panelLinks[id2] || []), id1])];
                    next.panelLinkHistory = upsertHistory(id1, id2, next);
                    next.linkColors = assignPairColor(id1, id2, next);
                });
                setJustLinkedPanels([newTreeId, ...pairsToLink.map(p => p[1])]);
                setTimeout(() => setJustLinkedPanels([]), 1000);
                return next;
            }, true);
        }
        closeBanner();
    };

    const handleCancel = () => {
        createSubtreePanel();
        closeBanner();
    };

    setConfirmation({
        isOpen: true,
        message: "Extract corresponding sub-MSAs from linked alignments?",
        onConfirm: handleConfirm,
        onCancel: handleCancel,
    });
}, [panelData, panelLinks, panels, setState, addPanel, toNewick, parseNewick, upsertHistory, assignPairColor]);


  // useEffects to keep the refs updated.
  useEffect(() => {
    handleCreateSubsetMsaRef.current = handleCreateSubsetMsa;
  }, [handleCreateSubsetMsa]);

  useEffect(() => {
    handleCreateSubtreeRef.current = handleCreateSubtree;
  }, [handleCreateSubtree]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const onSyncScroll = useCallback((scrollLeft, originId) => {
    const targetIds = Array.isArray(panelLinks[originId]) ? panelLinks[originId] : [];
    targetIds.forEach(targetId => {
      const originPanel = panels.find(p => p.i === originId);
      const targetPanel = panels.find(p => p.i === targetId);
      if (!originPanel || !targetPanel) return;

    });
    if (!Array.isArray(panelLinks[originId])) return;


    const originPanel = panels.find(p => p.i === originId);
    const targetPanel = panels.find(p => p.i === targetId);
    if (!originPanel || !targetPanel) return;

    const originData = panelData[originId];
    const targetData = panelData[targetId];
    if (!originData || !targetData) return;

    const originIsCodon = originData.codonMode;
    const targetIsCodon = targetData.codonMode;

    let targetScrollLeft = scrollLeft;
    // Scale scroll position if modes are different
    if (originIsCodon && !targetIsCodon) {
      targetScrollLeft = scrollLeft / 3;
    } else if (!originIsCodon && targetIsCodon) {
      targetScrollLeft = scrollLeft * 3;
    }

 setScrollPositions(prev => {
   if (prev[targetId] === targetScrollLeft) return prev;
   return { ...prev, [targetId]: targetScrollLeft };
 });
  }, [panelLinks, panels, panelData]);

  const duplicatePanel = useCallback((id) => {
    const panel = panels.find(p => p.i === id);
    const data = panelData[id];
    const layoutItem = layout.find(l => l.i === id);
    if (!panel || !data || !layoutItem) return;

    const newData = JSON.parse(JSON.stringify(data));

    // Rehydrate the matrix view if it's a heatmap from a structure.
    // The JSON stringify/parse process turns the matrix proxy into a plain object.
    // We need to reconstruct the matrix view for the duplicated panel to use.
    if (panel.type === 'heatmap' && newData.matrix && typeof newData.matrix === 'object' && newData.matrix.n && newData.matrix.data) {
        const flatValues = Object.values(newData.matrix.data);
        const buffer = new Float64Array(flatValues).buffer;
        newData.matrix = createMatrixView(buffer, newData.matrix.n);
    }

    addPanel({
      type: panel.type,
      data: newData,
      basedOnId: id,
      layoutHint: {
      w: layoutItem.w,
      h: layoutItem.h,
      minW: layoutItem.minW,
      minH: layoutItem.minH,
    },
    });
  }, [panels, panelData, layout, addPanel]);

  const handleUnlink = useCallback((selfId, partnerId) => {
    setState(present => {
      const pl = { ...present.panelLinks };
      if (pl[selfId] && Array.isArray(pl[selfId])) {
        pl[selfId] = pl[selfId].filter(id => id !== partnerId);
        if (pl[selfId].length === 0) delete pl[selfId];
      }
      if (pl[partnerId] && Array.isArray(pl[partnerId])) {
        pl[partnerId] = pl[partnerId].filter(id => id !== selfId);
        if (pl[partnerId].length === 0) delete pl[partnerId];
      }
      return { ...present, panelLinks: pl };
    }, true); // This is an irreversible action so save it.
  }, [setState]);

  const handleDuplicateTranslate = useCallback((id) => {
    const data = panelData[id];
    if (!data) return;

    const layoutItem = layout.find(l => l.i === id);

    const translatedMsa = translateNucToAmino(data.data);
    const originalOrder = translatedMsa.map(seq => seq.id);
    const newFilename = (data.filename ? data.filename.replace(/\.[^.]+$/, '') : 'alignment') + '.aa.fasta';

    addPanel({
      type: 'alignment',
      data: {
        ...data,
        data: translatedMsa,
        originalOrder: originalOrder,
        filename: newFilename,
        codonMode: false,
      },
      basedOnId: id,
      layoutHint: {
        w: layoutItem ? layoutItem.w : 6,
        h: layoutItem ? layoutItem.h : 20
      },
      autoLinkTo: data.codonMode ? id : null,
    });
  }, [panelData, addPanel]);

    const handleCreateSeqLogo = useCallback((id) => {
    const data = panelData[id];
    if (!data) return;
    const isNuc = Array.isArray(data.data) && isNucleotide(data.data);
    const shouldLink = !(isNuc && data.codonMode);

    addPanel({
      type: 'seqlogo',
      data: {
        msa: data.data,
        filename: (data.filename ? data.filename : 'alignment')+'.sl.png',
      },
      basedOnId: id,
      layoutHint: { h: 8, w: 6 },
      autoLinkTo: shouldLink ? id : null,

    });
  }, [panelData, addPanel]);


const handleCreateSequenceFromStructure = useCallback((id) => {
    const data = panelData[id];
    if (!data?.pdb) return;

    const chains = parsePdbChains(data.pdb);
    if (chains.size === 0) { alert("Could not extract sequences (no CA atoms found)."); return; }
    
    setState(present => {
        let nextPresent = { ...present };
        const baseNameStr = (data.filename ? data.filename.replace(/\.[^.]+$/, '') : 'structure');
        const originalLayout = nextPresent.layout.find(l => l.i === id);
        const baseY = originalLayout ? (originalLayout.y + originalLayout.h) : 0;

        const newPanels = [];
        const newLayouts = [];
        const newPanelDataEntries = {};

        [...chains.entries()].forEach(([chainId, { seq }], idx) => {
            if (!seq) return;
            const newId = `alignment-from-pdb-${chainId}-${Date.now()}-${idx}`;
            const newData = [{ id: `${baseNameStr}_chain_${chainId}`, sequence: seq }];
            const originalOrder = newData.map(s => s.id);
            newPanels.push({ i: newId, type: 'alignment' });
            newLayouts.push({ i: newId, x: 0, y: baseY + idx * 3, h: 3, w: 12, minH: 2, minW: 2 });
            newPanelDataEntries[newId] = {
                data: newData,
                originalOrder: originalOrder,
                filename: `${baseNameStr}_chain_${chainId}.fasta`,
                codonMode: false
            };
        });

        const withoutFooterPanels = nextPresent.panels.filter(p => p.i !== '__footer');
        nextPresent.panels = [...withoutFooterPanels, ...newPanels, { i: '__footer', type: 'footer' }];

        const withoutFooterLayout = nextPresent.layout.filter(l => l.i !== '__footer');
        const footer = nextPresent.layout.find(l => l.i === '__footer');
        const nextLayout = [...withoutFooterLayout, ...newLayouts];
        const maxY = nextLayout.reduce((m, l) => Math.max(m, l.y + l.h), 0);
        nextPresent.layout = [...nextLayout, { ...(footer || {}), y: maxY }];

        nextPresent.panelData = { ...nextPresent.panelData, ...newPanelDataEntries };

        let newLinks = { ...nextPresent.panelLinks };
        if (!Array.isArray(newLinks[id])) newLinks[id] = newLinks[id] ? [newLinks[id]] : [];
        newPanels.forEach(p => {
            newLinks[p.i] = [id];
            if (!newLinks[id].includes(p.i)) newLinks[id].push(p.i);
            nextPresent.panelLinkHistory = upsertHistory(p.i, id, nextPresent);
            nextPresent.linkColors = assignPairColor(p.i, id, nextPresent);
        });
        nextPresent.panelLinks = newLinks;

        const allNewPanelIds = newPanels.map(p => p.i);
        setJustLinkedPanels([...allNewPanelIds, id]);
        setTimeout(() => setJustLinkedPanels([]), 1000);

        return nextPresent;
    }, true);
}, [panelData, setState, upsertHistory, assignPairColor]);

const handleStructureDistanceMatrix = useCallback((sourcePanelId, calculationResult) => {
  const { labels, buffer, n, maxVal } = calculationResult;
  const sourcePanelData = panelData[sourcePanelId];
  if (!sourcePanelData) return;

  const matrix = createMatrixView(buffer, n);
  const base = baseName(sourcePanelData.filename, 'structure');
  const suffix = sourcePanelData.chainChoice || 'dist';

  addPanel({
    type: 'heatmap',
    data: { 
      rowLabels: labels,
      colLabels: labels,
      isSquare: true,
      matrix, 
      filename: `${base}_${suffix}.phy`,
      minVal: 0,
      maxVal: maxVal
    },
    basedOnId: sourcePanelId,
    layoutHint: { w: 4, h: 20 },
    autoLinkTo: sourcePanelId,
  });
}, [panelData, addPanel]);


// --- FastME handling ---
let __fastmeModulePromise = null;
async function loadFastMEWasm() {
  if (__fastmeModulePromise) return __fastmeModulePromise;

  const jsUrl = new URL('wasm/fastme.js', document.baseURI).toString();
  const wasmBase = new URL('wasm/', document.baseURI).toString();

  // Check if JS file is served correctly
  const head = await fetch(jsUrl, { method: 'GET' });
  const ct = head.headers.get('content-type') || '';
  if (!ct.includes('javascript')) {
    throw new Error(`fastme.js not served as JS: ${head.status} ${ct} at ${jsUrl}`);
  }

  // Dynamically add the script to the DOM
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = jsUrl;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });

  // Now window.FastME should be defined
  const factory = window.FastME;
  if (typeof factory !== 'function') {
    throw new Error('FastME module is not a function. Check your build flags and static file serving.');
  }

  const fastme = await factory({
    print: (s) => console.log('[fastme]', s),
    printErr: (s) => console.warn('[fastme:err]', s),
    locateFile: (path) => wasmBase + path,
    noInitialRun: true,
  });

    __fastmeModulePromise = fastme;
    return fastme;
  }
 

async function handleFastME(alignmentPanelId, options) {
  try {
    const aln = panelData[alignmentPanelId]?.data;
    if (!Array.isArray(aln) || aln.length < 4) {
      alert('Need at least 4 sequences to build a tree.');
      return;
    }

    const fastme = await loadFastMEWasm();
    if (!fastme || !fastme.FS || typeof fastme.FS.writeFile !== 'function') {
      console.error('FastME WASM module did not export FS. Check your build flags and WASM glue.');
      return;
    }

    try { fastme.FS.unlink('in.phy'); } catch {}
    try { fastme.FS.unlink('out.nwk'); } catch {}
    try { fastme.FS.unlink('in.seq.phy'); } catch {}

    const cleanAln = removeGappedSequences(aln, 0.02);
    const alnPhylip = msaToPhylip(cleanAln);
    fastme.FS.writeFile('in.seq.phy', alnPhylip);

    // options = { model, method, gamma, nni, spr, bootstrap }
    const isProtein = Array.isArray(aln) && !isNucleotide(aln);
    
    const argv = ['fastme', '-i', 'in.seq.phy', '-o', 'out.nwk'];

    if (options.model) {
        const flag = isProtein ? `--protein=${options.model}` : `--dna=${options.model}`;
        argv.push(flag);
    }

    if (options.method) {
      // convert TaxAdd_BalME to B and Tax_Add_OLSME to O
      if (options.method === 'TaxAdd_BalME') {
          argv.push('--method=B');
      } else if (options.method === 'TaxAdd_OLSME') {
          argv.push('--method=O');
      } else
        argv.push('--method=' + options.method);
    }

    // -- Gamma Rates --
    if (options.gamma && parseFloat(options.gamma) > 0) {
        argv.push('-g');
        argv.push(String(options.gamma));
    }

    // -- Topology Improvements --
    if (options.nni) argv.push('-n');
    if (options.spr) argv.push('-s');
    
    // -- Bootstraps --
    if (options.bootstrap && parseInt(options.bootstrap) > 0) {
        argv.push('-b');
        argv.push(String(options.bootstrap));
    }

    console.log('FastME argv:', argv.join(' '));
    
    const rc = fastme.callMain(argv);
    if (rc !== 0) {
      console.warn('FastME exited with code', rc);
    }

    let newick = '';
    try {
      newick = fastme.FS.readFile('out.nwk', { encoding: 'utf8' });
    } catch (e) {
      alert('FastME did not produce a tree (out.nwk missing)..');
      return;
    }

    if (!newick?.trim()) {
      alert('FastME did not produce a tree (out.nwk was empty).');
      return;
    }
   try {
      const statTxt = fastme.FS.readFile('in.seq.phy_fastme_stat.txt', { encoding: 'utf8' });
      const trimmed = statTxt.split('\n').slice(14).join('\n').trim();
      console.log('FastME statistics:\n', trimmed);
    } catch (e) {
      console.warn('FastME statistics file not found.');
    }

    const srcName = panelData[alignmentPanelId]?.filename || 'alignment';
    const base = srcName.replace(/\.[^.]+$/, '');

    // Add suffix to filename based on settings
    //const suffix = `_${options.method}_${options.model}`;
    const suffix = ''

    addPanel({
      type: 'tree',
      data: {
        data: convertFastMeToNhx(newick),
        filename: `${base}${suffix}.nwk`,
        isNhx: true,
        method: `FastME (${options.method})`,
        sourceAlignment: alignmentPanelId,
      },
      basedOnId: alignmentPanelId,
      layoutHint: { w: 5, h: 18 },
      autoLinkTo: alignmentPanelId,
    });

    // Clean up FS
    try { fastme.FS.unlink('in.seq.phy'); } catch {}
    try { fastme.FS.unlink('out.nwk'); } catch {}
    try { fastme.FS.unlink('in.seq.phy_fastme_stat.txt'); } catch {}
    // clear cached module to save memory
    __fastmeModulePromise = null;
    try { delete window.FastME; } catch {}

  } catch (err) {
    console.error('handleFastME failed:', err);
    alert(`FastME failed: ${err?.message || err}`);
  }
}

const handleFastMEDistance = useCallback(async (id, model) => {
  const data = panelData[id];
  if (!data || !Array.isArray(data.data) || data.data.length < 2) {
    alert('Need at least two sequences to build a distance matrix.');
    return;
  }

  const fastme = await loadFastMEWasm();
    if (!fastme || !fastme.FS || typeof fastme.FS.writeFile !== 'function') {
      console.error('FastME WASM module did not export FS. Check your build flags and WASM glue.');
      return;
  }

  try { fastme.FS.unlink('in.dist.phy'); } catch {}
  try { fastme.FS.unlink('out.matrix'); } catch {}

  const cleanAln = removeGappedSequences(data.data, 0.02);
  
  if (cleanAln.length < 2) {
      alert("After removing gapped sequences, fewer than 2 sequences remain. Cannot compute matrix.");
      return;
  }

  const alnPhylip = msaToPhylip(cleanAln);
  fastme.FS.writeFile('in.dist.phy', alnPhylip);

  // Construct Arguments
  // -c computes matrix, -O output_matrix
  const argv = ['fastme', '-i', 'in.dist.phy', '-c', '-O', 'out.matrix'];
  
  const isProtein = !isNucleotide(data.data);
  
  if (model) {
      if (isProtein) {
          argv.push(`--protein=${model}`);
      } else {
          argv.push(`--dna=${model}`);
      }
  }

  console.log('FastME Distance argv:', argv.join(' '));

  // Run FastME
  const rc = fastme.callMain(argv);
  if (rc !== 0) {
    console.warn('FastME exited with code', rc);
  }

  // Read Result
  let matrixContent = '';
  try {
    matrixContent = fastme.FS.readFile('out.matrix', { encoding: 'utf8' });
  } catch (e) {
    alert('FastME did not produce a matrix file.');
    return;
  }

  if (!matrixContent || !matrixContent.trim()) {
      alert("FastME produced an empty matrix file.");
      return;
  }

  // Parsing
  try {

    const lines = matrixContent.trim().split(/\r?\n/).filter(l => l.trim());
    
    // Parse header (N)
    const headerParts = lines[0].trim().split(/\s+/);
    const n = parseInt(headerParts[0], 10);
    
    if (isNaN(n) || n < 1) {
        throw new Error("Invalid matrix header");
    }

    const labels = [];
    const matrix = [];

    // Parse rows (starts at line 1)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        // Split by whitespace
        const parts = line.split(/\s+/);
        
        // parts[0] is the name, the rest are numbers
        if (parts.length < 2) continue;

        labels.push(parts[0]);
        // Convert the rest to numbers
        const row = parts.slice(1).map(val => parseFloat(val));
        matrix.push(row);
    }

    // Validation
    if (matrix.length !== n || labels.length !== n) {
        console.warn(`FastME Parsing Warning: Expected ${n} rows, got ${matrix.length}`);
    }

    const base = (data.filename || 'alignment').replace(/\.[^.]+$/, '');
    
    addPanel({
      type: 'heatmap',
      data: { 
        rowLabels: labels, 
        colLabels: labels, 
        isSquare: true, 
        matrix, 
        filename: `${base}_${model || 'dist'}.phy`,
        minVal: 0
      },
      basedOnId: id,
      layoutHint: { w: 4, h: 16 },
      autoLinkTo: id,
    });
  } catch (e) {
    console.error("Matrix Parsing Error:", e);
    console.log("Raw Content:", matrixContent);
    alert('Failed to parse the matrix. See console.');
  }

  // Cleanup
  try { fastme.FS.unlink('in.dist.phy'); } catch {}
  try { fastme.FS.unlink('out.matrix'); } catch {}

  // clear cached module to save memory
  __fastmeModulePromise = null;
  try { delete window.FastME; } catch {}

}, [panelData, addPanel]);

const handleGenerateCorrelationMatrix = useCallback((id) => {
  const histogramData = panelData[id];
  if (!histogramData || Array.isArray(histogramData.data)) {
    alert('Correlation matrix can only be computed for tabular data');
    return;
  }

  try {
    const { labels, matrix } = computeCorrelationMatrix(histogramData.data);
    
    const base = baseName(histogramData.filename, 'data');
    
    addPanel({
      type: 'heatmap',
      data: { 
        rowLabels: labels,
        colLabels: labels,
        isSquare: true,
        matrix,
        filename: `${base}_corr.phy`,
        highColor: '#FFFF00',
        lowColor: '#3C00A0',
      },
      basedOnId: id,
      layoutHint: { w: 4, h: 16 },
    });
  } catch (error) {
    alert(`Failed to compute correlation matrix: ${error.message}`);
  }
}, [panelData, addPanel]);

const handleTreeToDistance = useCallback((id) => {
  const treeData = panelData[id];
  if (!treeData?.data) return;
  try {
    const { labels, matrix } = newickToDistanceMatrix(treeData.data);
    const base = (treeData.filename ? treeData.filename : 'tree');
    addPanel({
      type: 'heatmap',
      data: { rowLabels: labels, colLabels: labels, isSquare: true, matrix, filename: `${base}.phy` },
      basedOnId: id,
      layoutHint: { w: 4, h: 16 },
      autoLinkTo: id,
    });

  } catch (e) {
    alert('Failed to build distance matrix from this tree.');
    console.error(e);
  }
}, [panelData, addPanel]);


const handleAlignmentToDistance = useCallback((id) => {
  const a = panelData[id];
  if (!a || !Array.isArray(a.data) || a.data.length < 2) {
    alert('Need at least two sequences in the MSA to build a distance matrix.');
    return;
  }

  const { labels, matrix } = computeNormalizedHammingMatrix(a.data);

  const base = (a.filename ? a.filename : 'alignment');
  addPanel({
    type: 'heatmap',
    data: { rowLabels: labels, colLabels: labels, isSquare: true, matrix, filename: `${base}.phy` },
    basedOnId: id,
    layoutHint: { w: 4, h: 16 },
    autoLinkTo: id,
  });
}, [panelData, addPanel]);

const handleHeatmapToTree = useCallback((id) => {
  const heatmapData = panelData[id];
  if (!heatmapData?.rowLabels || !heatmapData?.matrix || !heatmapData?.isSquare) {
    alert('No valid distance matrix data found.');
    return;
  }

  try {
    const newickString = buildTreeFromDistanceMatrix(heatmapData.rowLabels, heatmapData.matrix);
    
    const baseName = (heatmapData.filename || 'distance_matrix').replace(/\.[^.]+$/, '');
    
    addPanel({
      type: 'tree',
      data: {
        data: newickString,
        filename: `${baseName}.nwk`,
        isNhx: false
      },
      basedOnId: id,
      layoutHint: { w: 4, h: 18 },
      autoLinkTo: id,
    });
  } catch (e) {
    alert(`Failed to build tree from distance matrix: ${e.message}`);
    console.error('Tree building error:', e);
  }
}, [panelData, addPanel]);

const handleRestoreLink = useCallback((selfId, partnerId) => {
    const selfExists = panels.some(p => p.i === selfId);
    const partnerExists = panels.some(p => p.i === partnerId);
    if (!selfExists || !partnerExists) return;

    setState(present => {
        let nextPresent = { ...present };
        let pl = { ...nextPresent.panelLinks };
        pl[selfId] = Array.isArray(pl[selfId]) ? pl[selfId] : (pl[selfId] ? [pl[selfId]] : []);
        if (!pl[selfId].includes(partnerId)) pl[selfId].push(partnerId);
        pl[partnerId] = Array.isArray(pl[partnerId]) ? pl[partnerId] : (pl[partnerId] ? [pl[partnerId]] : []);
        if (!pl[partnerId].includes(selfId)) pl[partnerId].push(selfId);
        
        nextPresent.panelLinks = pl;
        nextPresent.linkColors = assignPairColor(selfId, partnerId, nextPresent);
        
        setJustLinkedPanels([selfId, partnerId]);
        setTimeout(() => setJustLinkedPanels([]), 1000);

        return nextPresent;
    }, true); // This is a tracked action
}, [panels, setState, assignPairColor]);


const handleLinkClick = useCallback((id) => {

  // If linkMode is set, check compatibility before linking
  if (linkMode && linkMode !== id) {
    const panelA = panels.find(p => p.i === linkMode);
    const panelB = panels.find(p => p.i === id);
    if (panelA && panelB && !canLink(panelA.type, panelB.type)) {
      alert("Unsupported panel link (available linking partners are higlighted in blue).");
      setLinkMode(null);
      return;
    }
  }

  if (!linkMode) {
    setLinkMode(id);
  } else {
    if (linkMode === id) {
      setLinkMode(null);
    } else {
        const a = linkMode, b = id;

        setState(present => {
            let nextPresent = { ...present };
            
            let pl = { ...nextPresent.panelLinks };
            pl[a] = Array.isArray(pl[a]) ? pl[a] : (pl[a] ? [pl[a]] : []);
            if (!pl[a].includes(b)) pl[a].push(b);
            pl[b] = Array.isArray(pl[b]) ? pl[b] : (pl[b] ? [pl[b]] : []);
            if (!pl[b].includes(a)) pl[b].push(a);
            nextPresent.panelLinks = pl;

            nextPresent.panelLinkHistory = upsertHistory(a, b, nextPresent);
            nextPresent.linkColors = assignPairColor(a, b, nextPresent);
            
            // Reorder if tree linked
            const panelA = nextPresent.panels.find(p => p.i === a);
            const panelB = nextPresent.panels.find(p => p.i === b);
            if (panelA && panelB) {
                const treeId = panelA.type === 'tree' ? a : panelB.type === 'tree' ? b : null;
                if (treeId) {
                    const leafOrder = getLeafOrderFromNewick(nextPresent.panelData[treeId]?.data || '');
                    if (leafOrder?.length) {
                        const alnId = panelA.type === 'alignment' ? a : (panelB.type === 'alignment' ? b : null);
                        if (alnId && nextPresent.panelData[alnId]?.data?.length) {
                            const reordered = reorderMsaByLeafOrder(nextPresent.panelData[alnId].data, leafOrder);
                            nextPresent.panelData = { ...nextPresent.panelData, [alnId]: { ...nextPresent.panelData[alnId], data: reordered }};
                        }
                        const hmId = panelA.type === 'heatmap' ? a : (panelB.type === 'heatmap' ? b : null);
                        if (hmId && nextPresent.panelData[hmId]?.rowLabels && nextPresent.panelData[hmId]?.matrix) {
                            const { labels, matrix } = reorderHeatmapByLeafOrder(nextPresent.panelData[hmId].rowLabels, nextPresent.panelData[hmId].matrix, leafOrder);
                            const updatedData = { ...nextPresent.panelData[hmId], rowLabels: labels, colLabels: labels, matrix };
                            nextPresent.panelData = { ...nextPresent.panelData, [hmId]: updatedData};
                        }
                    }
                }
            }

            setJustLinkedPanels([linkMode, id]);
            setTimeout(() => setJustLinkedPanels([]), 1000);
            
            return nextPresent;
        }, true); // Save link action to history.

      setLinkMode(null);
    }
  }

  // clear any existing highlights
  setHighlightOrigin(null);
}, [linkMode, panels, setState, upsertHistory, assignPairColor]);

const panelsRef = useRef(panels);
  useEffect(() => { panelsRef.current = panels; }, [panels]);

  const panelDataRef = useRef(panelData);
  useEffect(() => { panelDataRef.current = panelData; }, [panelData]);

  const treeLeafNamesCacheRef = useRef(treeLeafNamesCache);
  useEffect(() => { treeLeafNamesCacheRef.current = treeLeafNamesCache; }, [treeLeafNamesCache]);

  const alignmentStructureChainCacheRef = useRef(alignmentStructureChainCache);
  useEffect(() => { alignmentStructureChainCacheRef.current = alignmentStructureChainCache; }, [alignmentStructureChainCache]);

  const dataSignature = useMemo(() => {
    // This creates a stable string representing the data we care about for linking.
    // It will not change when transient highlights are added to panelData.
    return panels
      .map(p => {
        const d = panelData[p.i];
        if (!d) return '';
        if (p.type === 'alignment') return d.data?.[0]?.id || ''; // Use first seq ID as proxy
        if (p.type === 'heatmap') return (d.rowLabels || d.labels)?.[0] || ''; // Use first label as proxy
        return '';
      })
      .join('|');
  }, [panels, panelData]);

const linkTypeCache = useMemo(() => {
    const cache = {};
    if (!panelLinks || !panelData || !panels) return cache;

    Object.keys(panelLinks).forEach(sourceId => {
      const sourcePanel = panels.find(p => p.i === sourceId);
      if (!sourcePanel) return;

      const targets = Array.isArray(panelLinks[sourceId]) ? panelLinks[sourceId] : [panelLinks[sourceId]];
      targets.forEach(targetId => {
        const targetPanel = panels.find(p => p.i === targetId);
        if (!targetPanel) return;

        // Specifically create cache entries for heatmap <-> alignment links
        if ((sourcePanel.type === 'heatmap' && targetPanel.type === 'alignment')) {
          const key = pairKey(sourceId, targetId);

          const heatmapData = panelData[sourceId];
          const msaData = panelData[targetId];

          if (!heatmapData || !msaData?.data) {
            cache[key] = 'columnar'; // Default if data is missing
            return;
          }
          const heatmapLabels = heatmapData.rowLabels || heatmapData.labels;
          if (!heatmapLabels) {
            cache[key] = 'columnar';
            return;
          }
          
          const msaSeqIds = new Set(msaData.data.map(seq => seq.id));
          const isPairwise = heatmapLabels.some(label => msaSeqIds.has(label));
          
          cache[key] = isPairwise ? 'pairwise' : 'columnar';
        }
      });
    });
    //console.log("Recomputed Link Type Cache:", cache);
    return cache;
  }, [panelLinks, dataSignature, panels, pairKey]);

const handleHighlight = useCallback((site, originId) => {
    // 1. Update Highlight Origin State
    setHighlightOrigin(prevOrigin => {
        if (site === null && prevOrigin !== null) return null;
        if (site !== null) return originId;
        return prevOrigin;
    });

    setPanelData(prev => {
      // Optimization: Don't update if the origin's highlight hasn't changed
      if (prev[originId]?.highlightedSite === site && site !== null) return prev;

      const next = { ...prev };
      const currentPanels = panelsRef.current;
      const currentTreeLeafNamesCache = treeLeafNamesCacheRef.current;
      const currentAlignmentStructureChainCache = alignmentStructureChainCacheRef.current;

      // 2. Update the origin panel
      next[originId] = { ...next[originId], highlightedSite: site };

      const targetIdsRaw = panelLinks[originId] || [];
      const targetIds = Array.isArray(targetIdsRaw) ? targetIdsRaw : (targetIdsRaw ? [targetIdsRaw] : []);

      // 3. Cleanup Logic
      if (site === null) {
        targetIds.forEach(targetId => {
           const cur = next[targetId] || {};
           let updated = { ...cur, highlightedSite: null }; 
           
           if (updated.linkedHighlights?.length) updated.linkedHighlights = [];
           if (updated.linkedHighlightCell) updated.linkedHighlightCell = undefined;
           if (updated.linkedSiteHighlight != null) updated.linkedSiteHighlight = undefined;
           if (updated.linkedResiduesByKey?.length) updated.linkedResiduesByKey = [];
           if (updated.linkedResidueIndex != null) updated.linkedResidueIndex = undefined;
           if (updated.highlightedSites?.length) updated.highlightedSites = [];
           
           if (cur !== updated) next[targetId] = updated;
        });
        return next;
      }

      // 4. Propagation Logic
      targetIds.forEach(targetId => {
        const sourcePanel = currentPanels.find(p => p.i === originId);
        const targetPanel = currentPanels.find(p => p.i === targetId);
        if (!sourcePanel || !targetPanel) return;

        const S = sourcePanel.type;
        const T = targetPanel.type;
        const cur = next[targetId] || {};

        // --- Alignment/SeqLogo -> Alignment/SeqLogo ---
        if ((S === 'alignment' || S === 'seqlogo') && (T === 'alignment' || T === 'seqlogo')) {
           next[targetId] = { ...cur, highlightedSite: site };
           
           if (T === 'alignment') {
             const scrollSite = cur.codonMode ? site * 3 : site;
             setScrollPositions(prevSP => ({ ...prevSP, [targetId]: scrollSite * CELL_SIZE }));
           } else if (T === 'seqlogo') {
             setScrollPositions(prevSP => ({ ...prevSP, [targetId]: site * CELL_SIZE }));
           }
        }
        
        // --- Heatmap -> Tree ---
        else if (S === 'heatmap' && T === 'tree') {
             const { rowLabels } = next[originId] || {};
             if (rowLabels && site?.row != null && site?.col != null) {
               next[targetId] = { ...cur, linkedHighlights: [rowLabels[site.row], rowLabels[site.col]] };
             }
        }
        
        // --- Heatmap -> Alignment ---
        else if (S === 'heatmap' && T === 'alignment') {
             const sourceData = next[originId];
             const key = pairKey(originId, targetId);
             const linkingType = linkTypeCache[key]; 
             
             if (linkingType === 'pairwise' && !sourceData.isMsaColorMatrix) {
                const labels = sourceData.rowLabels || sourceData.labels;
                if (labels && site.row != null && site.col != null) {
                    next[targetId] = { ...cur, linkedHighlights: [labels[site.row], labels[site.col]], linkedSiteHighlight: undefined };
                }
             } else {
                 let colIdx = sourceData.isMsaColorMatrix ? site.col : null;
                 if (!sourceData.isMsaColorMatrix && sourceData.colLabels) {
                     const match = String(sourceData.colLabels[site.col]).match(/(\d+)\s*$/);
                     if (match) colIdx = parseInt(match[1], 10) - 1;
                 }
                 if (colIdx != null && colIdx >= 0) {
                     next[targetId] = { ...cur, linkedSiteHighlight: colIdx, linkedHighlights: [] };
                     const isCodon = !!cur.codonMode;
                     setScrollPositions(prevSP => ({ ...prevSP, [targetId]: colIdx * (isCodon ? 3 : 1) * CELL_SIZE }));
                 }
             }
        }
        
        // --- Heatmap -> Structure ---
        else if (S === 'heatmap' && T === 'structure') {
            const { rowLabels } = next[originId] || {};
            if (rowLabels) {
                const parseLabel = (lbl) => {
                    const m = String(lbl).trim().match(/^([A-Za-z0-9]):(\d+)([A-Za-z]?)$/);
                    return m ? { chainId: m[1], resi: Number(m[2]), icode: m[3]||'' } : null;
                };
                const list = [parseLabel(rowLabels[site.row]), parseLabel(rowLabels[site.col])].filter(Boolean);
                if (list.length > 0) {
                    next[targetId] = { ...cur, linkedResiduesByKey: list, linkedChainId: list[0].chainId };
                }
            }
        }

        // --- Heatmap -> Heatmap ---
        else if (S === 'heatmap' && T === 'heatmap') {
            const { rowLabels, colLabels } = next[originId] || {};
            if (rowLabels && colLabels && site?.row != null && site?.col != null) {
                const nextCell = { row: rowLabels[site.row], col: colLabels[site.col] };
                next[targetId] = { ...cur, linkedHighlightCell: nextCell };
            }
        }
        
        // --- Alignment/SeqLogo -> Histogram ---
        else if ((S === 'alignment' || S === 'seqlogo') && T === 'histogram') {
             let barIndex = -1; 
             const targetData = cur;
             
             if (targetData && targetData.data) {
                if (!Array.isArray(targetData.data)) {
                    // Tabular: Find row where X-column value matches (site + 1)
                    const xCol = targetData.selectedXCol || targetData.data.headers.find(h => typeof targetData.data.rows[0][h] === 'number');
                  
                    if (xCol) {
                        const indexing_base = targetData.indexingMode === '0-based' ? 0 : 1;
                        const matchingRow = targetData.data.rows.findIndex(row => row[xCol] == site + indexing_base); // loose equality
                        if (matchingRow !== -1) barIndex = matchingRow;
                    }
                } else {
                    // Simple array: direct index mapping
                    barIndex = site;
                }
             }
             if (barIndex !== -1) {
                 next[targetId] = { ...cur, highlightedSite: site, highlightedSites: [barIndex] };
             }
             else {
                 next[targetId] = { ...cur, highlightedSite: null, highlightedSites: [] };
             }
        }
        
        // --- Alignment -> Structure ---
        else if (S === 'alignment' && T === 'structure') {
             const cacheKey = `${originId}|${targetId}`;
             const mapping = currentAlignmentStructureChainCache.get(cacheKey);
             if (mapping?.seq) {
                 const residIdx = msaColToResidueIndex(mapping.seq.sequence, site);
                 next[targetId] = { ...cur, linkedResidueIndex: residIdx, linkedChainId: mapping.chainId };
             }
        }
        
        // --- Structure -> Alignment ---
        else if (S === 'structure' && T === 'alignment') {
             if (site && site.residueIndex != null && site.chainId) {
                 const cacheKey = `${targetId}|${originId}`;
                 const mapping = currentAlignmentStructureChainCache.get(cacheKey);
                 if (mapping?.seq && mapping.chainId === site.chainId) {
                     const col = residueIndexToMsaCol(mapping.seq.sequence, site.residueIndex);
                     if (col != null) {
                         next[targetId] = { ...cur, linkedSiteHighlight: col };
                         const isCodon = !!cur.codonMode;
                         setScrollPositions(prevSP => ({ ...prevSP, [targetId]: col * (isCodon ? 3 : 1) * CELL_SIZE }));
                     }
                 }
             }
        }

        // --- Histogram -> Alignment or SeqLogo ---
        else if (S === 'histogram' && (T === 'alignment' || T === 'seqlogo')) {
            let targetSite = null;

            targetSite = Number(site);

            // 2. Apply to Target
            if (targetSite !== null && !Number.isNaN(targetSite) && targetSite >= 0 && Number.isInteger(targetSite)) {
               next[targetId] = { ...cur, highlightedSite: targetSite };
               
               // Update Scroll
               const isCodon = !!cur.codonMode; // Only valid for alignment, undefined for seqlogo
               const multiplier = (T === 'alignment' && isCodon) ? 3 : 1;
               setScrollPositions(prevSP => ({ ...prevSP, [targetId]: targetSite * multiplier * CELL_SIZE }));
            }
        }

        // --- Tree -> Histogram ---
        else if (S === 'tree' && T === 'histogram') {
           if (typeof site === 'string') {
              const targetData = cur;
              if (targetData?.data?.rows && targetData.selectedXCol) {
                  const rows = targetData.data.rows;
                  const xCol = targetData.selectedXCol;
                  const highlightedSites = [];
                  let firstMatch = null;
                  
                    for (let i = 0; i < rows.length; i++) {
                      if (rows[i][xCol] === site) { // loose equality
                          highlightedSites.push(i); 
                          if (firstMatch === null) firstMatch = i;
                      }
                    }
                  next[targetId] = { ...cur, highlightedSite: firstMatch, highlightedSites };
              }
           }
        }

        // --- Histogram -> Tree ---
        else if (S === 'histogram' && T === 'tree') {
            let leafName = site;
            const sourceData = next[originId];
            
            if (typeof site === 'number' && sourceData && !Array.isArray(sourceData.data)) {
                 const rows = sourceData.data.rows;
                 const xCol = sourceData.selectedXCol;
                 if (rows && rows[site] && xCol) {
                     leafName = rows[site][xCol];
                 }
            }

            const validLeafNames = currentTreeLeafNamesCache.get(targetId);
            if (validLeafNames && (typeof leafName === 'string' || typeof leafName === 'number')) {
                const strName = String(leafName);
                if (validLeafNames.has(strName)) {
                    next[targetId] = { ...cur, linkedHighlights: [strName] };
                } else {
                    next[targetId] = { ...cur, linkedHighlights: [] };
                }
            }
        }

        // --- Histogram -> Histogram ---
       else if (S === 'histogram' && T === 'histogram') {
            let highlightedSites = [];
            const targetData = cur;

            if (typeof site === 'string') {
                // Search for string value in target rows
                if (targetData?.data?.headers && targetData?.data?.rows) {
                    const xCol = targetData.selectedXCol;
                    if (xCol) {
                        const rows = targetData.data.rows;
                        for (let i = 0; i < rows.length; i++) {
                            if (rows[i][xCol] === site) { highlightedSites.push(i); }
                        }
                    }
                }
            } else {
                // Site is an index (number)
                highlightedSites = [site];
            }

            const prevHighlights = cur.highlightedSites || [];
            const isSame = prevHighlights.length === highlightedSites.length && 
                           prevHighlights.every((val, idx) => val === highlightedSites[idx]);

            if (!isSame) {
                 const singleSite = highlightedSites.length > 0 ? highlightedSites[0] : null;
                 next[targetId] = { ...cur, highlightedSites, highlightedSite: singleSite };
            }
        }
      });

      return next;
    });
  }, [panelLinks, setPanelData, setScrollPositions, linkTypeCache, pairKey]);

 useEffect(() => {
    // This effect acts as a safeguard. If a highlight is active (highlightOrigin is set)
    // but the mouse is no longer hovering over that origin panel, it means the
    // hover has ended. We then explicitly call handleHighlight with `null` to ensure
    // all downstream clearing logic (for both global and panel-specific highlights) is run.
    if (highlightOrigin && hoveredPanelId !== highlightOrigin) {
      handleHighlight(null, highlightOrigin);
    }
  }, [hoveredPanelId, highlightOrigin, handleHighlight]);

    useEffect(() => {
    const originPanel = panels.find(p => p.i === hoveredPanelId);

    // If the currently hovered panel is a tree, treat its highlighted leaf
    // as a global highlight event.
    if (originPanel && originPanel.type === 'tree') {
      handleHighlight(highlightedSequenceId, hoveredPanelId);
    }
  }, [highlightedSequenceId, hoveredPanelId]);

  const triggerUpload = useCallback((type, panelId = null) => {
      pendingTypeRef.current = type;
      pendingPanelRef.current = panelId;
      if (fileInputRef.current) fileInputRef.current.click();
    }, []);

const handleCreateColorMatrix = useCallback((id) => {
    const sourceData = panelData[id];
    if (!sourceData || !Array.isArray(sourceData.data) || sourceData.data.length === 0) {
      alert('Cannot create color matrix from empty or invalid alignment.');
      return;
    }

    const msa = sourceData.data;
    const rowLabels = msa.map(seq => seq.id);
    const colCount = msa[0]?.sequence.length || 0;
    const colLabels = Array.from({ length: colCount }, (_, i) => String(i + 1));
    const matrix = msa.map(seq => seq.sequence.split(''));

    const baseName = (sourceData.filename ? sourceData.filename.replace(/\.[^.]+$/, '') : 'alignment');
    const newFilename = `${baseName}.colors.tsv`;

    addPanel({
      type: 'heatmap',
      data: {
        matrix,
        rowLabels,
        colLabels,
        filename: newFilename,
        isMsaColorMatrix: true,
        isSquare: false,
      },
      basedOnId: id,
      layoutHint: { w: 6, h: 20 },
      autoLinkTo: id,
    });
}, [panelData, addPanel]);

const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const type = pendingTypeRef.current;
    const isReupload = Boolean(pendingPanelRef.current);
    const id = isReupload ? pendingPanelRef.current : `${type}-${Date.now()}`;
    const filename = file.name;

    let panelPayload;
    if (type === 'alignment') {
      const text = await file.text();
      const parsed = parseFasta(text);
      const originalOrder = parsed.map(seq => seq.id);
      panelPayload = { data: parsed, originalOrder, filename };
    } else if (type === 'tree') {
        const text = await file.text();
        const isNhx = /\.nhx$/i.test(filename) || text.includes('[&&NHX');
        panelPayload = { data: text, filename, isNhx };
    } else if (type === 'histogram') {
        const text = await file.text();
        const lines = text.trim().split(/\r?\n/);
        const lower = filename.toLowerCase();

        if ((lower.endsWith('.tsv') && lines[0]?.includes('\t')) ||
            (lower.endsWith('.csv') && lines[0]?.includes(','))) {
            const isTSV = lower.endsWith('.tsv');
            const delimiter = isTSV ? '\t' : ',';
            const headers = lines[0].split(delimiter).map(h => h.trim());
            const rows = lines.slice(1).map(line => {
                const cols = line.split(delimiter);
                const obj = {};
                headers.forEach((h, i) => {
                    const v = cols[i]?.trim();
                    const n = Number(v);
                    obj[h] = Number.isFinite(n) && v !== '' ? n : v;
                });
                return obj;
            });

            // Correctly determine the default X column and use it for detection.
            const defaultXCol = headers.find(h => typeof rows[0]?.[h] === 'number') || headers[0];
            const xValues = rows.map(r => r[defaultXCol]);
            const indexingMode = detectIndexingMode(xValues);

            panelPayload = {
                data: { headers, rows },
                filename,
                indexingMode,
                selectedXCol: defaultXCol
            };

        } else {
            // This handles plain text files with lists of numbers
            // if there are multiple lines we read as if each line is a number, otherwise we treat the single line as spaces/comma-separated numbers
            let linesToProcess = lines;
            if (lines.length === 1) {
                linesToProcess = lines[0].split(/[\s,]+/);
            }
            const values = linesToProcess.map(s => Number(s.trim())).filter(n => Number.isFinite(n));
            const xValues = values.map((_, i) => i + 1);
            const indexingMode = detectIndexingMode(xValues); // Will be '1-based'
            panelPayload = { data: values, filename, xValues, indexingMode };
        }
    } else if (type === 'heatmap') {
        const text = await file.text();
        const lower = filename.toLowerCase();
        if (lower.endsWith('.tsv') || lower.endsWith('.csv')) {
            panelPayload = { ...parseTsvMatrix(text), filename };
        } else {
            const parsed = parsePhylipDistanceMatrix(text);
            panelPayload = { ...parsed, filename, isSquare: true, rowLabels: parsed.labels, colLabels: parsed.labels };
        }
    } else if (type === 'structure') {
        const text = await file.text();
        panelPayload = { pdb: text, filename };
    }

    // Update or add panel data
    if (isReupload) {
        setPanelData(prev => ({ ...prev, [id]: panelPayload }));
    } else {
        const layoutHint = { w: 4 };
        // Don't specify a height for alignments, letting addPanel calculate it.
        // For other types, use a default height.
        if (type !== 'alignment') {
            layoutHint.h = 20;
        }
        addPanel({
            type,
            data: panelPayload,
            layoutHint: layoutHint
        });
    }

    // Reset input
    pendingTypeRef.current = null;
    pendingPanelRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = null;
};

const handleFetchPdb = useCallback(async (pdbId) => {
    if (!pdbId) return;
    const sanitizedId = pdbId.trim().toUpperCase();
    setTransientMessage(`Fetching ${sanitizedId}...`);

    try {
      const response = await fetch(`https://files.rcsb.org/download/${sanitizedId}.pdb`);
      if (!response.ok) {
        throw new Error(`PDB entry '${sanitizedId}' not found or failed to load (Status: ${response.status})`);
      }
      const text = await response.text();

      addPanel({
        type: 'structure',
        data: { pdb: text, filename: `${sanitizedId}.pdb` },
        layoutHint: { w: 4, h: 20 }
      });
      setTransientMessage(''); // Clear message on success
    } catch (error) {
      console.error("PDB Fetch Error:", error);
      alert(error.message);
      setTransientMessage(''); // Clear message on error
    }
  }, [addPanel]);

  const removePanel = useCallback((id) => {
    setState(present => {
        const newPanelData = { ...present.panelData };
        delete newPanelData[id];
        
        const newPanels = present.panels.filter(p => p.i !== id);
        const newLayout = present.layout.filter(e => e.i !== id);

        const newPanelLinks = { ...present.panelLinks };
        const partners = Array.isArray(newPanelLinks[id]) ? newPanelLinks[id] : [];
        delete newPanelLinks[id];
        partners.forEach(pid => {
            if (Array.isArray(newPanelLinks[pid])) {
                newPanelLinks[pid] = newPanelLinks[pid].filter(x => x !== id);
                if (newPanelLinks[pid].length === 0) delete newPanelLinks[pid];
            }
        });

        const newLinkColors = {};
        for (const [k, v] of Object.entries(present.linkColors)) {
            const [x,y] = k.split('|');
            if (x !== String(id) && y !== String(id)) newLinkColors[k] = v;
        }

        const newPanelLinkHistory = { ...present.panelLinkHistory };
        delete newPanelLinkHistory[id];
        for (const k of Object.keys(newPanelLinkHistory)) {
           newPanelLinkHistory[k] = (newPanelLinkHistory[k] || []).filter(pid => pid !== id);
        }

        if (linkMode === id) setLinkMode(null);
        if (highlightOrigin === id) {
            setHighlightOrigin(null);
        }
        
        return {
            panels: newPanels,
            layout: newLayout,
            panelData: newPanelData,
            panelLinks: newPanelLinks,
            panelLinkHistory: newPanelLinkHistory,
            linkColors: newLinkColors,
        };
    }, true); // Save to history
  }, [setState, linkMode, highlightOrigin]);

  // Build a symmetric history from either board.panelLinkHistory or, if missing,
  // derive it from board.panelLinks so badges still show up on old boards.
  const buildHistory = (board) => {
    if (board.panelLinkHistory && typeof board.panelLinkHistory === 'object') {
      // normalize to arrays of unique ids
      const out = {};
      for (const [k, v] of Object.entries(board.panelLinkHistory)) {
        const set = new Set(Array.isArray(v) ? v : []);
        out[k] = [...set];
      }
      return out;
    }
    // derive from current active links (1:1), make it symmetric
    const outSets = {};
    const add = (a, b) => {
      if (!a || !b) return;
      (outSets[a] ??= new Set()).add(b);
      (outSets[b] ??= new Set()).add(a);
    };
   const links = board.panelLinks || {};
    for (const [a, b] of Object.entries(links)) add(a, b);
    const out = {};
    for (const [k, s] of Object.entries(outSets)) out[k] = [...s];
    return out;
  };

const rehydrateBoardState = (board) => {
  if (!board || !board.panelData || !board.panels) {
    return board;
  }

  const heatmapPanels = board.panels.filter(p => p.type === 'heatmap');

  for (const panel of heatmapPanels) {
    const panelData = board.panelData[panel.i];
    if (!panelData) continue;

    // Re-create matrix proxy if it's a plain object
    if (panelData.matrix && typeof panelData.matrix === 'object' && panelData.matrix.n && panelData.matrix.data) {
        const flatValues = Object.values(panelData.matrix.data);
        const buffer = new Float64Array(flatValues).buffer;
        panelData.matrix = createMatrixView(buffer, panelData.matrix.n);
    }

    // Normalize old heatmap data format to new format upon loading
    // This ensures linking and other functions work correctly.
    if (panelData.labels && !panelData.rowLabels) {
        panelData.rowLabels = panelData.labels;
        panelData.colLabels = panelData.labels;
        panelData.isSquare = true;
    }
  }

  return board;
};

  const loadBoardFromFile = (text) => {
    try {
      const parsedBoard = JSON.parse(text);
      const board = rehydrateBoardState(parsedBoard);
       setHistory({
            past: [],
            present: {
                panels: board.panels || [],
                layout: board.layout || [],
                panelData: board.panelData || {},
                panelLinks: board.panelLinks || {},
                panelLinkHistory: buildHistory(board),
                linkColors: board.linkColors || {},
            },
            future: [],
        });
      setTitleFlipKey(Date.now());
    } catch (err) {
      alert('Invalid board file (.json)');
    }
  };


  const handleLoadBoard = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    loadBoardFromFile(text);
    // Reset input
    if (fileInputRefBoard.current)
    fileInputRefBoard.current.value = null;
  };


  const handleSaveBoard = () => {
    // We only need to save the 'present' state.
    const board = { ...history.present };
    mkDownload('mseaboard', JSON.stringify(board, null, 2), 'json', 'application/json')();
  };

  // Gist Sharing with Token Auth and Compression
  const handleShareBoard = useCallback(async (token) => {
    const tokenToUse = githubToken;
    if (!tokenToUse) {
      setShowTokenModal(true);
      return;
    }
    setTransientMessage('Creating shareable link...');
    try {
        const boardState = { ...history.present };
        const jsonString = JSON.stringify(boardState);
        const compressed = pako.deflate(jsonString);
        const base64 = uint8ArrayToBase64(compressed);

        const content = JSON.stringify({
            'description': 'MSEABOARD State',
            'compressed_base64': base64
        });
        const response = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: {
                'Authorization': `token ${tokenToUse}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json',
            },
            body: JSON.stringify({
                description: 'A shared board from MSEABOARD',
                public: false, // Creates a secret Gist
                files: {
                    'board.json': {
                        content: content,
                    },
                },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`GitHub API Error: ${errorData.message}`);
        }

        const gist = await response.json();
        const url = `${window.location.origin}${window.location.pathname}?board=${gist.id}`;

        // Safari fix: Clipboard API requires HTTPS and user gesture
        try {
            // Try the modern clipboard API first (works in Chrome/Firefox)
            await navigator.clipboard.writeText(url);
            setTransientMessage('Shareable link copied to clipboard!');
        } catch (err) {
            // If it fails, fall back to the prompt for Safari and older browsers
            console.warn('Clipboard API failed, falling back to prompt.', err);
            window.prompt('Link created! Press ⌘+C (or Ctrl+C) to copy:', url);
        }

    } catch (error) {
         alert("Authentication failed. Your GitHub token is likely invalid or expired. Please generate a new one.");
                 localStorage.removeItem('github-pat'); // Clear the bad token
                 setGithubToken('');
                 setShowTokenModal(true); // Re-prompt the user
                 return;
    }
  }, [githubToken, history.present]);

  // Load board from Gist on initial render
    useEffect(() => {
    const loadBoardFromGist = async (gistId) => {
        try {
            //alert(`Loading shared board: ${gistId}...`);
            // Step 1: Fetch Gist metadata to find the raw_url
            const gistMetaResponse = await fetch(`https://api.github.com/gists/${gistId}`);
            if (!gistMetaResponse.ok) {
                throw new Error('Could not find the shared board Gist.');
            }
            const gist = await gistMetaResponse.json();

            const boardFile = gist.files['board.json'];
            if (!boardFile) {
                throw new Error("Gist is empty or has an invalid format (missing board.json).");
            }

            // Step 2: Fetch the full content from the raw_url to avoid truncation
            const rawUrl = boardFile.raw_url;
            const contentResponse = await fetch(rawUrl);
            if (!contentResponse.ok) {
                throw new Error("Could not fetch the board's raw content.");
            }
            const boardWrapper = await contentResponse.json();
            
            // Step 3: Decompress and parse the board state
            const base64 = boardWrapper.compressed_base64;
            if (!base64) {
                throw new Error("Gist content is missing the compressed data.");
            }
            
            const compressed = base64ToUint8Array(base64);
            const jsonString = pako.inflate(compressed, { to: 'string' });
            const parsedBoard = JSON.parse(jsonString);
            const board = rehydrateBoardState(parsedBoard);

            if (board.panels && board.layout && board.panelData) {
                setHistory({
                    past: [],
                    present: {
                        panels: board.panels,
                        layout: board.layout,
                        panelData: board.panelData,
                        panelLinks: board.panelLinks || {},
                        panelLinkHistory: buildHistory(board),
                        linkColors: board.linkColors || {},
                    },
                    future: [],
                });
                setTitleFlipKey(Date.now());
            } else {
                throw new Error("Board data is missing required fields.");
            }

        } catch (error) {
            console.error("Failed to load board from Gist:", error);
            alert(`Error loading shared board: ${error.message}`);
        } finally {
            // Clean the URL to prevent re-loading on refresh
            if (window.history.replaceState) {
                const url = new URL(window.location);
                url.searchParams.delete('board');
                window.history.replaceState({}, '', url.toString());
            }
        }
    };
    
    const urlParams = new URLSearchParams(window.location.search);
    const gistId = urlParams.get('board');
    if (gistId) {
        loadBoardFromGist(gistId);
    }
  }, []); // Empty dependency array ensures this runs only once on mount


// Drag-and-drop file upload

const [isDragging, setIsDragging] = useState(false);
const dragCounter = useRef(0); // helps ignore child enter/leave flicker


// --- build panel payload from file  ---
const buildPanelPayloadFromFile = async (file) => {
  const filename = file.name;
  const lowerFilename = filename.toLowerCase();

 const supportedImageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif', '.bmp', '.ico'];

  if (supportedImageExtensions.some(ext => lowerFilename.endsWith(ext))) {
    const src = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
    return { type: 'image', payload: { src, filename } };
  }
  const text = await file.text();
  const kind = detectFileType(filename, text);

  if (kind === 'board') {
    // caller will handle board specially
    return { type: 'board', payload: text, filename };
  }

  if (kind === 'alignment') {
    const parsed = parseFasta(text);
    return { type: 'alignment', payload: { data: parsed, filename } };
  }

  if (kind === 'tree') {
    const isNhx = /\.nhx$/i.test(filename) || text.includes('[&&NHX');
    return { type: 'tree', payload: { data: text, filename, isNhx } };
  }

  if (kind === 'histogram') {
    const lines = text.trim().split(/\r?\n/);
    const lower = filename.toLowerCase();
    if ((lower.endsWith('.tsv') && lines[0]?.includes('\t')) ||
        (lower.endsWith('.csv') && lines[0]?.includes(','))) {
      const isTSV = lower.endsWith('.tsv');
      const delimiter = isTSV ? '\t' : ',';
      const headers = lines[0].split(delimiter).map(h => h.trim());
      const rows = lines.slice(1).map(line => {
        const cols = line.split(delimiter);
        const obj = {};
        headers.forEach((h, i) => {
          const v = cols[i]?.trim();
          const n = Number(v);
          obj[h] = Number.isFinite(n) && v !== '' ? n : v;
        });
        return obj;
      });
      
      const defaultXCol = headers.find(h => typeof rows[0]?.[h] === 'number') || headers[0];
      const xValues = rows.map(r => r[defaultXCol]);
      const indexingMode = detectIndexingMode(xValues);

      return { type: 'histogram', payload: {
          data: { headers, rows },
          filename,
          indexingMode,
          selectedXCol: defaultXCol
      }}; 
    } else {
      const values = lines.map(s => Number(s.trim())).filter(n => Number.isFinite(n));
      const xValues = values.map((_, i) => i + 1);
      const indexingMode = detectIndexingMode(xValues);
      return { type: 'histogram', payload: { data: values, filename, xValues, indexingMode } };
    }

    }
  if (kind === 'heatmap') {
    try {
        const lower = filename.toLowerCase();
        if (lower.endsWith('.tsv') || lower.endsWith('.csv')) {
            return { type: 'heatmap', payload: { ...parseTsvMatrix(text), filename } };
        }
      const parsed = parsePhylipDistanceMatrix(text);
      return { type: 'heatmap', payload: { ...parsed, filename, isSquare: true, rowLabels: parsed.labels, colLabels: parsed.labels } };
    } catch {
      // fall back to unknown
    }
  }

  if (kind === 'structure') {
    return { type: 'structure', payload: { pdb: text, filename } };
  }

  return { type: 'unknown', payload: { filename } };
};

const handleCreateTreeStats = useCallback((treePanelId) => {
  const treeData = panelData[treePanelId];
  if (!treeData?.data) return;

  try {
    // Compute statistics
    const stats = computeTreeStats(treeData.data);
    
    // Convert to histogram-compatible format
    const histogramData = {
      headers: ['leaf', 'distanceToRoot', 'avgDistanceToOthers'],
      rows: stats.map(stat => ({
        leaf: stat.name,
        distanceToRoot: stat.distanceToRoot,
        avgDistanceToOthers: stat.avgDistanceToOthers
      }))
    };
    
    const baseName = (treeData.filename || 'tree').replace(/\.[^.]+$/, '');
    
    // Create new histogram panel
    addPanel({
      type: 'histogram',
      data: {
        data: histogramData,
        filename: `${baseName}_stats.csv`,
        selectedXCol: 'leaf', // Default to leaf names for X-axis
        selectedCol: 'distanceToRoot', // Default to show distance to root
        indexingMode: '1-based'
      },
      basedOnId: treePanelId,
      layoutHint: { w: 12, h: 8 },
      autoLinkTo: treePanelId,
    });
    
  } catch (error) {
    alert(`Failed to compute tree statistics: ${error.message}`);
    console.error('Tree stats computation error:', error);
  }
}, [panelData, addPanel]);


const handleCreateSiteStatsHistogram = useCallback((id) => {
  const data = panelData[id];
  if (!data || !Array.isArray(data.data)) return;

  const isCodon = !!data.codonMode;
  const table = computeSiteStats(data.data, isCodon);

  const xCol = isCodon ? 'codon' : 'site';
  const xValues = table.rows.map(row => row[xCol]);
  const indexingMode = detectIndexingMode(xValues);

  const baseName = (data.filename ? data.filename : 'alignment');
  addPanel({
    type: 'histogram',
    data: {
      data: table,
      filename: `${baseName}.stats${isCodon ? '_codon' : ''}.csv`,
      selectedXCol: xCol,
      selectedCol: 'conservation',
      indexingMode: indexingMode,
    },
    basedOnId: id,
    layoutHint: { w: 12, h: 7 },
    autoLinkTo: id,
  });
}, [panelData, addPanel]);

// drop handlers
const handleDragEnter = (e) => {
  e.preventDefault();
  e.stopPropagation();
  dragCounter.current += 1;
  setIsDragging(true);
};
const handleDragOver = (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (!isDragging) setIsDragging(true);
};
const handleDragLeave = (e) => {
  e.preventDefault();
  e.stopPropagation();
  dragCounter.current -= 1;
  if (dragCounter.current <= 0) {
    setIsDragging(false);
  }
};
const resetDrag = () => { dragCounter.current = 0; setIsDragging(false); };

const handleDrop = async (e) => {
  e.preventDefault();
  e.stopPropagation();
  const files = Array.from(e.dataTransfer?.files || []);
  resetDrag();
  if (!files.length) return;

  // if exactly one JSON => treat as board load
  const onlyFile = files.length === 1 ? files[0] : null;
  if (onlyFile && onlyFile.name.toLowerCase().endsWith('.json')) {
    const text = await onlyFile.text();
    loadBoardFromFile(text);
    return;
  }

  // otherwise, open each supported file in its panel
  for (const f of files) {
    try {
      const built = await buildPanelPayloadFromFile(f);
      if (built.type === 'unknown') {
        console.warn(`Unsupported or unrecognized file: ${f.name}`);
        continue;
      }
      if (built.type === 'board') {
        // when mixed files include json, skip board load to avoid clobbering current work
        console.warn(`Skipping board file ${f.name} in multi-file drop to avoid overwriting current board.`);
        continue;
      }
      const layoutHint = { w: 4 };
      if (built.type === 'seqlogo') {
        layoutHint.h = 8;
      } else if (built.type !== 'alignment') {
        layoutHint.h = 20;
      }
      addPanel({
        type: built.type,
        data: built.payload,
        layoutHint: layoutHint
      });
    } catch (err) {
      console.error('Failed to open dropped file', f.name, err);
    }
  }
};


const LINK_COMPAT = {
  alignment: new Set(['alignment','seqlogo','histogram','structure','tree', 'heatmap']),
  seqlogo:   new Set(['alignment','histogram','seqlogo']),
  histogram: new Set(['alignment','histogram','seqlogo','tree']),
  heatmap:   new Set(['tree','heatmap','alignment','structure']),
  tree:      new Set(['alignment','heatmap','tree','histogram']),
  structure: new Set(['alignment','heatmap']),
  notepad:   new Set([]),
  image:     new Set([]),
};

const canLink = (typeA, typeB) => {
  return !!(LINK_COMPAT[typeA] && LINK_COMPAT[typeA].has(typeB));
};

// Auto-save and Restore Session

// Debounced function to save state to localStorage
const debouncedSaveState = useMemo(
    () => debounce((stateToSave) => {
        try {
            // Do not save if the board is empty
            if (!stateToSave || stateToSave.panels.length === 0) {
                localStorage.removeItem('mseaboard-autosave');
                return;
            }
            const jsonString = JSON.stringify(stateToSave);
            const compressed = pako.deflate(jsonString);
            const base64 = uint8ArrayToBase64(compressed);
            localStorage.setItem('mseaboard-autosave', base64);
        } catch (e) {
            console.error("Could not save session:", e);
        }
    }, 1000), // Save 1 second after the last change
    []
);

// Effect to trigger save when state changes
useEffect(() => {
    // Avoid saving the initial blank state on first load
    if (history.past.length === 0 && history.present.panels.length === 0) {
        return;
    }
    debouncedSaveState(history.present);
}, [history.present, debouncedSaveState]);

// Check for a saved session on initial app load
useEffect(() => {
    // Check only if the board is currently empty
    if (panels.length === 0) {
        const savedStateJSON = localStorage.getItem('mseaboard-autosave');
        if (savedStateJSON) {
            setShowRestoreButton(true);
        }
    }
}, []); // Empty array ensures this runs only once on mount

const handleRestoreSession = useCallback(() => {
    const savedBase64 = localStorage.getItem('mseaboard-autosave');
    if (savedBase64) {
        try {
            const compressed = base64ToUint8Array(savedBase64);
            const jsonString = pako.inflate(compressed, { to: 'string' });
            const savedState = JSON.parse(jsonString);
            const rehydratedState = rehydrateBoardState(savedState);
            
            setHistory(h => ({ ...h, present: rehydratedState, past: [], future: [] }));
            setTitleFlipKey(Date.now());
        } catch (e) {
            alert("Failed to restore session: " + e);
            localStorage.removeItem('mseaboard-autosave'); // Clear corrupted data
        }
    }
    setShowRestoreButton(false);
}, []);

    return (
<div
  className="h-screen w-screen flex flex-col overflow-hidden bg-white text-black"
  onDragEnter={handleDragEnter}
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
>
<ConfirmationBanner 
      isOpen={confirmation.isOpen}
      message={confirmation.message}
      onConfirm={confirmation.onConfirm}
      onCancel={confirmation.onCancel}
    />
{transientMessage && (
  <div className="fixed inset-0 z-[10002] flex items-center justify-center">
    <div className="bg-blue-400 text-white px-6 py-5 rounded-xl shadow-lg text-2xl font-semibold transition-all animate-fade-in-out">
      {transientMessage}
    </div>
  </div>
)}
  {isDragging && (
  <div className="pointer-events-none fixed inset-0 z-[10000] bg-black/30 flex items-center justify-center">
    <div className="pointer-events-none bg-white rounded-xl shadow-xl px-20 py-12 text-center">
      <div className="text-3xl text-gray-700 font-bold">Drop files to open</div>
      <div className="text-base text-gray-600 mt-1">
        • JSON: Load board <br></br> • Other formats: Open in a panel
      </div>
    </div>
  </div>
)}
{/* Token Modal */}
{showTokenModal && (
    <div className="fixed inset-0 z-[10001] bg-black/50 flex items-center justify-center" onClick={() => setShowTokenModal(false)}>
        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4">GitHub Token Required</h2>
            <p className="mb-4 text-gray-700">
                To create a shareable link via a secret Gist, a GitHub Personal Access Token is required. This token is stored securely in your browser's local storage and is only used to communicate with the GitHub API.
            </p>
            <ol className="list-decimal list-inside mb-4 space-y-2">
                <li>
                    <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">
                        Generate a new token
                    </a> (classic).
                </li>
                <li>Give it a descriptive name (e.g., "MSEABOARD Sharing").</li>
                <li>Set an expiration date (for the token, the links created with it won't expire).</li>
                <li>
                    Under "Select scopes", check the box next to <strong><code>gist</code></strong>. No other permissions are needed.
                </li>
                <li>Click "Generate token" and copy the new token.</li>
            </ol>
            <input
                type="password"
                value={tempToken}
                onChange={(e) => setTempToken(e.target.value)}
                placeholder="Paste your token here (ghp_...)"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-6 flex justify-end gap-4">
                <button
                    onClick={() => setShowTokenModal(false)}
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                    Cancel
                </button>
                <button
                    onClick={() => {
                        if (tempToken) {
                            localStorage.setItem('github-pat', tempToken);
                            setGithubToken(tempToken);
                            setShowTokenModal(false);
                            handleShareBoard(tempToken); // Retry sharing immediately
                        }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    disabled={!tempToken}
                >
                    Save & Share
                </button>
            </div>
        </div>
    </div>
)}
        <div className="p-0 flex justify-between items-center fixed top-0 left-0 w-full z-50"
        style={{ pointerEvents: 'none' }}>
          <div style={{ height: 12 }} /> {/* Spacer for fixed header */}
<div className="flex items-center gap-2"  style={{ pointerEvents: 'auto' }}>
<div className="p-1/2 flex justify-between items-center"></div>
<TopBar
        canUndo={canUndo}
        undo={undo}
        canRedo={canRedo}
        redo={redo}
        handleSaveBoard={handleSaveBoard}
        fileInputRefBoard={fileInputRefBoard}
        handleLoadBoard={handleLoadBoard}
        handleShareBoard={handleShareBoard}
        addPanel={addPanel}
        triggerUpload={triggerUpload}
        fileInputRef={fileInputRef}
        handleFileUpload={handleFileUpload}
        handleFetchPdb={handleFetchPdb} 
      />

        </div>
        </div>
{/* instructions and example */}
{panels.length === 0 && (
  <div className="flex flex-col items-center justify-center px-3 w-full" style={{ marginTop: 3 }}>
    <div
      style={{
        height: 58,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        width: '100%',
        position: 'relative',
        left: 0,
        top: 0,
        marginLeft: 0,
        marginRight: 0,
      }}
    >
    <TitleFlip key={titleFlipKey} text="MSEABOARD" colors={logoColors}/>
    </div><div
      style={{
        height: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        width: '100%',
        position: 'relative',
        left: 0,
        top: 0,
        marginLeft: 0,
        marginRight: 0,
      }}
    >
      </div>
            <div className="text-2xl font-bold mb-4 text-gray-400">
              <div className='text-center'>Welcome to MSEABOARD</div>
              Drag and drop files or use the upload buttons above
            </div>
<div className="flex items-center gap-2 mt-2">
<div className="flex items-center gap-2 mt-20 mr-6">

  <button
    className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-2xl font-semibold px-4 py-4 rounded-xl shadow-xl transition text-center"
    onClick={() => window.open('https://www.mseaboard.com/?board=ddbcd607cbe8cfec3736521433f4ead8', '_self')}
  >
    Manual, showcase <br /> and example boards
  </button>
</div>
<div className="flex items-center gap-2 mt-20">

  <button
    className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-2xl font-semibold px-4 py-4 rounded-xl shadow-xl transition text-center"
    onClick={() => window.open('https://www.mseaboard.com/?board=219ab0d7eb433c94d548179b37b6a432', '_self')}
  >
    Load an example <br /> directly
  </button>
</div>
</div>
{/* Restore Session Button */}
{showRestoreButton && (
        <button className="bg-blue-100 hover:bg-blue-200 rounded-2xl shadow-xl p-4 w-full max-w-sm text-center mt-24 transition" onClick={handleRestoreSession}>
            <h2 className="text-2xl text-gray-700 font-bold mb-2">Restore Board</h2>
            <p className="mb-2 text-gray-700 text-base font-semibold">
                Click to restore your last session on this browser
            </p>
      
        </button>
)}
          </div>
        )}

              {panels.length > 0 && (
        <div className="flex-grow overflow-auto pb-20">
 <div
      style={{
        height: 58,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        width: '100%',
        position: 'relative',
        left: 0,
        top: 0,
        marginLeft: 0,
        marginRight: 0,
      }}
    >
      <div className="flex flex-col items-center justify-center px-3 w-full" style={{ marginTop: 6 }}>
      <TitleFlip key={titleFlipKey} text="MSEABOARD" colors={logoColors}/>
      </div>
    </div>
          <GridLayout
            className="layout"
            layout={layout}
            cols={12}
            rowHeight={30}
            width={windowWidth}
            autoSize={false}
            isResizable
            isDraggable
            margin={[8,8]}
            containerPadding={[8,8]}
            draggableHandle=".panel-drag-handle"
            draggableCancel="select, option, input, textarea, button"
            onLayoutChange={(newLayout) => {
              const footer = newLayout.find(l => l.i === '__footer');
              const others = newLayout.filter(l => l.i !== '__footer');
              const maxY = others.reduce((max, l) => Math.max(max, l.y + l.h), 0);
              const fixedFooter = { ...(footer || {}), y: maxY };
              // Do not save to history on general layout changes
              setState(p => ({ ...p, layout: [...others, fixedFooter] }), false);
            }}
            onDragStop={(newLayout) => {
               // But do save to history when a user finishes dragging
              setState(p => ({...p, layout: newLayout}), true)
            }}
            onResizeStop={(newLayout) => {
              // And do save to history when a user finishes resizing
              setState(p => ({...p, layout: newLayout}), true)
            }}
          >
{panels.map(panel => {
  if (panel.i === '__footer') {
    return (
      <div key="__footer" className="flex items-center justify-center text-gray-500 text-sm" />
    );
  }
  
  return (
    <div key={panel.i}>
      <PanelWrapper
        panel={panel}
        linkMode={linkMode}
        panels={panels}
        panelData={panelData}
        panelLinks={panelLinks}
        panelLinkHistory={panelLinkHistory}
        hoveredPanelId={hoveredPanelId}
        justLinkedPanels={justLinkedPanels}
        handleRestoreLink={handleRestoreLink}
        handleUnlink={handleUnlink}
        colorForLink={colorForLink}
        removePanel={removePanel}
        triggerUpload={triggerUpload}
        duplicatePanel={duplicatePanel}
        handleLinkClick={handleLinkClick}
        handleHighlight={handleHighlight}
        setHoveredPanelId={setHoveredPanelId}
        canLink={canLink}
        onSyncScroll={onSyncScroll}
        scrollPositions={scrollPositions}
        highlightedSequenceId={highlightedSequenceId}
        setHighlightedSequenceId={setHighlightedSequenceId}
        handleGenerateCorrelationMatrix={handleGenerateCorrelationMatrix}
        handleDuplicateTranslate={handleDuplicateTranslate}
        handleCreateSeqLogo={handleCreateSeqLogo}
        handleCreateSiteStatsHistogram={handleCreateSiteStatsHistogram}
        handleAlignmentToDistance={handleAlignmentToDistance}
        handleTreeToDistance={handleTreeToDistance}
        handleHeatmapToTree={handleHeatmapToTree}
        handleFastME={handleFastME}
        handleFastMEDistance={handleFastMEDistance}
        handleCreateSequenceFromStructure={handleCreateSequenceFromStructure}
        handleStructureDistanceMatrix={handleStructureDistanceMatrix}
        handleCreateTreeStats={handleCreateTreeStats}
        onCreateSubsetMsa={handleCreateSubsetMsa}
        onCreateSubtree={handleCreateSubtree}
        onCreateColorMatrix={handleCreateColorMatrix}
        setPanelData={setPanelData}
        onPredictOmega={handlePredictOmega}
        modelLoading={modelLoading} // loading state to disable button
      />
    </div>
  );
})}
          </GridLayout>
        </div>
      )}
    </div>
  );
}

export default App;