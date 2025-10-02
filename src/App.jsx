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
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import throttle from 'lodash.throttle'
import debounce from 'lodash.debounce';
import GridLayout from 'react-grid-layout';
import ReactDOM from 'react-dom';
import pako from 'pako';
import {DuplicateButton, RemoveButton, LinkButton, RadialToggleButton,
CodonToggleButton, TranslateButton, SiteStatsButton, LogYButton,
SeqlogoButton, SequenceButton, DistanceMatrixButton, ZeroOneButton,
 DownloadButton, GitHubButton, SearchButton, TreeButton,
 DiamondButton, BranchLengthsButton, PruneButton, SubMSAButton,
 TableChartButton} from './components/Buttons.jsx';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, PencilSquareIcon, ArrowUpOnSquareIcon } from '@heroicons/react/24/outline';
import { translateNucToAmino, isNucleotide, parsePhylipDistanceMatrix, parseFasta, getLeafOrderFromNewick,
newickToDistanceMatrix, detectFileType, toFasta, toPhylip, computeSiteStats, buildTreeFromDistanceMatrix,
computeNormalizedHammingMatrix, pickAlignedSeqForChain, chainIdFromSeqId, residueIndexToMsaCol, 
reorderHeatmapByLeafOrder, reorderMsaByLeafOrder, distanceMatrixFromAtoms, msaColToResidueIndex,
parsePdbChains, mkDownload, baseName, msaToPhylip, computeCorrelationMatrix, uint8ArrayToBase64, base64ToUint8Array,
} from './components/Utils.jsx';
import { residueColors, logoColors, linkpalette } from './constants/colors.js';
import { TitleFlip, AnimatedList } from './components/Animations.jsx';
import { FixedSizeGrid as Grid } from 'react-window';
import PhyloTreeViewer from './components/PhyloTreeViewer.jsx';
import PhylipHeatmap from "./components/Heatmap";
import Histogram from './components/Histogram.jsx';
import TableViewer from './components/TableViewer.jsx';
import SequenceLogoCanvas from './components/Seqlogo.jsx';
import StructureViewer from './components/StructureViewer.jsx';
import useElementSize from './hooks/useElementSize.js'


const detectIndexingMode = (xValues) => {
  // If the first x-value is 0, assume the data is 0-based.
  if (Array.isArray(xValues) && xValues.length > 0 && xValues[0] === 0) {
    return '0-based';
  }
  // Otherwise, default to the more common 1-based convention.
  return '1-based';
};

const LABEL_WIDTH = 66;
const CELL_SIZE = 24;


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

function PanelHeader({
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
    // If the mouse is not over any button or tooltip, clear all tooltips
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
    clearTimeout(showTimer.current); // Cancel any pending show action
    hideTimer.current = setTimeout(() => {
      clearAllTooltips();
    }, 5); // Give a 5ms grace period for moving to the tooltip
  }, [clearAllTooltips]);

  const handleEnter = useCallback((name, isBadge = false) => {
    if (forceHideTooltip) {
      return;
    }
    clearTimeout(hideTimer.current); // Cancel any pending hide action
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
  // When extraButtons change, clear tooltip state to avoid stale tooltips
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

  function ButtonWithHover({ name, children }) {
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
  }

  const LinkBadge = ({ partnerId, active }) => {
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
            <LinkBadge partnerId={partnerId} active={active} />
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
    ? (<>{badge.title}<br /><span className="text-xs text-gray-600">Click to disable link</span></>)
    : (<>{badge.title}<br /><span className="text-xs text-gray-600">Click to restore link</span></>)
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
              <ButtonWithHover key={i} name={name}>
                {element}
              </ButtonWithHover>
            );
          })}
          <ButtonWithHover name="duplicate">
            <DuplicateButton tooltip={null} onClick={() => onDuplicate(id)} />
          </ButtonWithHover>
          {onLinkClick && (
            <ButtonWithHover name="link">
              <LinkButton
                onClick={() => onLinkClick(id)}
                isLinkModeActive={isLinkModeActive}
                isEligibleLinkTarget={isEligibleLinkTarget}
              />
            </ButtonWithHover>
          )}
          <ButtonWithHover name="remove">
            <RemoveButton onClick={() => onRemove(id)} />
          </ButtonWithHover>
        </div>
      </div>

      {showTooltip && hoveredBtn && (
        <div className="absolute text-center top-12 right-2 z-30 px-2 py-1
               rounded-xl bg-gray-200 text-black text-sm
              transition-opacity whitespace-nowrap opacity-100 border border-gray-400"
          onMouseEnter={() => clearTimeout(hideTimer.current)} // <-- Keep tooltip open
          onPointerLeave={handleLeave} // <-- Hide when mouse leaves tooltip
        >
          {tooltipMap[hoveredBtn] ||
            (hoveredBtn.startsWith("extra") ? "Extra action" : "")}
        </div>
      )}
    </div>
  );
}
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
      className="fixed px-1 py-0.5 text-sm bg-gray-200 rounded-xl pointer-events-none z-[9999] shadow border border-gray-400"
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
  //onDoubleClick,
  isSelected = false,
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
      //onDoubleClick={onDoubleClick}
    >
      {children}
    </div>
  );
}


const SeqLogoPanel = React.memo(function SeqLogoPanel({
  id, data, onRemove, onDuplicate, hoveredPanelId, setHoveredPanelId, setPanelData,
  highlightedSite, highlightOrigin, onHighlight, linkedTo, panelLinks,
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

  const scrollContainerRef = useRef();
  const logoContainerRef = useRef(null);

  const Highlighted = (
    highlightedSite != null &&
    (highlightOrigin === id || (Array.isArray(linkedTo) && linkedTo.includes(highlightOrigin)))
  );

  useEffect(() => {
    // scroll-into-view logic
    if (
      highlightedSite != null &&
      Array.isArray(linkedTo) && linkedTo.includes(highlightOrigin) &&
      highlightOrigin !== id &&
      scrollContainerRef.current
    ) {
      const colWidth = 24;
      const container = scrollContainerRef.current;
      const containerWidth = container.offsetWidth;
      const currentScroll = container.scrollLeft;
      const maxScroll = container.scrollWidth - containerWidth;

      const colLeft = highlightedSite * colWidth;
      const colRight = colLeft + colWidth;
      const padding = containerWidth / 3;

      let targetScroll = null;
      if (colLeft < currentScroll ) targetScroll = colLeft - padding;
      else if (colRight > currentScroll + containerWidth) targetScroll = colRight - containerWidth + padding;

      if (targetScroll != null) {
        targetScroll = Math.max(0, Math.min(maxScroll, targetScroll));
        container.scrollTo({ left: targetScroll });
      }
    }
  }, [highlightedSite, highlightOrigin, linkedTo, id]);

 // download handler for PNG
 const handleDownloadPNG = useCallback(() => {
   const canvas = logoContainerRef.current?.querySelector('canvas');
   const base = (data?.filename || 'sequence_logo').replace(/\.[^.]+$/, '');
   if (!canvas) {
     alert('No image to download yet.');
     return;
   }
   try {
     const url = canvas.toDataURL('image/png');
     const a = document.createElement('a');
     a.href = url;
     a.download = `${base}.png`;
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
   } catch (e) {
     console.error('PNG export failed:', e);
     alert('PNG export failed in this browser.');
   }
 }, [data]);

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
        extraButtons={[
                { element: <DownloadButton onClick={handleDownloadPNG} />,
       tooltip: "Download png" }
        ]}
      />
      <div
        ref={scrollContainerRef}
        className="flex-1 p-2 bg-white overflow-x-auto"
      >
        {sequences.length === 0 ? (
          <div className="text-gray-400 text-center">
            No data to render sequence logo.
          </div>
        ) : (
          // wrap the logo so we can query the node
          <div ref={logoContainerRef}>
            <SequenceLogoCanvas
              sequences={sequences}
              height={200}
              highlightedSite={Highlighted ? highlightedSite : null}
              onHighlight={siteIdx => { if (onHighlight) onHighlight(siteIdx, id); }}
            />
          </div>
        )}
      </div>
    </PanelContainer>
  );
});

const HeatmapPanel = React.memo(function HeatmapPanel({
  id, data, onRemove, onDuplicate, onLinkClick, isLinkModeActive,isEligibleLinkTarget,
  hoveredPanelId, setHoveredPanelId, setPanelData, onReupload, highlightedSite, panelLinks,
  highlightOrigin, onHighlight, justLinkedPanels,linkBadges, onRestoreLink, colorForLink, onUnlink, onGenerateTree
}) {
  const { labels, matrix, filename, diamondMode=false, threshold=null } = data || {};
  const [containerRef, dims] = useElementSize({ debounceMs: 90 });
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
    const base = baseName(filename, 'distmatrix');
    const content = toPhylip(labels, matrix);
    mkDownload(base, content, 'phy')();
  }, [filename, labels, matrix]);
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

  if (!labels || !matrix) {
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
    //onDoubleClick={() => onReupload(id)}
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
          extraButtons={[
            { 
              element: <TreeButton onClick={() => onGenerateTree(id)} />,
              tooltip: (

                <>
                Build tree from distances<br />
                (Neighbor-Joining)
                </>
              )
              
            },
            { 
              element:  diamondMode? <DistanceMatrixButton onClick={() => handleDiamondToggle(id)}/>
              : <DiamondButton onClick={() => handleDiamondToggle(id)} />,
              tooltip: (diamondMode? <>Switch to square view</>: <>Switch to diamond view</>)
              
            },
            { 
              element: <DownloadButton onClick={handleDownload} />,
              tooltip: "Download distance matrix" 
            }
          ]}
    />
    {/* Add padding container around the heatmap */}
    <div ref={containerRef} className="flex-1 p-0 pb-4 pr-1 overflow-hidden">
      {labels && matrix ? (
        <PhylipHeatmap
        id={id}
        labels={labels}
        matrix={matrix}
        highlightSite={highlightedSite}
        highlightOrigin={highlightOrigin}
        onHighlight={onHighlight}
        onCellClick={handleCellClick}
        diamondView={diamondMode}
        highlightedCells={data.highlightedCells || []}
        linkedHighlightCell={data.linkedHighlightCell}
        threshold={threshold}                      
        onThresholdChange={handleThresholdChange}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400">No data</div>
      )}
    </div>
  </PanelContainer>
);
});

const StructurePanel = React.memo(function StructurePanel({
  id, data, onRemove, onDuplicate, hoveredPanelId, setHoveredPanelId, setPanelData, onReupload,
  onCreateSequenceFromStructure, onGenerateDistance, onLinkClick, isLinkModeActive,isEligibleLinkTarget,
  linkedTo, highlightedSite, highlightOrigin, onHighlight, linkedPanelData, justLinkedPanels,
   linkBadges, onRestoreLink, colorForLink,   onUnlink, panelLinks,
}) {
  const { pdb, filename, surface = false } = data || {};

  // Local UI state: show picker when user clicks the matrix button
  const [showChainPicker, setShowChainPicker] = React.useState(false);

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

  // When the matrix button is clicked
  const handleMatrixClick = React.useCallback(() => {
    if (!chainIds.length) { alert('No chains detected.'); return; }
    if (chainIds.length === 1) {
      // directly generate for the single chain
      onGenerateDistance(id, chainIds[0]);
    } else {
      // show picker with “ALL” + per-chain buttons
      setShowChainPicker(true);
    }
  }, [chainIds, id, onGenerateDistance]);

const pickChain = React.useCallback((choice) => {
    onGenerateDistance(id, choice);
    setShowChainPicker(false);
  }, [id, onGenerateDistance]);

  const handleChainSelect = React.useCallback((item) => {
    if (item === 'All chains') {
      pickChain('ALL');
    } else {
      const cid = item.replace('Chain ', '');
      pickChain(cid);
    }
  }, [pickChain]);
  return (
    <PanelContainer
      id={id}
      hoveredPanelId={hoveredPanelId}
      setHoveredPanelId={setHoveredPanelId}
      // onDoubleClick={() => onReupload(id)}
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
        extraButtons={[
          { element: <SequenceButton onClick={() => onCreateSequenceFromStructure(id)} />,
           tooltip: "Extract sequences from structure" },
          { element: <DistanceMatrixButton onClick={handleMatrixClick} title='Build distance matrix from structure' />,
           tooltip: "Generate residue distance matrix" },
          { element: <DownloadButton onClick={handleDownload} />,
           tooltip: "Download PDB file" }
        ]}
      />

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
              highlightedSite={highlightedSite}
              highlightOrigin={highlightOrigin}
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
  // Precompute styles to avoid object creation on every render
  const cellStyle = style;

  // Precompute class names
  const className = React.useMemo(() => {
    const base = 'flex items-center justify-center';
    const background = residueColors[char?.toUpperCase()] || 'bg-white';
    const highlightClass = isHoverHighlight || isLinkedHighlight
      ? 'alignment-highlight'
      : isPersistentHighlight
      ? 'persistent-alignment-highlight'
      : '';
    const searchClass = isSearchHighlight ? 'search-alignment-highlight' : '';
    
    return `${base} ${background} ${highlightClass} ${searchClass}`.trim();
  }, [char, isHoverHighlight, isLinkedHighlight, isPersistentHighlight, isSearchHighlight]);

  return (
    <div
      data-cell="1"
      data-row={rowIndex}
      data-col={columnIndex}
      style={cellStyle}
      className={className}
    >
      {char}
    </div>
  );
}, (prevProps, nextProps) => {
  // More aggressive comparison
  return (
    prevProps.char === nextProps.char &&
    prevProps.isHoverHighlight === nextProps.isHoverHighlight &&
    prevProps.isLinkedHighlight === nextProps.isLinkedHighlight &&
    prevProps.isPersistentHighlight === nextProps.isPersistentHighlight &&
    prevProps.isSearchHighlight === nextProps.isSearchHighlight &&
    prevProps.style.width === nextProps.style.width &&
    prevProps.style.height === nextProps.style.height
  );
});


const AlignmentPanel = React.memo(function AlignmentPanel({
  id,
  data,
  onRemove, onReupload, onDuplicate, onDuplicateTranslate, onCreateSeqLogo, onCreateSiteStatsHistogram, onGenerateDistance,
  onLinkClick, isLinkModeActive, isEligibleLinkTarget, linkedTo,
  highlightedSite, highlightOrigin, onHighlight, highlightOriginType,
  onSyncScroll, externalScrollLeft, onFastME, panelLinks,
  highlightedSequenceId, setHighlightedSequenceId,
  hoveredPanelId, setHoveredPanelId, setPanelData, justLinkedPanels,
  linkBadges, onRestoreLink, colorForLink, onUnlink, onCreateSubsetMsa,
}) {
  const msaData = useMemo(() => data.data, [data.data]);
  const filename = data.filename;
  const [isUiElementHovered, setIsUiElementHovered] = useState(false);
  const containerRef = useRef(null);
  const isVisible = useIsVisible(containerRef);
  const [gridContainerRef, dims] = useElementSize({ debounceMs: 90 });
  const gridRef = useRef(null);
  const outerRef = useRef(null); 
  const [tooltipSite, setTooltipSite] = useState(null);
  const isScrollingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  // Search UI state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  const [showModelPicker, setShowModelPicker] = React.useState(false);
  const isLinked = Array.isArray(linkedTo) && linkedTo.length > 0;
  
  // Sequence selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSequences, setSelectedSequences] = useState(new Set());

  const [labelWidth, setLabelWidth] = useState(
  data.labelWidth ?? LABEL_WIDTH*1.5
);

// Drag logic
const dragRef = useRef();
const isDraggingLabel = useRef(false);

const handleDragStart = (e) => {
  isDraggingLabel.current = true;
  dragRef.current = e.clientX;
  document.body.style.cursor = 'col-resize';
};

const handleDrag = (e) => {
  if (!isDraggingLabel.current) return;
  const delta = e.clientX - dragRef.current;
  dragRef.current = e.clientX;
  setLabelWidth(w => {
  const clamped = Math.max(40, Math.min(300, w + delta));
  setPanelData(prev => ({
    ...prev,
    [id]: { ...prev[id], labelWidth: clamped }
  }));
  return clamped;
});
};

const handleDragEnd = () => {
  isDraggingLabel.current = false;
  document.body.style.cursor = '';
};

useEffect(() => {
  if (!isDraggingLabel.current) return;
  window.addEventListener('mousemove', handleDrag);
  window.addEventListener('mouseup', handleDragEnd);
  return () => {
    window.removeEventListener('mousemove', handleDrag);
    window.removeEventListener('mouseup', handleDragEnd);
  };
}, [isDraggingLabel.current]);

useEffect(() => {
  if (showSearch) {
    // Next tick to ensure the input is mounted
    setTimeout(() => {
      const el = searchInputRef.current;
      if (!el) return;
      el.focus();
      // optional: select existing contents for quick overwrite
      el.setSelectionRange(0, el.value.length);
    }, 0);
  }
}, [showSearch]);

  // Columns that should be highlighted (whole-column highlight)
  const [searchMask, setSearchMask] = useState(new Set());     // Set<number> of column indices
  // Contiguous highlighted column ranges for navigation
  const [searchRanges, setSearchRanges] = useState([]);        // [{start, end}] half-open
  const [searchActiveIdx, setSearchActiveIdx] = useState(0);

  const [hoveredCol, setHoveredCol] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [codonMode, setCodonModeState] = useState(data.codonMode || false);
  const [scrollTop, setScrollTop] = useState(0);
  const [isSyncScrolling, setIsSyncScrolling] = useState(false);
  const isNuc = useMemo(() => isNucleotide(msaData), [msaData]);

  const pickerItems = React.useMemo(() => {
    const items = [];
    if (isNuc) {
      items.push('p-distance', 'RY symmetric', 'RY', 'JC69', 'K2P', 'F81', 'F84', 'TN93', 'LogDet');
    }
    if (!isNuc) {
      items.push('p-distance', 'F81', 'LG', 'WAG', 'JTT', 'Dayhoff', 'DCMut', 'CpRev', 'MtREV', 'RtREV', 'HIVb', 'HIVw', 'FLU');
    }
    return items;
  }, [isNuc]);

  useEffect(() => {
  function handleGlobalMouseMove(e) {
    // Check for the custom upload button class
    if (e.target instanceof Element && e.target.closest('.upload-btn-trigger')) {
      setHoveredCol(null);
      setHoveredRow(null);
      if (id === highlightOrigin) onHighlight(null, id);
    }
  }
  document.addEventListener('mousemove', handleGlobalMouseMove);
  return () => document.removeEventListener('mousemove', handleGlobalMouseMove);
  }, [id, highlightOrigin, onHighlight]);

  const handleTreeClick = React.useCallback(() => {
    if (!msaData || msaData.length === 0) { alert('No sequences available.'); return; }
    if (msaData.length > 120 ) {
      if (!window.confirm(`This alignment has ${msaData.length} sequences. Reconstructing a tree may take a long time and could crash your browser. Proceed?`)) {
        return;
      }
    }
    setShowModelPicker(true);
  }, [id, msaData, onFastME]);


  const pickModel = React.useCallback((choice) => {
      let evoModel = choice;
      onFastME(id, evoModel);
      setShowModelPicker(false);
    }, [id, onFastME]);

  const handleModelSelect = React.useCallback((item) => {
      pickModel(item);
  }, [pickModel]);


  const handleDownload = useCallback(() => {
    const msa = data?.data || [];
    const content = toFasta(msa);
    const base = baseName(data?.filename, 'alignment');
    mkDownload(base, content, 'fasta')();
  }, [data]);

  const rangesFromMask = useCallback((mask, totalCols) => {
    if (!mask || totalCols <= 0) return [];
    const cols = Array.from(mask).sort((a, b) => a - b);
    if (cols.length === 0) return [];
    const out = [];
    let s = cols[0];
    let prev = cols[0];
    for (let i = 1; i < cols.length; i++) {
      const c = cols[i];
      if (c === prev + 1) {
        prev = c;
      } else {
        out.push({ start: s, end: prev + 1 }); // half-open
        s = c; prev = c;
      }
    }
    out.push({ start: s, end: prev + 1 });
    return out;
  }, []);
const scrollToColumn = useCallback((col) => {
    if (col == null || !outerRef.current || !gridRef.current) return;
    const itemWidth = codonMode ? 3 * CELL_SIZE : CELL_SIZE;
    const targetPx = col * itemWidth - 4; // -4 for border compensation
    gridRef.current.scrollTo({ scrollLeft: targetPx });
  }, [codonMode]);

  const linkedSiteFromData = data.linkedSiteHighlight;
  
  // The global highlight is used for other link types, but not for highlights coming from a structure panel,
  // as those are handled by the panel-specific `linkedSiteHighlight`.
  const globalHighlightedSite = (
      highlightOriginType !== 'structure' &&
      Array.isArray(linkedTo) && 
      linkedTo.includes(highlightOrigin) && 
      id !== highlightOrigin
  ) ? highlightedSite : null;

  // Use the panel-specific highlight if available, otherwise fall back to the global one.
  const finalHighlightedSite = linkedSiteFromData ?? globalHighlightedSite;

  // useEffect that correctly positions the tooltip for both highlight types
  useEffect(() => {
    if (finalHighlightedSite != null && !isSyncScrolling) {
      const outer = outerRef.current;
      if (!outer) return;
      const rect = outer.getBoundingClientRect();
      const itemWidth = codonMode ? 3 * CELL_SIZE : CELL_SIZE;
      const x = rect.left + (finalHighlightedSite * itemWidth) - outer.scrollLeft + (itemWidth / 2);
      const y = rect.top + (rect.height / 2);
      setTooltipPos({ x, y });
    }
  }, [finalHighlightedSite, id, highlightOrigin, codonMode, dims.height, isSyncScrolling, scrollTop]);

// throttle highlight to once every 90ms
const throttledHighlight = useMemo(
  () =>
    throttle(
      (col, originId) => {
        onHighlight(col, originId);
      },
      90,
      { leading: true, trailing: true }
    ),
  [onHighlight]
);


// This function is called when scrolling ends.
const handleScrollEnd = useMemo(
  () =>
    debounce(() => {
      isScrollingRef.current = false;
      // After any scroll event finishes, reset the sync flag.
      setIsSyncScrolling(false);
    }, 1), // 1ms delay after the last scroll event
  []
);

const handleScroll = useMemo(
  () =>
    throttle(({ scrollLeft, scrollTop }) => {
      isScrollingRef.current = true;
      setScrollTop(scrollTop);
      
      // We do not try to calculate column from mouse position during a sync scroll,
      // as the mouse position is stale and unrelated to this panel.
      if (!isSyncScrolling) {
        if (hoveredPanelId !== id) {
          return;
        }

        const outer = outerRef.current;
        if (outer) {
          const gridRect = outer.getBoundingClientRect();
          
          const mouseXRelative = lastMousePosRef.current.x - gridRect.left;
          const itemWidth = codonMode ? 3 * CELL_SIZE : CELL_SIZE;
          const currentColumn = Math.floor((scrollLeft + mouseXRelative) / itemWidth);
          setTooltipSite(currentColumn);
          
          // Send highlight events during the scroll
          throttledHighlight(currentColumn, id);

          const mouseYRelative = lastMousePosRef.current.y - gridRect.top;
          const currentRow = Math.floor((scrollTop + mouseYRelative) / CELL_SIZE);
          if (currentRow >= 0 && currentRow < msaData.length) {
              setHoveredRow(currentRow);
              if (Array.isArray(linkedTo) && linkedTo.length > 0 && setHighlightedSequenceId) {
                  const seqId = msaData[currentRow]?.id;
                  if (seqId) {
                      setHighlightedSequenceId(seqId);
                  }
              }
          }
        }
      }
      
      handleScrollEnd();
    }, 90),
  [id, codonMode, handleScrollEnd, msaData, linkedTo, setHighlightedSequenceId, throttledHighlight, isSyncScrolling, hoveredPanelId]
);


  const runSearch = useCallback(() => {
    if (!searchQuery?.trim() || !Array.isArray(msaData) || msaData.length === 0) return;
    const q = searchQuery.trim();
    const asInt = Number(q);
    // Reset previous results
   setSearchMask(new Set());
   setSearchRanges([]);
    setSearchActiveIdx(0);
    setPanelData(prev => ({ ...prev, [id]: { ...prev[id], searchHighlight: undefined }}));

    // 1) Numeric site (1-based → 0-based)
    if (Number.isInteger(asInt) && String(asInt) === q) {
    const col = asInt - 1;
    if (col < 0 || col >= (msaData[0]?.sequence?.length || 0)) { alert('Index out of bounds'); return; }
    else {scrollToColumn(col)
     const mask = new Set([col]);
     setSearchMask(mask);
     const ranges = [{ start: col, end: col + 1 }];
     setSearchRanges(ranges);
     setSearchActiveIdx(0);
     setPanelData(prev => ({ ...prev, [id]: { ...prev[id], searchHighlight: { row: null, start: col, end: col + 1 }}}));
      return;
    }}

    // 2) Motif (search occurrence in any row, exact consecutive, case-insensitive)
    const motif = q.toUpperCase();
    const mask = new Set();
    for (let r = 0; r < msaData.length; r++) {
      const seq = (msaData[r]?.sequence || '').toUpperCase();
      let idx = seq.indexOf(motif);
      while (idx >= 0) {
        for (let c = idx; c < idx + motif.length; c++) mask.add(c); // mark ALL columns in motif span
        idx = seq.indexOf(motif, idx + 1);
      }
    }
   if (mask.size === 0) { alert('No match found.'); return; }
   const totalCols = msaData[0]?.sequence?.length || 0;
   const ranges = rangesFromMask(mask, totalCols);
   setSearchMask(mask);
   setSearchRanges(ranges);
   setSearchActiveIdx(0);
  if (outerRef.current) {
    const outer = outerRef.current;
    const viewportLeft = outer.scrollLeft;
    const viewportRight = viewportLeft + outer.offsetWidth;
    const itemWidth = codonMode ? 3 * CELL_SIZE : CELL_SIZE;
    const motifStartPx = ranges[0].start * itemWidth;
    const motifEndPx = ranges[0].end * itemWidth;

    // If motif is not fully in view, scroll
    if (motifStartPx < viewportLeft || motifEndPx > viewportRight) {
      scrollToColumn(ranges[0].start);
    }
  } else {
    // fallback: always scroll if ref missing
    scrollToColumn(ranges[0].start);
  }

  setPanelData(prev => ({ ...prev, [id]: { ...prev[id], searchHighlight: ranges[0] }}));
}, [searchQuery, msaData, id, setPanelData, scrollToColumn, codonMode, rangesFromMask]);

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setSearchQuery('');
   setSearchMask(new Set());
   setSearchRanges([]);
    setSearchActiveIdx(0);
    setPanelData(prev => ({
      ...prev,
      [id]: { ...prev[id], searchHighlight: undefined }
    }));
  }, [id, setPanelData]);

  const setCodonMode = useCallback(
    (fnOrValue) => {
      setCodonModeState(prev => {
        const next = typeof fnOrValue === 'function' ? fnOrValue(prev) : fnOrValue;
        setPanelData(prevData => ({
          ...prevData,
          [id]: {
            ...prevData[id],
            codonMode: next,
            highlightedSites: [] // clear highlights when switching modes
          }
        }));
        return next;
      });
    },
    [id, setPanelData]
  );
  const handleToggleSelectionMode = () => {
    if (!isSelectionMode) {
      setShowSearch(false); // Hide search when entering selection mode
    }
    if (isSelectionMode) {
      setSelectedSequences(new Set()); // Clear selection when leaving
    }
    setIsSelectionMode(prev => !prev);
  };

  const handleGoClick = () => {
    if (selectedSequences.size === 0) return;
    onCreateSubsetMsa(id, Array.from(selectedSequences));
    // Reset state after creation
    setIsSelectionMode(false);
    setSelectedSequences(new Set());
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedSequences(new Set());
  };

  const handleLabelClick = (index) => {
    if (!isSelectionMode) return;
    const newSelection = new Set(selectedSequences);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedSequences(newSelection);
  };

  useEffect(() => {
    if (data.codonMode !== codonMode) {
      setCodonModeState(data.codonMode || false);
    }
  }, [data.codonMode]);

useEffect(() => {
  const clearHighlight = () => {
    setHoveredCol(null);
    setHoveredRow(null);
    setHighlightedSequenceId(null);
    if (id === highlightOrigin) onHighlight(null, id);
  };
  if (hoveredPanelId !== id) clearHighlight();
  if (Array.isArray(linkedTo) && linkedTo.includes(hoveredPanelId)) return;
}, [hoveredPanelId, id, linkedTo, highlightOrigin, onHighlight, setHighlightedSequenceId]);

useEffect(() => {
  // This effect positions the tooltip for highlights coming from linked panels.
  if (finalHighlightedSite != null && outerRef.current) {
    const outer = outerRef.current;
    const rect = outer.getBoundingClientRect();
    const itemWidth = codonMode ? 3 * CELL_SIZE : CELL_SIZE;

    // Calculate the X position based on the site index and scroll offset
    const x = rect.left + (finalHighlightedSite * itemWidth) - outer.scrollLeft + (itemWidth / 2);
    // Center the Y position vertically within the grid
    const y = rect.top + (rect.height / 2);

    setTooltipPos({ x, y });
  }
}, [finalHighlightedSite, codonMode, dims.height, scrollTop]); // Re-run if site, mode, or dimensions change

useEffect(() => {
  if (!gridRef.current || typeof externalScrollLeft !== 'number') return;
  const outer = outerRef.current;
  if (!outer) return;

  const viewportWidth = dims.width - labelWidth;
  const currentScrollLeft = outer.scrollLeft;
  const itemWidth = codonMode ? 3 * CELL_SIZE : CELL_SIZE;
  const MARGIN = 24;
  const colStart = externalScrollLeft;
  const colEnd = colStart + itemWidth;
  const padding = viewportWidth / 3;
  const maxScroll = outer.scrollWidth - viewportWidth + itemWidth + padding;

  let targetScroll = null;
  if (colStart < currentScrollLeft + MARGIN) {
    targetScroll = colStart - padding;
  } else if (colEnd > currentScrollLeft + viewportWidth - 2*MARGIN ) {
    targetScroll = colStart - viewportWidth + itemWidth + padding;
  }

  if (targetScroll !== null) {
    setIsSyncScrolling(true);
    // Clamp targetScroll between 0 and (outer.scrollWidth - viewportWidth)
    const maxScrollPos = Math.max(0, outer.scrollWidth - viewportWidth);
    gridRef.current.scrollTo({
      scrollLeft: Math.max(0, Math.min(targetScroll, maxScrollPos))
    });
  }
}, [externalScrollLeft, dims.width, codonMode]);


  const rowCount = msaData.length;
  const colCount = msaData[0]?.sequence.length || 0;

  const pickCellFromEvent = useCallback((e) => {
    const el = e.target.closest('[data-cell="1"]');
    if (!el) return null;
    const rowIndex = Number(el.getAttribute('data-row'));
    const columnIndex = Number(el.getAttribute('data-col'));
    if (Number.isNaN(rowIndex) || Number.isNaN(columnIndex)) return null;
    return { rowIndex, columnIndex };
  }, []);

const handleGridMouseMove = useCallback(
  (e) => {
    // Store the latest mouse position
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    const hit = pickCellFromEvent(e);
    if (!hit) return;

    const { rowIndex, columnIndex } = hit;
    const codonIndex = Math.floor(columnIndex / 3);
    const idx = codonMode ? codonIndex : columnIndex;

    // Update local visual state and tooltip content
    setHoveredRow(rowIndex);
    setHoveredCol(idx);
    setTooltipSite(idx); // Update the dedicated tooltip state
    setTooltipPos({ x: e.clientX, y: e.clientY });

    // Always trigger the highlight on mouse move.
    throttledHighlight(idx, id);

    if (Array.isArray(linkedTo) && linkedTo.length > 0 && setHighlightedSequenceId) {
      const seqId = msaData[rowIndex]?.id;
      if (seqId) setHighlightedSequenceId(seqId);
    }
  },
  [pickCellFromEvent, codonMode, throttledHighlight, id, linkedTo, setHighlightedSequenceId, msaData]
);


const handleGridMouseLeave = useCallback(() => {
  throttledHighlight.cancel();
  setHoveredCol(null);
  setHoveredRow(null);
  setTooltipSite(null);
  if (id === highlightOrigin) onHighlight(null, id);
  if (Array.isArray(linkedTo) && linkedTo.length > 0 && setHighlightedSequenceId) setHighlightedSequenceId(null);
}, [throttledHighlight, id, highlightOrigin, onHighlight, linkedTo, setHighlightedSequenceId]);

  const handleGridClick = useCallback(
    (e) => {
      const hit = pickCellFromEvent(e);
      if (!hit) return;
      const { rowIndex, columnIndex } = hit;
      const codonIndex = Math.floor(columnIndex / 3);
      const idx = codonMode ? codonIndex : columnIndex;

      setPanelData(prev => {
        const prevHighlights = prev[id]?.highlightedSites || [];
        const isHighlighted = prevHighlights.includes(idx);
        const updatedHighlights = isHighlighted
          ? prevHighlights.filter(i => i !== idx)
          : [...prevHighlights, idx];
        return {
          ...prev,
          [id]: {
            ...prev[id],
            highlightedSites: updatedHighlights
          }
        };
      });
    },
    [pickCellFromEvent, codonMode, id, setPanelData]
  );



const Cell = useCallback(
  ({ columnIndex, rowIndex, style, data:itemData }) => {
    const char = msaData[rowIndex].sequence[columnIndex];
    const codonIndex = Math.floor(columnIndex / 3);
    const idx = codonMode ? codonIndex : columnIndex;

    const persistentHighlights = data.highlightedSites || [];
    const isPersistentHighlight = persistentHighlights.includes(idx);

    // Whole-column highlight: any column present in the mask is blue on all rows
    const isInSearchMask = itemData?.searchHighlight && searchMask.size > 0
      ? searchMask.has(columnIndex)
      : false;

    // Highlight all motif letters in each matching row
    let isSearchHighlight = false;
    const q = searchQuery.trim();
    const asInt = Number(q);
    if (Number.isInteger(asInt) && String(asInt) === q && isInSearchMask && asInt > 0 && asInt - 1 === columnIndex) {
      isSearchHighlight = true;
    }
    else {
    if (itemData?.searchHighlight && searchQuery) {
      const motif = searchQuery.toUpperCase();
      const seq = msaData[rowIndex].sequence.toUpperCase();
      // Check if this cell is part of any motif occurrence in this row
      for (let i = 0; i <= seq.length - motif.length; i++) {
        if (seq.slice(i, i + motif.length) === motif) {
          if (columnIndex >= i && columnIndex < i + motif.length) {
            isSearchHighlight = true;
            break;
          }
      
        }
      }
    }}

    const isHoverHighlight = codonMode
      ? hoveredCol != null && hoveredCol === codonIndex
      : hoveredCol === columnIndex;

    const linkedSiteHighlight = itemData.linkedSiteHighlight;

    const isLinkedHighlightByGlobal =
          Array.isArray(linkedTo) &&
          highlightedSite != null &&
          hoveredPanelId !== id &&
          (linkedTo.includes(highlightOrigin) || id === highlightOrigin) &&
          (codonMode ? codonIndex === highlightedSite : columnIndex === highlightedSite);
    
    const isLinkedHighlightByData =
          linkedSiteHighlight != null &&
          (codonMode ? codonIndex === linkedSiteHighlight : columnIndex === linkedSiteHighlight);

    const isLinkedHighlight = isLinkedHighlightByGlobal || isLinkedHighlightByData;

    const finalHighlightedSite = useMemo(() => {
  // Check for a panel-specific highlight first (e.g., from structure link)
  if (data.linkedSiteHighlight != null) {
    return data.linkedSiteHighlight;
  }
  
  // Check for a global highlight from a linked panel
  const isLinked = Array.isArray(linkedTo) && linkedTo.includes(highlightOrigin);
  if (isLinked && id !== highlightOrigin && highlightedSite != null) {
    return highlightedSite;
  }
  
  return null;
}, [data.linkedSiteHighlight, linkedTo, highlightOrigin, id, highlightedSite]);

    return (
      <MSACell
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
  },
  [
    msaData,
    codonMode,
    hoveredCol,
    highlightedSite,
    highlightOrigin,
    linkedTo,
    id,
    data.highlightedSites,
    hoveredPanelId,
    searchQuery
  ]
);

  const sequenceLabels = useMemo(() => {
    return msaData.map((seq, index) => {
      const rawId = seq.id.replace(/\s+/g, ' ').trim();
      const shortId = rawId.length > 10 ? rawId.slice(0, 8) + '..' : rawId;
      return { index, rawId, shortId, id: seq.id };
    });
  }, [msaData]);

useEffect(() => {
  return () => {
    // These functions have internal timers, so we must cancel them
    // when the component unmounts to prevent memory leaks.
    throttledHighlight.cancel();
    handleScrollEnd.cancel();
  };
}, [throttledHighlight, handleScrollEnd]);

  const gridItemData = useMemo(() => ({
    msaData,
    searchMask,
    searchHighlight: data.searchHighlight,
    codonMode,
    hoveredCol,
    searchQuery,
    highlightedSite,
    highlightOrigin,
    linkedTo,
    hoveredPanelId,
    id,
    linkedSiteHighlight: data.linkedSiteHighlight,
    highlightedSites: data.highlightedSites || []
  }), [
    msaData, searchMask, data.searchHighlight, codonMode, hoveredCol,
    highlightedSite, highlightOrigin, linkedTo, hoveredPanelId, id, data.highlightedSites,data.linkedSiteHighlight,
  ]);


  return (
    <PanelContainer
      id={id}
      linkedTo={linkedTo}
      panelLinks={panelLinks} 
      hoveredPanelId={hoveredPanelId}
      setHoveredPanelId={setHoveredPanelId}
      //onDoubleClick={() => onReupload(id)}
      isEligibleLinkTarget={isEligibleLinkTarget}
      justLinkedPanels={justLinkedPanels}
    >
      <div
        ref={containerRef}
        className="relative flex flex-col h-full border rounded-xl bg-white overflow-hidden"
        onPointerLeave={handleGridMouseLeave}
      >
            <div
        onMouseEnter={() => setIsUiElementHovered(true)}
        onMouseLeave={() => setIsUiElementHovered(false)}
      >
        <PanelHeader
          id={id}
          prefix=""
          filename={filename}
          setPanelData={setPanelData}
          forceHideTooltip={showSearch || isSelectionMode}
          extraButtons={
            isNuc
              ? [ { element: <SearchButton onClick={() => { setShowSearch(s => !s); if (!showSearch) { setIsSelectionMode(false); setSelectedSequences(new Set()); } }} />, tooltip: "Search site or motif" },
                  { element: <TreeButton onClick={() => handleTreeClick(id)} />, tooltip: (
                    <>
                      Build phylogenetic tree <br />
                       <span className="text-xs text-gray-600">FastME</span>
                    </>
                    )
                  },
                  { element: <CodonToggleButton onClick={() => setCodonMode(m => !m)} isActive={codonMode} />, tooltip: "Toggle codon mode" },
                  { element: <TranslateButton onClick={() => onDuplicateTranslate(id)} />, tooltip: "Translate to amino acids" },
                  { element: <SeqlogoButton onClick={() => onCreateSeqLogo(id)} />, tooltip: "Create sequence logo" },
                  { element: <SiteStatsButton onClick={() => onCreateSiteStatsHistogram(id)} />,
                   tooltip: (
                              <>
                                Compute per-site statistics<br />
                                <span className="text-xs text-gray-600">Conservation and gap fraction</span>
                              </>
                  ) },
                  { element: <DistanceMatrixButton onClick={() => onGenerateDistance(id)}/>,
                   tooltip: (
                    <>
                    Build distance matrix <br />
                    <span className="text-xs text-gray-600">Normalized Hamming</span>
                    </>
                   )
                  
                  },
                  { element: <SubMSAButton onClick={handleToggleSelectionMode} isActive={isSelectionMode} />, tooltip : (
                    <> Extract sequences <br /> <span className="text-xs text-gray-600">Choose a subset to create a new panel </span> </> ) },
                  { element: <DownloadButton onClick={handleDownload} />, tooltip: "Download alignment" }
                ]
              : [ { element: <SearchButton onClick={() => { setShowSearch(s => !s); if (!showSearch) { setIsSelectionMode(false); setSelectedSequences(new Set()); } }} />, tooltip: "Search site or motif" },
                  { element: <TreeButton onClick={() => handleTreeClick(id)} />,
                    tooltip: (
                      <>
                        Build phylogenetic tree <br />
                        <span className="text-xs text-gray-600">FastME</span>
                      </>
                    )
                  },
                  { element: <SeqlogoButton onClick={() => onCreateSeqLogo(id)} />, tooltip: "Create sequence logo" },
                  { element: <SiteStatsButton onClick={() => onCreateSiteStatsHistogram(id)} />, 
                   tooltip: (
                              <>
                                Compute per-site statistics<br />
                                <span className="text-xs text-gray-600">Conservation and gap fraction</span>
                              </>
                  ) },
                  { element: <DistanceMatrixButton onClick={() => onGenerateDistance(id)} />,
                    tooltip: (
                    <>
                    Build distance matrix <br />
                    <span className="text-xs text-gray-600">Normalized Hamming</span>
                    </>
                   )
                  
                  },
                  { element: <SubMSAButton onClick={handleToggleSelectionMode} isActive={isSelectionMode} />, tooltip : (
                    <> Extract sequences <br /> <span className="text-xs text-gray-600">Choose a subset to create a new panel </span> </> ) },
                  { element: <DownloadButton onClick={handleDownload} />, tooltip: "Download alignment" }
                ]
          }
          onDuplicate={onDuplicate}
          onLinkClick={onLinkClick}
          isLinkModeActive={isLinkModeActive}
          isEligibleLinkTarget={isEligibleLinkTarget}
          linkBadges={linkBadges}
          onRestoreLink={onRestoreLink}
          onUnlink={onUnlink}
          colorForLink={colorForLink}
          onRemove={onRemove}
          />
          </div>
          {/* model picker overlay */}
        {showModelPicker && (
          <div
            className="absolute inset-0 z-[1000] bg-black/40 flex items-center justify-center rounded-2xl"
            onClick={() => setShowModelPicker(false)}
          >
            <div
              className="py-12 max-w-lg w-[min(90vw,36rem)] h-full flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
                    style={{
        overflowY: 'auto',
      }}
            >
              <div className="text-3xl font-bold text-white mb-4 flex-shrink-0 text-center">Choose substitution model for tree reconstruction</div>
              <div className="flex-1 flex items-center justify-center w-full max-w-xs">
                <AnimatedList
                  items={pickerItems}
                  onItemSelect={handleModelSelect}
                  itemClassName="text-center font-semibold !py-3"
                  className="h-full"
                  maxHeight={dims.height - 150}
                />
              </div>
            </div>
          </div>
        )}
                {showSearch && (
          <div className="absolute right-2 top-14 z-[1100] bg-white border rounded-xl shadow p-2 flex items-center gap-2"
          onMouseEnter={() => setIsUiElementHovered(true)}
          onMouseLeave={() => setIsUiElementHovered(false)}
          >
            <input
            ref={searchInputRef}
            autoFocus
              className="border rounded-md px-2 py-1 w-48"
              placeholder="e.g. 128  or  ACTT"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onMouseEnter={handleGridMouseLeave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runSearch();
                if (e.key === 'Escape') closeSearch();
              }}
            />
            <button
              className="px-2 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700"
              onClick={runSearch}
            >
              Go
            </button>
               {/* Prev / Next for motif hits */}
    <button
      className="px-2 py-0 rounded-md text-gray-700 bg-gray-300 hover:bg-gray-400 disabled:opacity-50 text-lg"
      onClick={() => {
 if (!searchRanges.length) return;
        const next = (searchActiveIdx - 1 + searchRanges.length) % searchRanges.length;
        setSearchActiveIdx(next);
        const r = searchRanges[next];
        scrollToColumn(r.start);
        setPanelData(prev => ({ ...prev, [id]: { ...prev[id], searchHighlight: r }}));
      }}
      disabled={searchRanges.length < 2}
      title="Previous hit"
    >
      ‹
    </button>
    <button
      className="px-2 py-0 rounded-md text-gray-700 bg-gray-300 hover:bg-gray-400 disabled:opacity-50 text-lg"
      onClick={() => {
        if (!searchRanges.length) return;
        const next = (searchActiveIdx + 1) % searchRanges.length;
        setSearchActiveIdx(next);
        const r = searchRanges[next];
        scrollToColumn(r.start);
        setPanelData(prev => ({ ...prev, [id]: { ...prev[id], searchHighlight: r }}));
      }}
      disabled={searchRanges.length < 2}
      title="Next hit"
    >
      ›
    </button>
    {searchRanges.length > 0 && (
      <span className="text-sm text-gray-600 w-12 text-center tabular-nums">
        {searchActiveIdx + 1}/{searchRanges.length}
      </span>
    )}
            <button
              className="px-2 py-1 text-gray-600 rounded-md bg-gray-200 hover:bg-red-300"
              onClick={closeSearch}
              title="Close search"
            >
              ✕
            </button>
          </div>
        )}
        {isSelectionMode && (
          <div className="absolute right-2 top-14 z-[1100] bg-white border rounded-xl shadow p-2 flex items-center gap-2"
            onMouseEnter={handleGridMouseLeave}
          >
            <input
          type="text"
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleGoClick();
            if (e.key === 'Escape') handleCancelSelection();
          }}
          tabIndex={0}
        />
            <span className="text-sm text-gray-700 px-2">
              Click on the label of a sequence to select it  <br /> <strong>{selectedSequences.size}/{msaData.length} sequences selected</strong>
            </span>
            <div className="flex-grow"></div>
            <button
              className="px-2 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-red-300"
              onClick={handleCancelSelection}
            >
              Cancel
            </button>
            <button
              className="px-2 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              onClick={handleGoClick}
              disabled={selectedSequences.size === 0}
            >
              Go
            </button>
          </div>
        )}

{/* --- Unified Tooltip Logic --- */}
{(() => {
  // If mouse is over header or search/select bars, hide all tooltips.
  if (isUiElementHovered) {
    return null;
  }
  // Determine if a tooltip should be shown at all
  const isLocalHover = tooltipSite != null && hoveredPanelId === id;
  const isExternalHighlight = (
    finalHighlightedSite != null && Number.isInteger(finalHighlightedSite) && finalHighlightedSite >= 0
  );

  if (!isLocalHover && !isExternalHighlight) {
    return null;
  }

  if (!isVisible || (!isLocalHover && !isExternalHighlight)) {
            return null;
          }

  // Prioritize displaying the local hover site, but fall back to the external one
  const siteToDisplay = isLocalHover ? tooltipSite : finalHighlightedSite;
  const siteLabel = codonMode ? `Codon ${siteToDisplay + 1}` : `Site ${siteToDisplay + 1}`;

  // Get the panel's current boundary rectangle from the ref.
  const panelBoundary = outerRef.current?.getBoundingClientRect();

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

        <div
          ref={gridContainerRef}
          className="flex-1 flex overflow-hidden font-mono text-sm"
          // event delegation lives on the same wrapper that contains the Grid
          onMouseMove={handleGridMouseMove}
          onClick={handleGridClick}
          onPointerLeave={handleGridMouseLeave}
        >
          {/* Left labels */}
          <div
            style={{
              width: labelWidth,
              height: dims.height,
              overflow: 'hidden',
              position: 'relative'
            }}
            onMouseEnter={handleGridMouseLeave}
          >
            <div
              style={{
                transform: `translateY(-${scrollTop || 0}px)`,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0
              }}
            >
              {sequenceLabels.map(({ index, rawId, id: seqId }) => {
                const isrowhovered = msaData[hoveredRow]?.id === seqId ? hoveredRow : false;
                const linkedNames = data?.linkedHighlights || [];
                const isNameHighlight =
                  isrowhovered ||
                  (highlightedSequenceId === seqId && Array.isArray(linkedTo) && linkedTo.includes(hoveredPanelId)) ||
                  linkedNames.includes(seqId);

                  // Dynamic truncation logic
                  // Estimate max chars that fit in labelWidth (monospace: ~8px per char)
                  const charWidth = 8; // px per char
                  const maxChars = Math.floor((labelWidth - 8) / charWidth); // 8px padding
                  let displayId = rawId;
                  if (rawId.length > maxChars) {
                    displayId = rawId.slice(0, Math.max(0, maxChars - 2)) + '..';
                  }
                  const isSelected = selectedSequences.has(index);
                return (
                  <div
                    key={index}
                    style={{ height: CELL_SIZE, lineHeight: `${CELL_SIZE}px` }}
                    className={`flex items-center pr-2 pl-2 text-right font-bold truncate ${
                      isNameHighlight ? 'bg-yellow-100' : ''
                    } ${isSelectionMode ? 'cursor-pointer hover:bg-gray-100' : ''} ${isSelected ? '!bg-blue-200' : ''}`}
                    title={rawId}
                    onClick={() => handleLabelClick(index)}
                    onMouseEnter={() => {
                      if (Array.isArray(linkedTo) && linkedTo.length > 0) setHighlightedSequenceId(seqId);
                      isNameHighlight || setHoveredRow(index);
                    }}
                    onPointerLeave={() => {
                      if (Array.isArray(linkedTo) && linkedTo.length > 0) setHighlightedSequenceId(null);
                      isNameHighlight || setHoveredRow(null);
                    }}
                  >
                    {displayId}
                  </div>
                );
              })}
            </div>
            {/* Drag handle */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 8,
                height: '100%',
                cursor: 'col-resize',
                zIndex: 10,
                background: 'rgba(0,0,0,0.02)'
              }}
              onMouseDown={handleDragStart}
              title="Drag to resize label column"
            />
          </div>

          {/* Virtualized grid */}
          <Grid
            ref={gridRef}
            outerRef={outerRef}
            columnCount={colCount}
            columnWidth={CELL_SIZE}
            height={dims.height}
            rowCount={rowCount}
            rowHeight={CELL_SIZE}
            width={Math.max(dims.width - labelWidth, 0)}
            onScroll={handleScroll} 
            overscanRowCount={2}
            overscanColumnCount={8}
            itemData={gridItemData}
          >
            {Cell}
          </Grid>
        </div>
      </div>
    </PanelContainer>
  );
});

function toNewick(node) {
  let result = '';
  if (node.children && node.children.length > 0) {
    const childStrings = node.children.map(child => toNewick(child)).join(',');
    result += `(${childStrings})`;
  }
  if (node.data && node.data.name) {
    const sanitizedName = String(node.data.name).replace(/[():,;\s]/g, '_');
    if(sanitizedName) result += sanitizedName;
  }
  // Check for and serialize NHX data
  if (node.data && node.data.nhx && Object.keys(node.data.nhx).length > 0) {
    const nhxString = Object.entries(node.data.nhx)
      .map(([key, value]) => `${key}=${value}`)
      .join(':');
    if (nhxString) {
      result += `[&&NHX:${nhxString}]`;
    }
  }
  if (node.data && typeof node.data.length === 'number' && node.data.length > 0) {
    result += `:${node.data.length}`;
  }
  return result;
}
const TreePanel = React.memo(function TreePanel({
  id, data, onRemove, onReupload, onDuplicate, onGenerateDistance,
  highlightedSequenceId, onHoverTip, panelLinks,
  linkedTo, highlightOrigin,
  onLinkClick, isLinkModeActive,isEligibleLinkTarget,hoveredPanelId,
  setHoveredPanelId, setPanelData,justLinkedPanels,
  linkBadges, onRestoreLink, colorForLink, onUnlink,
}) {
  const { filename, isNhx, RadialMode= true, drawBranchLengths=false, pruneMode = false } = data || {};

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
      extraButtons={[
      { element: <BranchLengthsButton onClick={handleBranchLengthsToggle} isActive={drawBranchLengths} />, tooltip: !drawBranchLengths ? "Draw using branch lengths" : "Draw ignoring branch lengths" },
      { element: <RadialToggleButton onClick={handleRadialToggle} isActive={RadialMode}  />,
       tooltip: RadialMode ? "Switch to rectangular view" : "Switch to radial view" },
      { element: <PruneButton onClick={handlePruneToggle} isActive={pruneMode} />, tooltip: pruneMode ? "Exit prune mode" : 
    (
      <>Prune tree <br /> <span className="text-xs text-gray-600">Remove branches and their descendants</span></>
    ) },
      { element: <DistanceMatrixButton   onClick={() => onGenerateDistance(id)}  />,
       tooltip: (
        <>
        Build distance matrix <br />
        <span className="text-xs text-gray-600">Patristic distance</span>
        </>
       )
      },
      { element: <DownloadButton onClick={handleDownload} />,
       tooltip: "Download tree" }
     ]}
        linkBadges={linkBadges}
        onRestoreLink={onRestoreLink}
        onUnlink={onUnlink}
        colorForLink={colorForLink}
        onRemove={onRemove}
      />
      <div className="flex-1 overflow-auto flex items-center justify-center">
          <PhyloTreeViewer
            // Pass the entire data object. It contains the newick string,
            // saved settings, and the dynamically calculated highlights.
            panelData={dynamicPanelData}

            id={id}
            setPanelData={setPanelData}
            onHoverTip={onHoverTip}
            linkedTo={linkedTo}
            highlightOrigin={highlightOrigin}
            toNewick={toNewick}
            
            isNhx={isNhx}
            radial={RadialMode}
            useBranchLengths={drawBranchLengths}
            pruneMode={pruneMode}

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

const NotepadPanel = React.memo(function NotepadPanel({
  id, data, onRemove, onDuplicate, hoveredPanelId, panelLinks,
  setHoveredPanelId, setPanelData,isEligibleLinkTarget, justLinkedPanels,
}) {
  const [filenameInput, setFilenameInput] = useState(data.filename || "Notes");
  const [text, setText] = useState(data.text || "");
  const handleDownload = useCallback(() => {
    const base = baseName(filenameInput, 'notes');
    mkDownload(base, text || '', 'txt')();
  }, [filenameInput, text]);

  useEffect(() => {
    setText(data.text || "");
    setFilenameInput(data.filename || "Notes");
  }, [data.text, data.filename]);

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
        filename={filenameInput}
        setPanelData={setPanelData}
        onDuplicate={onDuplicate}
        onRemove={onRemove}
        extraButtons={[  
        { element: <DownloadButton onClick={handleDownload} />,
          tooltip: "Download txt" } ]}
      />
      <div className="flex-1 p-2">
<textarea
  className="w-full h-full border rounded-xl p-2 resize-none font-mono tracking-normal"
  value={text}
  onChange={e => {
    setText(e.target.value);
    setPanelData(prev => ({
      ...prev,
      [id]: { ...prev[id], text: e.target.value }
    }));
  }}
  placeholder="Write your notes here..."
  spellCheck={false}
  wrap="soft"
  style={{
    minHeight: 120,
    tabSize: 2,                 
    fontVariantLigatures: 'none'
  }}
/>
      </div>
    </PanelContainer>
  );
});

// Update the HistogramPanel component in App.jsx
const HistogramPanel = React.memo(function HistogramPanel({ 
  id, data, onRemove, onReupload, onDuplicate,
  onLinkClick, isLinkModeActive, isEligibleLinkTarget, linkedTo, panelLinks,
  highlightedSite, highlightOrigin, onHighlight, hoveredPanelId, justLinkedPanels,
  setHoveredPanelId, setPanelData,
  linkBadges, onRestoreLink, colorForLink, onUnlink,
  onGenerateCorrelationMatrix
}) {
  const { filename, indexingMode = '1-based' } = data;
  const isTabular = !Array.isArray(data.data);
  const [selectedCol, setSelectedCol] = useState(
    isTabular
      ? (data.selectedCol ||
        data.data.headers.find(h => typeof data.data.rows[0][h] === 'number'))
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
      ? (data.selectedXCol ||
        data.data.headers.find(h => typeof data.data.rows[0][h] === 'number'))
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

  useEffect(() => {
    if (isTabular) {
      setSelectedCol(
        data.selectedCol ||
        data.data.headers.find(h => typeof data.data.rows[0][h] === 'number')
      );
      setSelectedXCol(
        data.selectedXCol ||
        data.data.headers.find(h => typeof data.data.rows[0][h] === 'number')
      );
    }
  }, [isTabular, data.selectedCol, data.selectedXCol, data.data]);

  const numericCols = useMemo(() => {
    if (!isTabular) return [];
    return data.data.headers.filter(h =>
      data.data.rows.every(row => typeof row[h] === 'number')
    );
  }, [isTabular, data]);

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
        extraButtons={[
        ...(!tableViewMode ? [{
            element: <LogYButton onClick={() => {
              setPanelData(prev => ({
                ...prev,
                [id]: { ...prev[id], yLog: !yLog }
              }));
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
                <span className="text-xs text-gray-600">Current: {indexingMode === '1-based' ? '1-based (site 1 is first)' : '0-based (site 0 is first)'}</span>
              </>
            )
          },
          ...(isTabular && numericCols.length >= 2 ? [{
            element: <DistanceMatrixButton onClick={handleCorrelationMatrix} />,
            tooltip: (
              <>
                Compute correlation matrix<br />
                <span className="text-xs text-gray-600">Pearson</span>
              </>
            )
          }] : []),
          { 
            element: <DownloadButton onClick={handleDownload} />,
            tooltip: "Download data" 
          }
        ]}
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
                  {numericCols.map(col => (
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
            highlightedSite={highlightedSite}
            highlightOrigin={highlightOrigin}
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
    prevProps.highlightOrigin === nextProps.highlightOrigin &&
    prevProps.justLinkedPanels.join() === nextProps.justLinkedPanels.join()
  );
});


const usePanelProps = (panelId, {
  linkMode,
  panels,
  panelData,
  panelLinks,
  panelLinkHistory,
  highlightSite,
  highlightOrigin,
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
  const highlightOriginType = highlightOrigin ? (panels.find(p => p.i === highlightOrigin)?.type || null) : null;
  const activePartners = panelLinks[panelId] || [];
  const historyPartners = panelLinkHistory[panelId] || [];
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
    onReupload: id => triggerUpload(panelType, id),
    onDuplicate: duplicatePanel,
    onLinkClick: handleLinkClick,
    linkedTo: activePartners, // Now an array instead of single value
    isLinkModeActive: linkMode === panelId,
    highlightedSite: highlightSite,
    highlightOrigin: highlightOrigin,
    highlightOriginType,
    onHighlight: handleHighlight,
    hoveredPanelId,
    setHoveredPanelId,
    isEligibleLinkTarget,    
    justLinkedPanels,
  }), [
    panelId,
    panelData[panelId],
    historyPartners,
    activePartners,
    linkMode,
    panelLinks[panelId],
    highlightSite,
    highlightOrigin,
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
    highlightOriginType,
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
  highlightSite,
  highlightOrigin,
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
  onSyncScroll,
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
  handleCreateSequenceFromStructure,
  handleStructureToDistance,
  handleGenerateCorrelationMatrix,
  onCreateSubsetMsa,
  setPanelData
}) => {
  const commonProps = usePanelProps(panel.i, {
    linkMode,
    panels,
    panelData,
    panelLinks,
    panelLinkHistory,
    highlightSite,
    highlightOrigin,
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

  // Add panel-specific props
  const additionalProps = {
    setPanelData,
    justLinkedPanels,
    ...(panel.type === 'alignment' && {
      onSyncScroll,
      externalScrollLeft: scrollPositions[panel.i],
      highlightedSequenceId,
      setHighlightedSequenceId,
      onDuplicateTranslate: handleDuplicateTranslate,
      onCreateSeqLogo: handleCreateSeqLogo,
      onCreateSiteStatsHistogram: handleCreateSiteStatsHistogram,
      onGenerateDistance: handleAlignmentToDistance,
      onFastME: handleFastME,
      onCreateSubsetMsa: onCreateSubsetMsa
    }),
    ...(panel.type === 'tree' && {
      highlightedSequenceId,
      onHoverTip: setHighlightedSequenceId,
      onGenerateDistance: handleTreeToDistance
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
      onGenerateDistance: handleStructureToDistance,
      linkedPanelData: (
        Array.isArray(panelLinks[panel.i])
          ? panelLinks[panel.i]
          : panelLinks[panel.i]
            ? [panelLinks[panel.i]]
            : []
      ).map(pid => panelData[pid]).filter(d => d && d.type === 'alignment')
    }),
    ...(panel.type === 'seqlogo' && {
      highlightedSite: highlightSite,
      highlightOrigin: highlightOrigin,
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
    prevProps.highlightSite === nextProps.highlightSite &&
    prevProps.highlightOrigin === nextProps.highlightOrigin &&
    prevProps.hoveredPanelId === nextProps.hoveredPanelId &&
    prevProps.justLinkedPanels.join() === nextProps.justLinkedPanels.join() &&
    prevProps.scrollPositions[prevProps.panel.i] === nextProps.scrollPositions[nextProps.panel.i] &&
    prevProps.highlightedSequenceId === nextProps.highlightedSequenceId
  );
});


function App() {
  const [panels, setPanels] = useState([]);
  const [layout, setLayout] = useState([]);
  const [linkMode, setLinkMode] = useState(null);
  const [panelLinks, setPanelLinks] = useState({});
  const [panelLinkHistory, setPanelLinkHistory] = useState({});
  const [justLinkedPanels, setJustLinkedPanels] = useState([]);
  const [scrollPositions, setScrollPositions] = useState({});
  const [highlightSite, setHighlightSite] = useState(null);
  const [highlightOrigin, setHighlightOrigin] = useState(null);
  const [highlightedSequenceId, setHighlightedSequenceId] = useState(null);
  const [panelData, setPanelData] = useState({});
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [hoveredPanelId, setHoveredPanelId] = useState(null);
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

const upsertHistory = useCallback((a, b) => {
  setPanelLinkHistory(prev => {
    const copy = { ...prev };
    // Always coerce to Set before mutating
    const ensure = (id) => {
      let v = copy[id];
      if (Array.isArray(v)) v = new Set(v);
      else if (!(v instanceof Set)) v = new Set();
      copy[id] = v;
      return v;
    };
    ensure(a).add(b);
    ensure(b).add(a);
    // Return plain arrays for state/serialization
    const normalized = {};
    for (const [k, v] of Object.entries(copy)) {
      normalized[k] = v instanceof Set ? Array.from(v) : Array.isArray(v) ? v : [];
    }
    return normalized;
  });
}, []);

const [linkColors, setLinkColors] = useState({}); // {"a|b": idx}
const pairKey = useCallback((a,b) => [String(a), String(b)].sort().join('|'), []);

const assignPairColor = useCallback((a, b) => {
  const key = pairKey(a, b);
  setLinkColors(prev => {
    if (prev[key] != null) return prev; // Color already assigned, don't change
    
    // Find all colors currently in use
    const used = new Set(Object.values(prev));
    let idx = 0;
    
    // Pick the first unused color globally
    while (idx < linkpalette.length && used.has(idx)) idx++;
    
    if (idx >= linkpalette.length) {
      // If all are used, pick the least-used color
      const counts = Array(linkpalette.length).fill(0);
      for (const v of Object.values(prev)) counts[v] = (counts[v] || 0) + 1;
      let best = 0, bestCnt = counts[0];
      for (let i = 1; i < counts.length; i++) {
        if (counts[i] < bestCnt) { best = i; bestCnt = counts[i]; }
      }
      idx = best;
    }
    
    return { ...prev, [key]: idx };
  });
}, [linkpalette, pairKey]);

  
  // Resolve badge color (active=pair color, inactive=gray; falls back to hash if unseen)
const colorForLink = useCallback((selfId, partnerId, active) => {
  if (!active) return 'bg-gray-300';
  
  const key = pairKey(selfId, partnerId);
  let idx = linkColors[key];
  
  if (idx == null) {
    // stable fallback so history badges don't thrash before allocation
    let h = 0; 
    for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    idx = h % linkpalette.length;
    
    // Assign this color permanently for this pair
    setLinkColors(prev => ({ ...prev, [key]: idx }));
  }
  
  return linkpalette[idx];
}, [linkColors, pairKey, linkpalette]);

const addPanel = useCallback((config = {}) => {
  const { type, data, layoutHint = {}, autoLinkTo = null } = config;
  const newId = `${type}-${Date.now()}`;

  setPanelData(prev => ({ ...prev, [newId]: data }));

  setPanels(prev => {
    const withoutFooter = prev.filter(p => p.i !== '__footer');
    return [...withoutFooter, { i: newId, type }, { i: '__footer', type: 'footer' }];
  });

  setLayout(prevLayout => {
    const layoutWithoutFooter = prevLayout.filter(l => l.i !== '__footer');
    const footer = prevLayout.find(l => l.i === '__footer');
    const GRID_W = 12;
    const defaultW = layoutHint.w || 4;
    const defaultH = layoutHint.h || 20;

    // Build a 2D occupancy map
    const occupancy = {};
    layoutWithoutFooter.forEach(l => {
      for (let x = l.x; x < l.x + l.w; x++) {
        for (let y = l.y; y < l.y + l.h; y++) {
          occupancy[`${x},${y}`] = true;
        }
      }
    });

    // Find the first position (x, y) where the new panel fits
    let found = false, newX = 0, newY = 0;
    outer: for (let y = 0; y < 100; y++) { // Arbitrary max grid height
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
      // Place below all panels
      const maxY = layoutWithoutFooter.reduce((max, l) => Math.max(max, l.y + l.h), 0);
      newX = 0;
      newY = maxY;
    }

    const newLayoutItem = {
      i: newId,
      x: newX,
      y: newY,
      w: defaultW,
      h: defaultH,
      minW: 2,
      minH: 3,
      ...layoutHint,
    };

    const nextLayout = [...layoutWithoutFooter, newLayoutItem];
    const newMaxY = nextLayout.reduce((max, l) => Math.max(max, l.y + l.h), 0);
    const newFooter = { ...(footer || {}), i: '__footer', x: 0, y: newMaxY, w: 12, h: 2, static: true };
    return [...nextLayout, newFooter];
  });

  // --- Auto-link logic ---
if (autoLinkTo) {
  setPanelLinks(pl => {
    const copy = { ...pl };
    // Remove specific link only
    if (copy[newId] && Array.isArray(copy[newId])) {
      copy[newId] = copy[newId].filter(id => id !== autoLinkTo);
      if (copy[newId].length === 0) delete copy[newId];
    }
    if (copy[autoLinkTo] && Array.isArray(copy[autoLinkTo])) {
      copy[autoLinkTo] = copy[autoLinkTo].filter(id => id !== newId);
      if (copy[autoLinkTo].length === 0) delete copy[autoLinkTo];
    }

    // Add the new link
    copy[newId] = Array.isArray(copy[newId]) ? copy[newId] : (copy[newId] ? [copy[newId]] : []);
    if (!copy[newId].includes(autoLinkTo)) copy[newId].push(autoLinkTo);

    // Always coerce to array before push
    let arr = [];
    if (Array.isArray(copy[autoLinkTo])) {
      arr = copy[autoLinkTo];
    } else if (copy[autoLinkTo]) {
      arr = [copy[autoLinkTo]];
    }
    if (!arr.includes(newId)) arr.push(newId);
    copy[autoLinkTo] = arr;

    return copy;
  });
      upsertHistory(newId, autoLinkTo);
      assignPairColor(newId, autoLinkTo);
      setJustLinkedPanels([newId, autoLinkTo]);
      setTimeout(() => setJustLinkedPanels([]), 1000);
    }
  }, [upsertHistory, assignPairColor]);

  const handleCreateSubsetMsa = useCallback((id, selectedIndices) => {
    const sourceData = panelData[id];
    if (!sourceData || !Array.isArray(sourceData.data)) return;

    const subsetMsa = selectedIndices.map(index => sourceData.data[index]);
    const newFilename = (sourceData.filename ? sourceData.filename.replace(/\.[^.]+$/, '') : 'alignment') + '.subset.fasta';

    const newPanelData = JSON.parse(JSON.stringify(sourceData));
    newPanelData.data = subsetMsa;
    newPanelData.filename = newFilename;
    delete newPanelData.highlightedSites;
    delete newPanelData.searchHighlight;
    delete newPanelData.linkedSiteHighlight;

    addPanel({
        type: 'alignment',
        data: newPanelData,
        basedOnId: id,
    });
  }, [panelData, addPanel]);

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

    addPanel({
      type: panel.type,
      data: JSON.parse(JSON.stringify(data)), // Deep copy
      basedOnId: id,
      layoutHint: {
      w: layoutItem.w,
      h: layoutItem.h,
      minW: layoutItem.minW,
      minH: layoutItem.minH,
    },
    });
  }, [panels, panelData, addPanel, layout]);

  const handleUnlink = useCallback((selfId, partnerId) => {
    setPanelLinks(pl => {
      const copy = { ...pl };
      // Remove specific link only
      if (copy[selfId] && Array.isArray(copy[selfId])) {
        copy[selfId] = copy[selfId].filter(id => id !== partnerId);
        if (copy[selfId].length === 0) delete copy[selfId];
      }
      
      if (copy[partnerId] && Array.isArray(copy[partnerId])) {
        copy[partnerId] = copy[partnerId].filter(id => id !== selfId);
        if (copy[partnerId].length === 0) delete copy[partnerId];
      }
      
      return copy;
    });
  }, []);

    const handleDuplicateTranslate = useCallback((id) => {
    const data = panelData[id];
    if (!data) return;

    const translatedMsa = translateNucToAmino(data.data);
    const newFilename = (data.filename ? data.filename.replace(/\.[^.]+$/, '') : 'alignment') + '.aa.fasta';

    addPanel({
      type: 'alignment',
      data: {
        ...data,
        data: translatedMsa,
        filename: newFilename,
        codonMode: false,
      },
      basedOnId: id,
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

  const baseNameStr = (data.filename ? data.filename.replace(/\.[^.]+$/, '') : 'structure');
  const originalLayout = layout.find(l => l.i === id);
  const baseY = originalLayout ? (originalLayout.y + originalLayout.h) : 0;

  const newPanels = [];
  const newLayouts = [];
  const newPanelDataEntries = {};

  [...chains.entries()].forEach(([chainId, { seq }], idx) => {
    if (!seq) return;
    const newId = `alignment-from-pdb-${chainId}-${Date.now()}-${idx}`;
    newPanels.push({ i: newId, type: 'alignment' });
    newLayouts.push({ i: newId, x: 0, y: baseY + idx * 3, h: 3, w: 12, minH: 2, minW: 2 });
    newPanelDataEntries[newId] = {
      data: [{ id: `${baseNameStr}_chain_${chainId}`, sequence: seq }],
      filename: `${baseNameStr}_chain_${chainId}.fasta`,
      codonMode: false
    };
  });

  setPanels(prev => {
    const withoutFooter = prev.filter(p => p.i !== '__footer');
    return [...withoutFooter, ...newPanels, { i: '__footer', type: 'footer' }];
  });

  setLayout(prev => {
    const withoutFooter = prev.filter(l => l.i !== '__footer');
    const footer = prev.find(l => l.i === '__footer');
    const next = [...withoutFooter, ...newLayouts];
    const maxY = next.reduce((m, l) => Math.max(m, l.y + l.h), 0);
    const fixedFooter = footer ? { ...footer, y: maxY } : { i: '__footer', x: 0, y: maxY, w: 12, h: 2, static: true };
    return [...next, fixedFooter];
  });

  setPanelData(prev => ({ ...prev, ...newPanelDataEntries }));

  // --- batch auto-link logic ---
  setPanelLinks(prevLinks => {
    const newLinks = { ...prevLinks };

    // Ensure the structure panel's link entry is an array.
    if (!Array.isArray(newLinks[id])) {
      newLinks[id] = newLinks[id] ? [newLinks[id]] : [];
    }
    
    newPanels.forEach(p => {
      const newId = p.i;
      
      // Link from the new alignment panel to the structure
      newLinks[newId] = [id];

      // Link from the structure to the new alignment panel
      if (!newLinks[id].includes(newId)) {
        newLinks[id].push(newId);
      }

      // Also update history and colors inside the same loop
      upsertHistory(newId, id);
      assignPairColor(newId, id);
    });

    return newLinks;
  });

  const allNewPanelIds = newPanels.map(p => p.i);
  setJustLinkedPanels([...allNewPanelIds, id]);
  setTimeout(() => setJustLinkedPanels([]), 1000);

}, [panelData, layout, setPanels, setLayout, setPanelData, upsertHistory, assignPairColor]);

const handleStructureToDistance = useCallback((id, forcedChoice) => {
  const s = panelData[id];
  if (!s?.pdb) { alert('No PDB found in this panel.'); return; }

  const chains = parsePdbChains(s.pdb);
  if (chains.size === 0) { alert('No CA atoms found to build a distance map.'); return; }

  const first = [...chains.keys()][0];
  const choice = forcedChoice ?? s.chainChoice ?? (chains.size > 1 ? 'ALL' : first);

  let atoms = [];
  if (choice === 'ALL') {
    for (const { atomsCA } of chains.values()) atoms = atoms.concat(atomsCA);
  } else {
    const picked = chains.get(choice);
    if (!picked || picked.atomsCA.length === 0) { alert(`No residues for chain ${choice}.`); return; }
    atoms = picked.atomsCA;
  }

  if (atoms.length < 2) { alert('Not enough residues to build a distance map.'); return; }

  const { labels, matrix } = distanceMatrixFromAtoms(atoms);
  const base  = (s.filename ? s.filename: 'structure');
  const suffix = choice === 'ALL' ? 'ALL' : choice;

  addPanel({
    type: 'heatmap',
    data: { labels, matrix, filename: `${base}_${suffix}.phy` },
    basedOnId: id,
    layoutHint: { w: 4, h: 20 },
    autoLinkTo: id,
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

async function handleFastME(alignmentPanelId, evoModel) {
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

    console.log('Running FastME on', aln.length, 'sequences');

    try { fastme.FS.unlink('in.phy'); } catch {}
    try { fastme.FS.unlink('out.nwk'); } catch {}
    try { fastme.FS.unlink('in.seq.phy'); } catch {}

    const alnPhylip = msaToPhylip(aln);
    fastme.FS.writeFile('in.seq.phy', alnPhylip);
    
    try {
      const test = fastme.FS.readFile('in.seq.phy', { encoding: 'utf8' });
      console.log('PHYLIP alignment file written, length:', test.length);
    } catch (e) {
      console.error('Failed to write in.phy:', e);
      alert('FastME input file was not written to WASM FS.');
      return;
    }

    const isProtein = Array.isArray(aln) && !isNucleotide(aln);
    let flag = isProtein? '--protein' : '--dna';
    flag += `=${evoModel}`;

    
    // 3) Run FastME
    const argv = ['fastme', '-i', 'in.seq.phy',flag  ,'-n','-s', '-o', 'out.nwk'];
    console.log('FastME argv:', argv.join(' '));
    const rc = fastme.callMain(argv);
    if (rc !== 0) {
      console.warn('FastME exited with code', rc);
    }

    // 4) Fetch Newick and surface it as a new Tree panel
    let newick = '';
    try {
      newick = fastme.FS.readFile('out.nwk', { encoding: 'utf8' });
    } catch (e) {
      alert('FastME did not produce a tree (out.nwk missing).');
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
    // 5) Add a new tree panel
    const srcName = panelData[alignmentPanelId]?.filename || 'alignment';
    const base = srcName.replace(/\.[^.]+$/, '');
    addPanel({
      type: 'tree',
      data: {
        data: newick,
        filename: `${base}_fastme.nwk`,
        isNhx: false,
        method: 'FastME',
        sourceAlignment: alignmentPanelId,
      },
      basedOnId: alignmentPanelId,
      layoutHint: { w: 4, h: 20 },
      autoLinkTo: alignmentPanelId,
    });

    // 6) Clean up FS
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
        labels,
        matrix,
        filename: `${base}_corr.phy`,
      },
      basedOnId: id,
      layoutHint: { w: 4, h: 20 },
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
      data: { labels, matrix, filename: `${base}.phy` },
      basedOnId: id,
      layoutHint: { w: 4, h: 20 },
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
    data: { labels, matrix, filename: `${base}.phy` },
    basedOnId: id,
    layoutHint: { w: 4, h: 20 },
    autoLinkTo: id,
  });
}, [panelData, addPanel]);

const handleHeatmapToTree = useCallback((id) => {
  const heatmapData = panelData[id];
  if (!heatmapData?.labels || !heatmapData?.matrix) {
    alert('No valid distance matrix data found.');
    return;
  }

  try {
    const newickString = buildTreeFromDistanceMatrix(heatmapData.labels, heatmapData.matrix);
    
    const baseName = (heatmapData.filename || 'distance_matrix').replace(/\.[^.]+$/, '');
    
    addPanel({
      type: 'tree',
      data: {
        data: newickString,
        filename: `${baseName}.nwk`,
        isNhx: false
      },
      basedOnId: id,
      layoutHint: { w: 4, h: 20 },
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

  setPanelLinks(pl => {
    const copy = { ...pl };
    // Add back the specific link
    copy[selfId] = Array.isArray(copy[selfId]) ? copy[selfId] : (copy[selfId] ? [copy[selfId]] : []);
    if (!copy[selfId].includes(partnerId)) copy[selfId].push(partnerId);

    copy[partnerId] = Array.isArray(copy[partnerId]) ? copy[partnerId] : (copy[partnerId] ? [copy[partnerId]] : []);
    if (!copy[partnerId].includes(selfId)) copy[partnerId].push(selfId);

    return copy;
  });
  
  assignPairColor(selfId, partnerId); // Ensure color is assigned
  setJustLinkedPanels([selfId, partnerId]);
  setTimeout(() => setJustLinkedPanels([]), 1000);
}, [panels, assignPairColor]);


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

  const reorderIfTreeLinked = (aId, bId) => {
    const panelA = panels.find(p => p.i === aId);
    const panelB = panels.find(p => p.i === bId);
    if (!panelA || !panelB) return;

    const treeId = panelA.type === 'tree' ? aId : panelB.type === 'tree' ? bId : null;
    if (!treeId) return;

    const leafOrder = getLeafOrderFromNewick(panelData[treeId]?.data || '');
    if (!leafOrder?.length) return;

    // MSA <-> Tree
    const alnId = panelA.type === 'alignment' ? aId : (panelB.type === 'alignment' ? bId : null);
    if (alnId) {
      const msa = panelData[alnId];
      if (msa?.data?.length) {
        const reordered = reorderMsaByLeafOrder(msa.data, leafOrder);
        setPanelData(prev => ({ ...prev, [alnId]: { ...prev[alnId], data: reordered }}));
      }
    }

    // Heatmap <-> Tree
    const hmId = panelA.type === 'heatmap' ? aId : (panelB.type === 'heatmap' ? bId : null);
    if (hmId) {
      const hm = panelData[hmId];
      if (hm?.labels && hm?.matrix) {
        const { labels, matrix } = reorderHeatmapByLeafOrder(hm.labels, hm.matrix, leafOrder);
        setPanelData(prev => ({ ...prev, [hmId]: { ...prev[hmId], labels, matrix }}));
      }
    }
  };
  if (!linkMode) {
    setLinkMode(id);
  } else {
    if (linkMode === id) {
      setLinkMode(null);
    } else {
        const a = linkMode, b = id;
        setPanelLinks(pl => {
        const copy = { ...pl };
        copy[a] = Array.isArray(copy[a]) ? copy[a] : (copy[a] ? [copy[a]] : []);
        if (!copy[a].includes(b)) copy[a].push(b);

        copy[b] = Array.isArray(copy[b]) ? copy[b] : (copy[b] ? [copy[b]] : []);
        if (!copy[b].includes(a)) copy[b].push(a);

        return copy;
      });

        upsertHistory(a, b);
        assignPairColor(a, b);
        setJustLinkedPanels([linkMode, id]);
        setTimeout(() => setJustLinkedPanels([]), 1000);

      // Reorder if tree linked
      reorderIfTreeLinked(a, b);

      // ----- If we just linked an alignment with a structure, pick and persist the chain -----
      try {
        const panelA = panels.find(p => p.i === a);
        const panelB = panels.find(p => p.i === b);
        if (panelA && panelB) {
          const isAlnStruct =
            (panelA.type === 'alignment' && panelB.type === 'structure') ||
            (panelA.type === 'structure' && panelB.type === 'alignment');

          if (isAlnStruct) {
            const structId = panelA.type === 'structure' ? a : b;
            const alnId    = panelA.type === 'alignment' ? a : b;

            const structData = panelData[structId];
            const alnData    = panelData[alnId];

            if (structData?.pdb && Array.isArray(alnData?.data) && alnData.data.length > 0) {
              // Build map of structure chain lengths
              const chains = parsePdbChains(structData.pdb);
              const chainLengths = {};
              for (const [cid, { seq }] of chains.entries()) {
                chainLengths[cid] = (seq || '').length;
              }

              // Preferred chain from MSA IDs
              const preferredFromId =
                chainIdFromSeqId(alnData.data[0]?.id) || null;

              const { chainId } = pickAlignedSeqForChain(
                alnData,
                preferredFromId,
                chainLengths,
                chains,
              );

              if (chainId) {
                setPanelData(prev => ({
                  ...prev,
                  [structId]: {
                    ...prev[structId],
                    linkedChainId: chainId
                  }
                }));
              }
            }
          }
        }
      } catch (e) {
        console.warn('Failed to persist linkedChainId on link:', e);
      }

      setLinkMode(null);
    }
  }

  // clear any existing highlights
  setHighlightSite(null);
  setHighlightOrigin(null);
}, [linkMode, panelLinks, panels, panelData]);

const handleHighlight = useCallback((site, originId) => {
 if (highlightSite === site && highlightOrigin === originId) return;
  setHighlightSite(site);
  setHighlightOrigin(originId);

  const targetIdsRaw = panelLinks[originId] || [];
  const targetIds = Array.isArray(targetIdsRaw) ? targetIdsRaw : (targetIdsRaw ? [targetIdsRaw] : []);
  if (!targetIds.length) return;


  const clearDownstream = (sourcePanel, targetPanel, targetId) => {
    // clear heatmap -> tree/align/structure transient state on hover out
    if (site !== null) return;
    if (sourcePanel.type === 'heatmap' && targetPanel.type === 'tree') {
      setPanelData(prev => {
        const cur = prev[targetId] || {};
        if (!cur.linkedHighlights || cur.linkedHighlights.length === 0) return prev;
        return { ...prev, [targetId]: { ...cur, linkedHighlights: [] } };
      });
    }
    if (sourcePanel.type === 'heatmap' && targetPanel.type === 'heatmap') {
      setPanelData(prev => {
        const cur = prev[targetId] || {};
        if (!cur.linkedHighlightCell) return prev;
        return { ...prev, [targetId]: { ...cur, linkedHighlightCell: undefined } };
      });
    }
    if (sourcePanel.type === 'heatmap' && targetPanel.type === 'alignment') {
       setPanelData(prev => {
   const cur = prev[targetId] || {};
   if (!cur.linkedHighlights || cur.linkedHighlights.length === 0) return prev;
   return { ...prev, [targetId]: { ...cur, linkedHighlights: [] } };
 });
    }
    if (sourcePanel.type === 'heatmap' && targetPanel.type === 'structure') {
       setPanelData(prev => {
   const cur = prev[targetId] || {};
   if (!Array.isArray(cur.linkedResiduesByKey) || cur.linkedResiduesByKey.length === 0) return prev;
   return { ...prev, [targetId]: { ...cur, linkedResiduesByKey: [] } };
 });
    }
    if (sourcePanel.type === 'alignment' && targetPanel.type === 'structure') {
       setPanelData(prev => {
   const cur = prev[targetId] || {};
   if (cur.linkedResidueIndex == null) return prev;
   return { ...prev, [targetId]: { ...cur, linkedResidueIndex: undefined, linkedChainId: cur.linkedChainId } };
 });
    }
      if (sourcePanel.type === 'histogram' && targetPanel.type === 'histogram') {
    setPanelData(prev => {
      const cur = prev[targetId] || {};
      if (!cur.highlightedSites || cur.highlightedSites.length === 0) return prev;
      return { ...prev, [targetId]: { ...cur, highlightedSites: [] } };
    });
  }
  if (sourcePanel.type === 'structure' && targetPanel.type === 'alignment') {
        setPanelData(prev => {
            const cur = prev[targetId] || {};
            if (cur.linkedSiteHighlight == null) return prev;
            return { ...prev, [targetId]: { ...cur, linkedSiteHighlight: undefined } };
        });
    }
  
  
  if (sourcePanel.type === 'histogram' && targetPanel.type === 'seqlogo') {
    setPanelData(prev => {
      const cur = prev[targetId] || {};
      if (cur.highlightedSite == null) return prev;
      return { ...prev, [targetId]: { ...cur, highlightedSite: null } };
    });
  }
  
  if ((sourcePanel.type === 'alignment' || sourcePanel.type === 'seqlogo') && 
      targetPanel.type === 'histogram') {
    setPanelData(prev => {
      const cur = prev[targetId] || {};
      if (!cur.highlightedSites || cur.highlightedSites.length === 0) return prev;
      return { ...prev, [targetId]: { ...cur, highlightedSites: [] } };
    });
  }
  };

  // Apply highlight to all linked panels
targetIds.forEach(targetId => {
  const sourcePanel = panels.find(p => p.i === originId);
  const targetPanel = panels.find(p => p.i === targetId);
  if (!sourcePanel || !targetPanel) return; // <-- already present, keep this

  if (site === null) { clearDownstream(sourcePanel, targetPanel, targetId); return; } // <-- pass the right args

  const S = sourcePanel.type, T = targetPanel.type;

  const handlers = {
    // Heatmap -> Tree
    'heatmap->tree': () => {
      const { labels } = panelData[originId] || {};
      if (!labels || !site?.row?.toString || !site?.col?.toString) return;
      const leaf1 = labels[site.row], leaf2 = labels[site.col];
       setPanelData(prev => {
        const cur = prev[targetId] || {};
        const next = [leaf1, leaf2];
        const same = Array.isArray(cur.linkedHighlights)
          && cur.linkedHighlights.length === 2
          && cur.linkedHighlights[0] === next[0]
          && cur.linkedHighlights[1] === next[1];
   if (same) return prev;
   return { ...prev, [targetId]: { ...cur, linkedHighlights: next } };
 });
    },

    // Heatmap -> Alignment (highlight 2 row labels)
    'heatmap->alignment': () => {
      const { labels } = panelData[originId] || {};
      if (!labels || typeof site?.row !== 'number' || typeof site?.col !== 'number') return;
      const leaf1 = labels[site.row], leaf2 = labels[site.col];
      setPanelData(prev => {
      const cur = prev[targetId] || {};
      const next = [leaf1, leaf2];
      const same = Array.isArray(cur.linkedHighlights)
        && cur.linkedHighlights.length === 2
        && cur.linkedHighlights[0] === next[0]
        && cur.linkedHighlights[1] === next[1];
   if (same) return prev;
   return { ...prev, [targetId]: { ...cur, linkedHighlights: next } };
    });
    },
    'heatmap->heatmap': () => {
      const { labels } = panelData[originId] || {};
      if (
        !labels ||
        typeof site?.row !== 'number' ||
        typeof site?.col !== 'number'
      )
        return;
      const rowLabel = labels[site.row];
      const colLabel = labels[site.col];
      setPanelData(prev => {
        const cur = prev[targetId] || {};
        const next = { row: rowLabel, col: colLabel };
        const same =
          cur.linkedHighlightCell &&
          cur.linkedHighlightCell.row === next.row &&
          cur.linkedHighlightCell.col === next.col;
        if (same) return prev;
        return { ...prev, [targetId]: { ...cur, linkedHighlightCell: next } };
      });
    },
    // Heatmap -> Structure (map labels like "A:123" to residues)
    'heatmap->structure': () => {
      const { labels } = panelData[originId] || {};
      if (!labels || typeof site?.row !== 'number' || typeof site?.col !== 'number') return;
      const parseLabel = (lbl) => {
        const m = String(lbl).trim().match(/^([A-Za-z0-9]):(\d+)([A-Za-z]?)$/);
        if (!m) return null;
        const [, chainId, resiStr, icode] = m;
        return { chainId, resi: Number(resiStr), icode: icode || '' };
      };
      const a = parseLabel(labels[site.row]);
      const b = parseLabel(labels[site.col]);
      const list = [a, b].filter(Boolean);
      setPanelData(prev => {
        const cur = prev[targetId] || {};
        const newChain = list[0]?.chainId || cur.linkedChainId;
        const sameList = JSON.stringify(cur.linkedResiduesByKey) === JSON.stringify(list);
        if (sameList && cur.linkedChainId === newChain) return prev;
        return { ...prev, [targetId]: { ...cur, linkedResiduesByKey: list, linkedChainId: newChain } };
      });
    },

    // SeqLogo <-> Alignment (scroll & mirror highlight)
    'seqlogo->alignment': () => {
      const targetData = panelData[targetId];
      if (!targetData) return;
      const isCodon = !!targetData.codonMode;
      const scrollSite = isCodon ? site * 3 : site;
      setScrollPositions(prev => {
        const v = scrollSite * CELL_SIZE;
        if (prev[targetId] === v) return prev;
      return { ...prev, [targetId]: v };
   });
    },
    // SeqLogo -> Histogram (highlight corresponding bar)
  'seqlogo->histogram': () => {
    const targetData = panelData[targetId];
    if (!targetData) return;
    
    let barIndex = site;
    
    // If histogram has tabular data, find the bar that matches the site value
    if (!Array.isArray(targetData.data)) {
      const xCol = targetData.selectedXCol ||
        targetData.data.headers.find(h => typeof targetData.data.rows[0][h] === 'number');
      
      if (xCol) {
        // Find the row where xCol value matches the site + 1 (1-based)
        const matchingRow = targetData.data.rows.findIndex(row => 
          row[xCol] === site + 1
        );
        
        if (matchingRow !== -1) {
          barIndex = matchingRow;
        }
      }
    }
    
    setPanelData(prev => {
      const cur = prev[targetId] || {};
      if (cur.highlightedSites && cur.highlightedSites.includes(barIndex)) return prev;
      return { ...prev, [targetId]: { ...cur, highlightedSites: [barIndex] } };
    });
  },
    'alignment->seqlogo': () => {
    },

    // Alignment -> Histogram (match X if tabular)
    'alignment->histogram': () => {
      const targetData = panelData[targetId];
      if (targetData && !Array.isArray(targetData.data)) {
        const xCol = targetData.selectedXCol ||
          targetData.data.headers.find(h => typeof targetData.data.rows[0][h] === 'number');
        if (xCol) {
          const xArr = targetData.data.rows.map(row => row[xCol]);
          const barIdx = xArr.findIndex(x => x === site);
          setHighlightSite(barIdx === -1 ? null : barIdx);
          setHighlightOrigin(originId);
        }
      }
    },

    // Histogram -> Alignment (scroll to MSA column or mapped X)
    'histogram->alignment': () => {
      // The 'site' parameter is the 0-based index.
      const targetData = panelData[targetId];
      if (!targetData) return;

      const isCodon = !!targetData.codonMode;
      const scrollCol = site;
      
      // Perform the scroll
      setScrollPositions(prev => {
        const v = scrollCol * (isCodon ? 3 : 1) * CELL_SIZE;
        if (prev[targetId] === v) return prev;
        return { ...prev, [targetId]: v };
      });
    },

    // Histogram -> Histogram (highlight same bar index)
    'histogram->histogram': () => {
      setPanelData(prev => {
        const cur = prev[targetId] || {};
        if (cur.highlightedSites && cur.highlightedSites.includes(site)) return prev;
        return { ...prev, [targetId]: { ...cur, highlightedSites: [site] } };
      });
    },

    // Alignment -> Histogram (highlight corresponding bar)
  'alignment->histogram': () => {
    const targetData = panelData[targetId];
    if (!targetData) return;
    
    let barIndex = site;
    
    // If histogram has tabular data, find the bar that matches the site value
    if (!Array.isArray(targetData.data)) {
      const xCol = targetData.selectedXCol ||
        targetData.data.headers.find(h => typeof targetData.data.rows[0][h] === 'number');
      
      if (xCol) {
        // Find the row where xCol value matches the site + 1 (1-based)
        const matchingRow = targetData.data.rows.findIndex(row => 
          row[xCol] === site + 1
        );
        
        if (matchingRow !== -1) {
          barIndex = matchingRow;
        }
      }
    }
    
    setPanelData(prev => {
      const cur = prev[targetId] || {};
      if (cur.highlightedSites && cur.highlightedSites.includes(barIndex)) return prev;
      return { ...prev, [targetId]: { ...cur, highlightedSites: [barIndex] } };
    });
  },

    // Alignment -> Alignment (codon-aware scroll sync)
    'alignment->alignment': () => {
      const targetData = panelData[targetId];
      if (!targetData) return;
      const scrollSite = targetData.codonMode ? site * 3 : site;
      setScrollPositions(prev => {
        const v = scrollSite * CELL_SIZE;
        if (prev[targetId] === v) return prev;
      return { ...prev, [targetId]: v };
   });
    },

    // Alignment -> Structure (map MSA col to residue index)
    'alignment->structure': () => {
      const alnData = panelData[originId];
      const structId = targetId;
      const preferredChain =
        chainIdFromSeqId(alnData?.data?.[0]?.id) || null;

      const { seq, chainId } = pickAlignedSeqForChain(alnData, preferredChain, null);
      if (!seq) return;

      const residIdx = msaColToResidueIndex(seq.sequence, site);
   setPanelData(prev => {
     const cur = prev[structId] || {};
     const newChain = chainId || preferredChain || undefined;
    if (cur.linkedResidueIndex === residIdx && cur.linkedChainId === newChain) return prev;
   return { ...prev, [structId]: { ...cur, linkedResidueIndex: residIdx, linkedChainId: newChain } };
 });
    },

    // Structure -> Alignment (map residue index to MSA col)
'structure->alignment': () => {
      // Ensure the highlight payload from the structure is valid
      if (typeof site !== 'object' || site === null || site.residueIndex == null || !site.chainId) {
        return;
      }
      
      const alnData = panelData[targetId];
      if (!alnData?.data) return;

      // Check if this specific alignment panel corresponds to the hovered chain
      const { seq, chainId: matchedChainId } = pickAlignedSeqForChain(alnData, site.chainId, null);

      // If this alignment isn't for the hovered chain, do nothing
      if (!seq || matchedChainId !== site.chainId) {
        return;
      }

      // Convert the structure's residue index to an MSA column index
      const col = residueIndexToMsaCol(seq.sequence, site.residueIndex);
      if (col == null) return;

      // Update the alignment panel's scroll position
      const isCodon = !!panelData[targetId]?.codonMode;
      setScrollPositions(prev => {
        const v = col * (isCodon ? 3 : 1) * CELL_SIZE;
        if (prev[targetId] === v) return prev;
        return { ...prev, [targetId]: v };
      });

      // Set a panel-specific highlight, avoiding the global state
      setPanelData(prev => {
        const current = prev[targetId] || {};
        if (current.linkedSiteHighlight === col) return prev;
        return {
          ...prev,
          [targetId]: { ...current, linkedSiteHighlight: col }
        };
      });
    },
  };

  const key = `${S}->${T}`;
  if (handlers[key]) handlers[key]();
  });
}, [panelLinks, panels, panelData, highlightSite, highlightOrigin]);

 useEffect(() => {
    // This effect acts as a safeguard. If a highlight is active (highlightOrigin is set)
    // but the mouse is no longer hovering over that origin panel, it means the
    // hover has ended. We then explicitly call handleHighlight with `null` to ensure
    // all downstream clearing logic (for both global and panel-specific highlights) is run.
    if (highlightOrigin && hoveredPanelId !== highlightOrigin) {
      handleHighlight(null, highlightOrigin);
    }
  }, [hoveredPanelId, highlightOrigin, handleHighlight]);

  const triggerUpload = useCallback((type, panelId = null) => {
      pendingTypeRef.current = type;
      pendingPanelRef.current = panelId;
      if (fileInputRef.current) fileInputRef.current.click();
    }, [panelData, layout]);

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
      panelPayload = { data: parsed, filename };
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
            const values = lines.map(s => Number(s.trim())).filter(n => Number.isFinite(n));
            const xValues = values.map((_, i) => i + 1);
            const indexingMode = detectIndexingMode(xValues); // Will be '1-based'
            panelPayload = { data: values, filename, xValues, indexingMode };
        }
    } else if (type === 'heatmap') {
        const text = await file.text();
        const parsed = parsePhylipDistanceMatrix(text);
        panelPayload = { ...parsed, filename };
    } else if (type === 'structure') {
        const text = await file.text();
        panelPayload = { pdb: text, filename };
    }

    // Update or add panel data
    if (isReupload) {
        setPanelData(prev => ({ ...prev, [id]: panelPayload }));
    } else {
        addPanel({
            type,
            data: panelPayload,
            layoutHint: { w: 4, h: 20 }
        });
    }

    // Reset input
    pendingTypeRef.current = null;
    pendingPanelRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = null;
};

  const removePanel = useCallback((id) => {
    setPanels(p => p.filter(p => p.i !== id));
    setPanelData(d => { const c={...d}; delete c[id]; return c; });
    setLayout(l => l.filter(e => e.i !== id));
    setPanelLinks(pl => {
      const c = { ...pl };
      const partners = Array.isArray(c[id]) ? c[id] : [];
      delete c[id];
      partners.forEach(pid => {
        if (Array.isArray(c[pid])) {
          c[pid] = c[pid].filter(x => x !== id);
          if (c[pid].length === 0) delete c[pid];
        }
      });
      return c;
    });
    // purge any pair colors that referenced this id
    setLinkColors(prev => {
     const next = {};
     for (const [k, v] of Object.entries(prev)) {
       const [x,y] = k.split('|');
       if (x !== String(id) && y !== String(id)) next[k] = v;
     }
     return next;
   });
     setPanelLinkHistory(h => {
   const copy = { ...h };
   delete copy[id];                         // drop the removed panel's own history
   for (const k of Object.keys(copy)) {
     copy[k] = (copy[k] || []).filter(pid => pid !== id); // remove badges pointing to it
   }
   return copy;
 });
 setLinkMode(lm => (lm === id ? null : lm)); // if user was mid-link with this panel, cancel it
    setScrollPositions(sp => {
      const c = { ...sp };
      delete c[id];
      return c;
    });
    if (highlightOrigin === id) {
      setHighlightOrigin(null);
      setHighlightSite(null);
    }
  }, [panelData, highlightOrigin]);

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

  const handleLoadBoard = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const board = JSON.parse(text);
      setPanels(board.panels || []);
      setLayout(board.layout || []);
      setPanelData(board.panelData || {});
      setPanelLinks(board.panelLinks || {});
      setPanelLinkHistory(buildHistory(board));
    } catch (err) {
      alert('Invalid board file');
    }
    fileInputRefBoard.current.value = null;
    setTitleFlipKey(Date.now());
  };

  const handleSaveBoard = () => {
    const board = { panels, layout, panelData, panelLinks, panelLinkHistory };
    mkDownload('mseaboard', JSON.stringify(board, null, 2), 'json', 'application/json')();
  };

  // Gist Sharing with Token Auth and Compression
  const handleShareBoard = useCallback(async (token) => {
    const tokenToUse = token || githubToken;
    if (!tokenToUse) {
      setShowTokenModal(true);
      return;
    }
    setTransientMessage('Creating shareable link...');
    try {
        const boardState = { panels, layout, panelData, panelLinks, panelLinkHistory };
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
  }, [githubToken, panels, layout, panelData, panelLinks, panelLinkHistory]);

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
            const board = JSON.parse(jsonString);

            if (board.panels && board.layout && board.panelData) {
                setPanels(board.panels);
                setLayout(board.layout);
                setPanelData(board.panelData);
                setPanelLinks(board.panelLinks || {});
                setPanelLinkHistory(buildHistory(board));
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
      
      // Determine the default X column and use it for detection.
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
      const parsed = parsePhylipDistanceMatrix(text);
      return { type: 'heatmap', payload: { ...parsed, filename } };
    } catch {
      // fall back to unknown
    }
  }

  if (kind === 'structure') {
    return { type: 'structure', payload: { pdb: text, filename } };
  }

  return { type: 'unknown', payload: { filename } };
};

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
    try {
      const text = await onlyFile.text();
      const board = JSON.parse(text);
      setPanels(board.panels || []);
      setLayout(board.layout || []);
      setPanelData(board.panelData || {});
      setPanelLinks(board.panelLinks || {});
      setPanelLinkHistory(buildHistory(board));
      setTitleFlipKey(Date.now());
      return;
    } catch {
      alert('Invalid board file (.json). Opening nothing.');
      return;
    }
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
      addPanel({
        type: built.type,
        data: built.payload,
        layoutHint: { w: 4, h: built.type === 'seqlogo' ? 8 : 20 }
      });
    } catch (err) {
      console.error('Failed to open dropped file', f.name, err);
    }
  }
};

function DelayedTooltip({ children, delay = 100,top=54, ...props }) {
  const [visible, setVisible] = React.useState(false);
  const timer = React.useRef();

  const show = () => {
    timer.current = setTimeout(() => setVisible(true), delay);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setVisible(false);
  };

  return (
    <span
      onMouseEnter={show}
      onPointerLeave={hide}
      onFocus={show}
      onBlur={hide}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {props.trigger}
      {visible && (
        <span className="absolute text-center left-1/2 -translate-x-1/2 top-16 z-10 px-2 py-1
         rounded-xl bg-gray-200 text-black text-sm pointer-events-none
        transition-opacity whitespace-nowrap opacity-100 border border-gray-400"
          style={{ top: top}}
        >

          {children}
        </span>
      )}
    </span>
  );
}

const LINK_COMPAT = {
  alignment: new Set(['alignment','seqlogo','histogram','structure','tree', 'heatmap']),
  seqlogo:   new Set(['alignment','histogram','seqlogo']),
  histogram: new Set(['alignment','histogram','seqlogo']),
  heatmap:   new Set(['tree','heatmap','alignment','structure']),
  tree:      new Set(['alignment','heatmap','tree']),
  structure: new Set(['alignment','heatmap']),
  notepad:   new Set([]),
};

const canLink = (typeA, typeB) => {
  return !!(LINK_COMPAT[typeA] && LINK_COMPAT[typeA].has(typeB));
};


    return (
      <div
  className="h-screen w-screen flex flex-col overflow-hidden bg-white text-black"
  onDragEnter={handleDragEnter}
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
>
{transientMessage && (
  <div className="fixed inset-0 z-[10002] flex items-center justify-center">
    <div className="bg-blue-400 text-white px-6 py-5 rounded-xl shadow-lg text-2xl font-semibold transition-all animate-fade-in-out">
      {transientMessage}
    </div>
  </div>
)}
  {isDragging && (
  <div className="pointer-events-none fixed inset-0 z-[10000] bg-black/30 flex items-center justify-center">
    <div className="pointer-events-none bg-white rounded-xl shadow-xl px-6 py-4 text-center">
      <div className="text-2xl font-bold">Drop files to open</div>
      <div className="text-sm text-gray-600 mt-1">
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
          <div style={{ height: 77 }} /> {/* Spacer for fixed header */}
<div className="flex items-center gap-2"  style={{ pointerEvents: 'auto' }}>
<div className="p-1/2 flex justify-between items-center"></div>
  <div className="flex items-center gap-2 mt-2 mr-4 px-1 py-2 rounded-xl 
    bg-white-100/100">
{/*border border-gray-400 bg-gradient-to-r from-purple-400/20 via-orange-400/20 via-yellow-400/20 via-purple-400/20 via-blue-400/20 via-indigo-400/20 to-green-400/20 backdrop-blur-xl*/}
      <div className="flex flex-wrap items-center gap-0">
<div className="relative group mr-2 ml-2">
  <DelayedTooltip  delay={135} top={54}
    trigger={
      <button
        onClick={handleSaveBoard}
        className="w-10 h-10 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 shadow-lg hover:shadow-xl flex items-center justify-center "
      >
        <ArrowDownTrayIcon className="w-6 h-6 " />
      </button>
    }
  >
    <b>Save Board</b>
    <br />
    Save this board layout, data<br /> and links to a file
  </DelayedTooltip>
</div>
<div className="relative group mr-0">
  <DelayedTooltip delay={135} top={54}
    trigger={
      <button
        onClick={() => fileInputRefBoard.current.click()}
        className="w-10 h-10 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 shadow-lg hover:shadow-xl flex items-center justify-center "
      >
        <ArrowUpTrayIcon className="w-6 h-6" />
      </button>
    }
  >
    <b>Load Board</b>
    <br />
    Load a saved board <br /> from a file
  </DelayedTooltip>
</div>
{/* share button (gist) */}
<div className="relative group ml-2">
    <DelayedTooltip delay={135} top={54}
        trigger={
            <button
                onClick={() => handleShareBoard()}
                className="w-10 h-10 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 shadow-lg hover:shadow-xl flex items-center justify-center"
            >
                <ArrowUpOnSquareIcon className="w-6 h-6" />
            </button>
        }
    >
        <b>Share via Gist</b>
        <br />
        Copy a shareable link to the clipboard
    </DelayedTooltip>
</div>
</div>
  <DelayedTooltip delay={135} top={58}
  trigger={
    <button
      onClick={() => {
        addPanel({
          type: 'notepad',
          data: { filename: "Notes", text: "" },
          layoutHint: { w: 4, h: 10 }
        });
      }}
      className="w-24 upload-btn-trigger  whitespace-normal break-words h-18 bg-yellow-100 text-black px-4 py-4 rounded-xl hover:bg-yellow-200 shadow-lg hover:shadow-xl leading-tight "
    >
      Notepad
    </button>
  }
>
  <b>New Notepad</b>
  <br />
  Add a notepad panel <br /> for notes and comments
  </DelayedTooltip>
    <input
      ref={fileInputRefBoard}
      type="file"
      accept=".json"
      onChange={handleLoadBoard}
      style={{ display: 'none' }}
    />        
  <DelayedTooltip delay={135} top={58}
    trigger={
            <button onClick={() => triggerUpload('alignment')} className="w-24 upload-btn-trigger  whitespace-normal break-words h-18 bg-green-200 text-black px-4 py-4 rounded-xl hover:bg-green-300 shadow-lg hover:shadow-xl leading-tight ">
              MSA
              </button>}
  >
    <b>Upload MSA</b>
    <br />
    Upload a sequence or multiple sequence <br /> alignment in FASTA format (.fasta/.fas)
  </DelayedTooltip>
  <DelayedTooltip delay={135} top={58}
    trigger={
            <button onClick={() => triggerUpload('tree')} className="w-24 upload-btn-trigger  whitespace-normal break-words h-18 bg-blue-200 text-black px-4 py-4 rounded-xl hover:bg-blue-300 shadow-lg hover:shadow-xl leading-tight ">
              Tree
            </button>}
  >
    <b>Upload Tree</b>
    <br />
    Upload a phylogenetic tree <br /> in Newick format (.nwk/.nhx)
  </DelayedTooltip>
  <DelayedTooltip delay={135} top={58}
    trigger={
            <button onClick={() => triggerUpload('histogram')}  className="w-24 upload-btn-trigger  whitespace-normal break-words h-18 bg-orange-200 text-black px-4 py-4 rounded-xl hover:bg-orange-300 shadow-lg hover:shadow-xl leading-tight ">
              Data
            </button>}
  >
    <b>Upload Data</b>
    <br />
    Upload tabular data (.tsv/.csv) <br /> or a list of numbers (.txt)
  </DelayedTooltip>
  <DelayedTooltip delay={135} top={58}
    trigger={
  
            <button onClick={() => triggerUpload('heatmap')}  className="w-24 upload-btn-trigger  whitespace-normal break-words h-18 bg-red-200 text-black px-4 py-2 rounded-xl hover:bg-red-300 shadow-lg hover:shadow-xl leading-tight ">
            Distance Matrix
            </button>}
  >
    <b>Upload Distance Matrix</b>
    <br />
    Upload a distance matrix <br /> in PHYLIP format (.phy/.phylip/.dist)
  </DelayedTooltip>
  <DelayedTooltip delay={135} top={58}
    trigger={
            <button onClick={() => triggerUpload('structure')} className="w-24 upload-btn-trigger  whitespace-normal break-words h-18 bg-purple-200 text-black px-4 py-4 rounded-xl hover:bg-purple-300 shadow-lg hover:shadow-xl leading-tight ">
              Structure
            </button>}
  >
    <b>Upload Structure</b>
    <br />
    Upload a molecular structure <br /> in PDB format (.pdb)
  </DelayedTooltip>
            <GitHubButton />
            <input ref={fileInputRef} type="file" accept=".fasta,.nwk,.nhx,.txt,.tsv,.csv,.fas,.phy,.phylip,.dist,.pdb" onChange={handleFileUpload} style={{ display: 'none' }} />
          </div>
        </div>
        </div>
         {/* instructions and example */}
{panels.length === 0 && (
  <div className="flex flex-col items-center justify-center px-3 w-full" style={{ marginTop: 5 }}>
    <div
      style={{
        height: 74,
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
            <div className="text-2xl font-bold mb-4 text-gray-700">
              Drag and drop files, use the upload buttons above
            </div>
<div className="flex items-center gap-2 mt-2">
  
  <span className="text-2xl font-bold text-gray-700">or</span>
  <button
    className="bg-gray-200 hover:bg-gray-300 text-black text-2xl font-semibold px-3 py-3 rounded-xl shadow-lg transition"
    onClick={async () => {
      try {
        const resp = await fetch('/mseaboard-example.json');
        if (!resp.ok) throw new Error('Example file not found');
        const text = await resp.text();
        const board = JSON.parse(text);
        setPanels(board.panels || []);
        setLayout(board.layout || []);
        setPanelData(board.panelData || {});
        setPanelLinks(board.panelLinks || {});
        setPanelLinkHistory(buildHistory(board));
        setTitleFlipKey(Date.now());
      } catch (err) {
        alert('Failed to load example board.');
      }
    }}
  >
    Load an example
  </button>
</div>
          </div>
        )}

              {panels.length > 0 && (
        <div className="flex-grow overflow-auto pb-20">
 <div
      style={{
        height: 74,
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
      <div className="flex flex-col items-center justify-center px-3 w-full" style={{ marginTop: 10 }}>
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
              const fixedFooter = { ...footer, y: maxY };
              setLayout([...others, fixedFooter]);
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
        highlightSite={highlightSite}
        highlightOrigin={highlightOrigin}
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
        handleCreateSequenceFromStructure={handleCreateSequenceFromStructure}
        handleStructureToDistance={handleStructureToDistance}
        onCreateSubsetMsa={handleCreateSubsetMsa}
        setPanelData={setPanelData}
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