// App.jsx
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import throttle from 'lodash.throttle'
import GridLayout from 'react-grid-layout';
import ReactDOM from 'react-dom';
import {DuplicateButton, RemoveButton, LinkButton, RadialToggleButton,
CodonToggleButton, TranslateButton, SurfaceToggleButton, SiteStatsButton, LogYButton,
SeqlogoButton, SequenceButton, DistanceMatrixButton, DownloadButton, GitHubButton} from './components/Buttons.jsx';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { translateNucToAmino, isNucleotide, threeToOne,
   parsePhylipDistanceMatrix, parseFasta, getLeafOrderFromNewick, newickToDistanceMatrix,
  downloadSVGElement, downloadText, detectFileType, toFasta, toPhylip, computeSiteStats} from './components/Utils.jsx';
import { residueColors, logoColors } from './constants/colors.js';
import { TitleFlip, AnimatedList } from './components/Animations.jsx';
import { FixedSizeGrid as Grid } from 'react-window';
import PhyloTreeViewer from './components/PhyloTreeViewer.jsx';
import PhylipHeatmap from "./components/Heatmap";
import Histogram from './components/Histogram.jsx';
import SequenceLogoSVG from './components/Seqlogo.jsx';
import StructureViewer from './components/StructureViewer.jsx';
import useElementSize from './hooks/useElementSize.js'

const LABEL_WIDTH = 66;
const CELL_SIZE = 24;


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
  isLinked,
  onRemove,
}) {
  return (
    <div className="panel-drag-handle bg-gradient-to-b from-gray-100 to-white p-1 mb-2 cursor-move flex items-center justify-between font-bold">
      <div className="w-12" />
      <div className="flex-1 flex justify-center">
        <EditableFilename
          id={id}
          filename={filename}
          setPanelData={setPanelData}
          prefix={prefix}
        />
      </div>
      <div className="flex items-center gap-1">
        {extraButtons.map((btn, i) => <React.Fragment key={i}>{btn}</React.Fragment>)}
        <DuplicateButton onClick={() => onDuplicate(id)} />
 {onLinkClick && (
          <div
  className={`inline-flex items-center justify-center ${isEligibleLinkTarget ? 'ring-2 ring-blue-400' : ''}`}
  style={{ width: 28, height: 28, borderRadius: 4, top: 0, right: 0 }}>
            <LinkButton
              onClick={() => onLinkClick(id)}
              isLinked={isLinked}
              isLinkModeActive={isLinkModeActive}
            />
          </div>
        )}
        <RemoveButton onClick={() => onRemove(id)} />
      </div>
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
        className="border rounded px-1 w-32 text-sm"
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
        className="ml-2 p-0.5"
        onClick={() => setEditing(true)}
        title="Edit filename"
      >
        <span className="inline-flex items-center justify-center w-6 h-7">
          <PencilSquareIcon className="w-5 h-5 text-gray-700"/>
        </span>
      </button>
    </div>
  );
}

function MSATooltip({ x, y, children }) {
  const ref = React.useRef(null);
  const [size, setSize] = React.useState({ w: 0, h: 0 });

  // Measure tooltip whenever content/position changes
  React.useLayoutEffect(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    // Only update if changed (prevents layout thrash)
    if (Math.abs(r.width - size.w) > 0.5 || Math.abs(r.height - size.h) > 0.5) {
      setSize({ w: r.width, h: r.height });
    }
 }, [x, y, size.w, size.h]);

  const GAP = 12; // distance from pointer
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Decide flips against the viewport edges
  const flipX = x + GAP + size.w > vw; // too close to right edge
  const flipY = y + GAP + size.h > vh; // too close to bottom edge

  // Anchor at the pointer, nudge by GAP, and flip using translate
  const left = x + (flipX ? -GAP : GAP);
  const top  = y + (flipY ? -GAP : GAP);

  // Keep inside small margins
  const clampedLeft = Math.max(4, Math.min(vw - 4, left));
  const clampedTop  = Math.max(4, Math.min(vh - 4, top));

  return ReactDOM.createPortal(
    <div
      ref={ref}
      className="fixed px-1 py-0.5 text-xs bg-gray-200 rounded-xl pointer-events-none z-[9999] shadow"
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
  onDoubleClick,
  isSelected = false,
  onSelect = () => {},
  isEligibleLinkTarget = false, 
  justLinkedPanels = [],            
}) {
  const isJustLinked = justLinkedPanels.includes(id);
  return (
    <div
className={`border rounded-2xl overflow-hidden h-full flex flex-col bg-white
        shadow-lg
        ${
          isJustLinked
            ? 'shadow-green-400/80'
            : hoveredPanelId === id || (linkedTo && hoveredPanelId === linkedTo)
            ? 'shadow-blue-400/50'
            : ''
        }
        ${isEligibleLinkTarget ? 'ring-2 ring-blue-400' : ''}
      `}
      tabIndex={0}
      onClick={() => onSelect(id)}
      onFocus={() => onSelect(id)}
      onMouseEnter={() => setHoveredPanelId(id)}
      onMouseLeave={() => {
        setHoveredPanelId(null);
        if (typeof window.clearAlignmentHighlight === 'function') {
          window.clearAlignmentHighlight(id);
        }
      }}
      onDoubleClick={onDoubleClick}
    >
      {children}
    </div>
  );
}


const SeqLogoPanel = React.memo(function SeqLogoPanel({
  id, data, onRemove, onDuplicate, hoveredPanelId, setHoveredPanelId, setPanelData,
  highlightedSite, highlightOrigin, onHighlight, linkedTo,
  onLinkClick, isLinkModeActive,isEligibleLinkTarget, isLinked,justLinkedPanels,
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
    (highlightOrigin === id || linkedTo === highlightOrigin)
  );

  useEffect(() => {
    // scroll-into-view logic
    if (
      highlightedSite != null &&
      linkedTo === highlightOrigin &&
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
      if (colLeft < currentScroll) targetScroll = colLeft - padding;
      else if (colRight > currentScroll + containerWidth) targetScroll = colRight - containerWidth + padding;

      if (targetScroll != null) {
        targetScroll = Math.max(0, Math.min(maxScroll, targetScroll));
        container.scrollTo({ left: targetScroll, behavior: "smooth" });
      }
    }
  }, [highlightedSite, highlightOrigin, linkedTo, id]);

  // download handler for SVG
  const handleDownloadSVG = useCallback(() => {
    const svg = logoContainerRef.current?.querySelector('svg');
    const base = (data?.filename || 'sequence_logo');
    if (!svg) {
      alert('No SVG to download yet.');
      return;
    }
    downloadSVGElement(svg, base);
  }, [data]);

  return (
    <PanelContainer
      id={id}
      hoveredPanelId={hoveredPanelId}
      setHoveredPanelId={setHoveredPanelId}
      linkedTo={linkedTo}
      isEligibleLinkTarget={isEligibleLinkTarget}
      justLinkedPanels={justLinkedPanels}
    >
      <PanelHeader
        id={id}
        prefix="SeqLogo: "
        filename={data.filename || "Sequence Logo"}
        setPanelData={setPanelData}
        onDuplicate={onDuplicate}
        onRemove={onRemove}
        onLinkClick={onLinkClick}
        isLinkModeActive={isLinkModeActive}
        isEligibleLinkTarget={isEligibleLinkTarget}
        isLinked={isLinked}
        extraButtons={[
          <DownloadButton key="dl" onClick={handleDownloadSVG} title="Download SVG" />
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
          // wrap the logo so we can query the <svg> node
          <div ref={logoContainerRef}>
            <SequenceLogoSVG
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
  id, data, onRemove, onDuplicate, onLinkClick, isLinkModeActive,isEligibleLinkTarget, isLinked,
  hoveredPanelId, setHoveredPanelId, setPanelData, onReupload, highlightedSite,
  highlightOrigin, onHighlight, justLinkedPanels,
}) {
  const { labels, matrix, filename } = data || {};
  const [containerRef, dims] = useElementSize({ debounceMs: 90 });
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

  if (!labels || !matrix) {
    return (
      <PanelContainer id={id} hoveredPanelId={hoveredPanelId} setHoveredPanelId={setHoveredPanelId}>
        <PanelHeader {...{id, filename, setPanelData, onDuplicate, onLinkClick, isLinkModeActive, isLinked, onRemove,}}/>
        <div className="flex-1 flex items-center justify-center text-gray-400">No data</div>
      </PanelContainer>
    );
  }

return (
  <PanelContainer
    id={id}
    hoveredPanelId={hoveredPanelId}
    setHoveredPanelId={setHoveredPanelId}
    onDoubleClick={() => onReupload(id)}
    isEligibleLinkTarget={isEligibleLinkTarget}
    justLinkedPanels={justLinkedPanels}
  >
    <PanelHeader
          id={id}
          prefix="Distance matrix: "
          filename={filename}
          setPanelData={setPanelData}
          onDuplicate={onDuplicate}
          onLinkClick={onLinkClick}
          isEligibleLinkTarget={isEligibleLinkTarget}
          isLinkModeActive={isLinkModeActive}
          isLinked={isLinked}
          onRemove={onRemove}
          extraButtons={[
            <DownloadButton onClick={handleDownload} />,]}
    />
    {/* Add padding container around the heatmap */}
    <div ref={containerRef} className="flex-1 p-2 pb-4 pr-4 overflow-hidden">
      {labels && matrix ? (
        <PhylipHeatmap
        id={id}
        labels={labels}
        matrix={matrix}
        highlightSite={highlightedSite}
        highlightOrigin={highlightOrigin}
        onHighlight={onHighlight}
        onCellClick={handleCellClick}
        highlightedCells={data.highlightedCells || []}
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
  onCreateSequenceFromStructure, onGenerateDistance, onLinkClick, isLinkModeActive,isEligibleLinkTarget, isLinked,
  linkedTo, highlightedSite, highlightOrigin, onHighlight, linkedPanelData, justLinkedPanels,
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


  const handleSurfaceToggle = React.useCallback(() => {
    setPanelData(pd => ({ ...pd, [id]: { ...pd[id], surface: !surface }}));
  }, [id, setPanelData, surface]);

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
      onDoubleClick={() => onReupload(id)}
      isEligibleLinkTarget={isEligibleLinkTarget}
      justLinkedPanels={justLinkedPanels}
    >
      <PanelHeader
        id={id}
        prefix="Structure: "
        filename={filename}
        setPanelData={setPanelData}
        onLinkClick={onLinkClick}
        isLinkModeActive={isLinkModeActive}
        isEligibleLinkTarget={isEligibleLinkTarget}
        isLinked={isLinked}
        onDuplicate={onDuplicate}
        onRemove={onRemove}
        extraButtons={[
          <SurfaceToggleButton key="surf" onClick={handleSurfaceToggle} isActive={surface} />,
          <SequenceButton key="seq" onClick={() => onCreateSequenceFromStructure(id)} />,
          <DistanceMatrixButton key="dm" onClick={handleMatrixClick} title='Build distance matrix from structure' />,
          <DownloadButton key="dl" onClick={handleDownload} />
        ]}
      />

      {/* picker overlay */}
      {showChainPicker && (
        <div
          className="absolute inset-0 z-[1000] bg-black/40 flex items-center justify-center rounded-2xl"
          onClick={() => setShowChainPicker(false)}
        >
          <div
            className="max-w-lg w-[min(90vw,36rem)] h-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            style={{ height: 'min(120vh, 28rem)' }}
          >
            <div className="text-lg font-bold text-white mb-4 flex-shrink-0 text-center">Choose chain for distance map</div>
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
  rowIndex,
  columnIndex
}) {
  const background = residueColors[char?.toUpperCase()] || 'bg-white';
  return (
    <div
      data-cell="1"
      data-row={rowIndex}
      data-col={columnIndex}
      style={style}
      className={`flex items-center justify-center ${background} ${
        isHoverHighlight || isLinkedHighlight
          ? 'alignment-highlight'
          : isPersistentHighlight
          ? 'persistent-alignment-highlight'
          : ''
      }`}
    >
      {char}
    </div>
  );
});

const AlignmentPanel = React.memo(function AlignmentPanel({
  id,
  data,
  onRemove, onReupload, onDuplicate, onDuplicateTranslate, onCreateSeqLogo, onCreateSiteStatsHistogram, onGenerateDistance,
  onLinkClick, isLinkModeActive, isLinked, isEligibleLinkTarget, linkedTo,
  highlightedSite, highlightOrigin, onHighlight, highlightOriginType,
  onSyncScroll, externalScrollLeft,
  highlightedSequenceId, setHighlightedSequenceId,
  hoveredPanelId, setHoveredPanelId, setPanelData, justLinkedPanels,
}) {
  const msaData = useMemo(() => data.data, [data.data]);
  const filename = data.filename;
  const containerRef = useRef(null);
  const [gridContainerRef, dims] = useElementSize({ debounceMs: 90 });
  const gridRef = useRef(null);

  const [hoveredCol, setHoveredCol] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [codonMode, setCodonModeState] = useState(data.codonMode || false);
  const [scrollTop, setScrollTop] = useState(0);
  const [isSyncScrolling, setIsSyncScrolling] = useState(false);
  const isNuc = useMemo(() => isNucleotide(msaData), [msaData]);
  const handleDownload = useCallback(() => {
    const msa = data?.data || [];
    const content = toFasta(msa);
    const base = baseName(data?.filename, 'alignment');
    mkDownload(base, content, 'fasta')();
  }, [data]);

  useEffect(() => {
    // This effect is now only for initial highlight or non-scrolling updates.
    // The main tooltip positioning during a sync-scroll is handled in throttledOnScroll.
    if (linkedTo && highlightedSite != null && id !== highlightOrigin && !isSyncScrolling) {
      if (gridRef.current && gridRef.current._outerRef) {
        const rect = gridRef.current._outerRef.getBoundingClientRect();
        const itemWidth = codonMode ? 3 * CELL_SIZE : CELL_SIZE;
        const scrollOffset = gridRef.current._outerRef.scrollLeft;
        const x = rect.left + (highlightedSite * itemWidth) - scrollOffset + (itemWidth / 2);
        const y = rect.top + (rect.height / 2);
        setTooltipPos({ x, y });
      }
    }
  }, [linkedTo, highlightedSite, id, highlightOrigin, codonMode, dims.height]);

  // throttle highlight to once every 90ms
const throttledHighlight = useMemo(
  () =>
    throttle(
      (col, originId) => {
        onHighlight(col, originId);
      },
      0,
      { leading: true, trailing: true }
    ),
  [onHighlight]
);

  // throttle scroll handler to once every 90ms
const throttledOnScroll = useCallback(
    throttle(({ scrollTop, scrollLeft }) => {
      setScrollTop(scrollTop);

      if (isSyncScrolling) {
        if (gridRef.current?._outerRef && highlightedSite != null) {
          const rect = gridRef.current._outerRef.getBoundingClientRect();
          const itemWidth = codonMode ? 3 * CELL_SIZE : CELL_SIZE;
          const x = rect.left + (highlightedSite * itemWidth) - scrollLeft + (itemWidth / 2);
          const y = rect.top + (rect.height / 2);
          setTooltipPos({ x, y });
        }
        setIsSyncScrolling(false); // End of sync scroll
      }

      if (linkedTo != null && scrollLeft != null && hoveredPanelId === id) {
        onSyncScroll(scrollLeft, id);
      }
    }, 90),
    [onSyncScroll, linkedTo, id, isSyncScrolling, highlightedSite, codonMode]
  );

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
    if (linkedTo && hoveredPanelId === linkedTo) return;
  }, [hoveredPanelId, id, linkedTo, highlightOrigin, onHighlight, setHighlightedSequenceId]);

 useEffect(() => {
    if (!gridRef.current || typeof externalScrollLeft !== 'number') return;
    const viewportWidth = dims.width - LABEL_WIDTH;
    const outer = gridRef.current._outerRef;
    if (!outer) return;
    const currentScrollLeft = outer.scrollLeft;
    const itemWidth = codonMode ? 3 * CELL_SIZE : CELL_SIZE;
    const colStart = externalScrollLeft;
    const colEnd = colStart + itemWidth;
    const padding = viewportWidth / 3;
    const maxScroll = outer.scrollWidth - viewportWidth + itemWidth + padding;

    let targetScroll = null;
    if (colStart < currentScrollLeft) {
      targetScroll = colStart - padding;
    } else if (colEnd > currentScrollLeft + viewportWidth) {
      targetScroll = colStart - viewportWidth + itemWidth + padding;
    }

    if (targetScroll !== null) {
      setIsSyncScrolling(true); // Start of sync scroll
      gridRef.current.scrollTo({
        scrollLeft: Math.max(0, Math.min(maxScroll, targetScroll)),
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
    const hit = pickCellFromEvent(e);
    if (!hit) return;
    const { rowIndex, columnIndex } = hit;
    const codonIndex = Math.floor(columnIndex / 3);
    const idx = codonMode ? codonIndex : columnIndex;

    // immediate, per-frame UI updates
    setHoveredRow(rowIndex);
    setHoveredCol(idx);
    setTooltipPos({ x: e.clientX, y: e.clientY });

    // cross-panel (throttled)
    throttledHighlight(idx, id);

    if (linkedTo && setHighlightedSequenceId) {
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
  if (id === highlightOrigin) onHighlight(null, id);
  if (linkedTo && setHighlightedSequenceId) setHighlightedSequenceId(null);
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
    ({ columnIndex, rowIndex, style }) => {
      const char = msaData[rowIndex].sequence[columnIndex];
      const codonIndex = Math.floor(columnIndex / 3);
      const idx = codonMode ? codonIndex : columnIndex;

      const persistentHighlights = data.highlightedSites || [];
      const isPersistentHighlight = persistentHighlights.includes(idx);

      const isHoverHighlight = codonMode
        ? hoveredCol != null && hoveredCol === codonIndex
        : hoveredCol === columnIndex;

      const isLinkedHighlight =
        linkedTo &&
        highlightedSite != null &&
        hoveredPanelId !== id &&   
        (linkedTo === highlightOrigin || id === highlightOrigin) &&
        (codonMode ? codonIndex === highlightedSite : columnIndex === highlightedSite);

      return (
        <MSACell
          key={`${rowIndex}-${columnIndex}`}
          columnIndex={columnIndex}
          rowIndex={rowIndex}
          style={style}
          char={char}
          isHoverHighlight={isHoverHighlight}
          isLinkedHighlight={isLinkedHighlight}
          isPersistentHighlight={isPersistentHighlight}
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
      data.highlightedSites
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
      throttledHighlight.cancel();
      throttledOnScroll.cancel();
    };
  }, [throttledHighlight, throttledOnScroll]);

  return (
    <PanelContainer
      id={id}
      linkedTo={linkedTo}
      hoveredPanelId={hoveredPanelId}
      setHoveredPanelId={setHoveredPanelId}
      onDoubleClick={() => onReupload(id)}
      isEligibleLinkTarget={isEligibleLinkTarget}
      justLinkedPanels={justLinkedPanels}
    >
      <div
        ref={containerRef}
        className="relative flex flex-col h-full border rounded-xl bg-white"
        onMouseLeave={handleGridMouseLeave}
      >
        <PanelHeader
          id={id}
          prefix="MSA: "
          filename={filename}
          setPanelData={setPanelData}
          extraButtons={
            isNuc
              ? [  
                  <CodonToggleButton
                    onClick={() => setCodonMode(m => !m)}
                    isActive={codonMode}
                  />,
                  <TranslateButton onClick={() => onDuplicateTranslate(id)} />,
                  <SeqlogoButton onClick={() => onCreateSeqLogo(id)} />,
                  <SiteStatsButton onClick={() => onCreateSiteStatsHistogram(id)} />,
                  <DistanceMatrixButton onClick={() => onGenerateDistance(id)} title="Build matrix with normalized hamming distance" />,
                  <DownloadButton onClick={handleDownload} />
                ]
              : [  <SeqlogoButton onClick={() => onCreateSeqLogo(id)} />,
          <SiteStatsButton onClick={() => onCreateSiteStatsHistogram(id)} />,<DistanceMatrixButton onClick={() => onGenerateDistance(id)} title="Build matrix with normalized hamming distance" />,<DownloadButton onClick={handleDownload} />]
          }
          onDuplicate={onDuplicate}
          onLinkClick={onLinkClick}
          isLinkModeActive={isLinkModeActive}
          isEligibleLinkTarget={isEligibleLinkTarget}
          isLinked={isLinked}
          onRemove={onRemove}
        />

        {hoveredCol != null && hoveredPanelId === id && (
          <MSATooltip x={tooltipPos.x} y={tooltipPos.y}>
            <div className="flex flex-col items-center">
              <span className="font-bold">
                {codonMode ? `Codon ${hoveredCol + 1}` : `Site ${hoveredCol + 1}`}
              </span>
              {hoveredRow != null && msaData[hoveredRow] && (
                <span className="text-gray-700 font-mono text-xs">{msaData[hoveredRow].id}</span>
              )}
            </div>
          </MSATooltip>
        )}

 {highlightedSite != null &&
   linkedTo === highlightOrigin &&
   id !== highlightOrigin &&
   highlightOriginType !== 'heatmap' && (
            <MSATooltip x={tooltipPos.x} y={tooltipPos.y}>
       <span>
         {codonMode ? 'Codon ' : 'Site '}
         <span className="font-bold">
           {typeof highlightedSite === 'number' ? highlightedSite + 1 : ''}
         </span>
       </span>
            </MSATooltip>
          )}

        <div
          ref={gridContainerRef}
          className="flex-1 flex overflow-hidden font-mono text-sm"
          // event delegation lives on the same wrapper that contains the Grid
          onMouseMove={handleGridMouseMove}
          onClick={handleGridClick}
        >
          {/* Left labels (unchanged) */}
          <div
            style={{
              width: LABEL_WIDTH * 1.9,
              height: dims.height,
              overflow: 'hidden',
              position: 'relative'
            }}
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
              {sequenceLabels.map(({ index, rawId, shortId, id: seqId }) => {
                const isrowhovered = msaData[hoveredRow]?.id === seqId ? hoveredRow : false;
                const linkedNames = data?.linkedHighlights || [];
             const isNameHighlight =
                isrowhovered ||
                (highlightedSequenceId === seqId && hoveredPanelId === linkedTo) ||
                linkedNames.includes(seqId);
                return (
                  <div
                    key={index}
                    style={{ height: CELL_SIZE, lineHeight: `${CELL_SIZE}px` }}
                    className={`flex items-center pr-2 pl-2 text-right font-bold truncate ${
                      isNameHighlight ? 'bg-yellow-100' : ''
                    }`}
                    title={rawId}
                    onMouseEnter={() => {
                      if (linkedTo) setHighlightedSequenceId(seqId);
                    }}
                    onMouseLeave={() => {
                      if (linkedTo) setHighlightedSequenceId(null);
                    }}
                  >
                    {shortId}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Virtualized grid */}
          <Grid
            ref={gridRef}
            columnCount={colCount}
            columnWidth={CELL_SIZE}
            height={dims.height}
            rowCount={rowCount}
            rowHeight={CELL_SIZE}
            width={Math.max(dims.width - LABEL_WIDTH, 0)}
            onScroll={throttledOnScroll}
            overscanRowCount={6}
            overscanColumnCount={6}
          >
            {Cell}
          </Grid>
        </div>
      </div>
    </PanelContainer>
  );
});

const TreePanel = React.memo(function TreePanel({
  id, data, onRemove, onReupload, onDuplicate, onGenerateDistance,
  highlightedSequenceId, onHoverTip,
  linkedTo, highlightOrigin,
  onLinkClick, isLinkModeActive,isEligibleLinkTarget,isLinked,hoveredPanelId,
  setHoveredPanelId, setPanelData,justLinkedPanels,
}) {
  const { data: newick, filename, isNhx, RadialMode= true } = data || {};

  const handleRadialToggle = useCallback(() => {
    setPanelData(pd => ({
      ...pd,
      [id]: {
        ...pd[id],
        RadialMode: !RadialMode
      }
    }));
  }, [id, setPanelData, RadialMode]);
  const handleDownload = useCallback(() => {
    const text = data?.data || '';
    const base = baseName(data?.filename, 'tree');
    const ext  = data?.isNhx ? 'nhx' : 'nwk';
    mkDownload(base, text, ext)();
  }, [data]);

  return (
    <PanelContainer
    id={id}
    linkedTo={linkedTo}
    hoveredPanelId={hoveredPanelId}
    setHoveredPanelId={setHoveredPanelId}
    onDoubleClick={() => onReupload(id)}
    isEligibleLinkTarget={isEligibleLinkTarget}
    justLinkedPanels={justLinkedPanels}
    >
      <PanelHeader
      id={id}
      prefix="Tree: "
      filename={filename}
      setPanelData={setPanelData}
      onDuplicate={onDuplicate}
      onLinkClick={onLinkClick}
      isEligibleLinkTarget={isEligibleLinkTarget}
      isLinkModeActive={isLinkModeActive}
      extraButtons={[
          <RadialToggleButton
            onClick={handleRadialToggle}
            isActive={RadialMode}
          />,
          <DistanceMatrixButton
            onClick={() => onGenerateDistance(id)}
          />,
          <DownloadButton onClick={handleDownload} />
        ]}
      isLinked={isLinked}
      onRemove={onRemove}
      />
      <div className="flex-1 overflow-auto flex items-center justify-center">
          <PhyloTreeViewer
            newick={newick}
            isNhx={isNhx}
            onHoverTip={onHoverTip}
            linkedTo={linkedTo}
            highlightOrigin={highlightOrigin}
            radial={RadialMode}
            id={id}
          setPanelData={setPanelData}
          highlightedNodes={
            (hoveredPanelId === id || (linkedTo && hoveredPanelId === linkedTo))
              ? (data.highlightedNodes ? [...data.highlightedNodes, highlightedSequenceId] : [highlightedSequenceId])
              : (data.highlightedNodes || [])
          }
          linkedHighlights={
            (hoveredPanelId === id || (linkedTo && hoveredPanelId === linkedTo))
              ? (data.linkedHighlights ? [...data.linkedHighlights, highlightedSequenceId] : [highlightedSequenceId])
              : (data.linkedHighlights || [])
          }
          />
      </div>
    </PanelContainer>
  );
});

const NotepadPanel = React.memo(function NotepadPanel({
  id, data, onRemove, onDuplicate, hoveredPanelId,
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
      justLinkedPanels={justLinkedPanels}
    >
      <PanelHeader
        id={id}
        prefix="-"
        filename={filenameInput}
        setPanelData={setPanelData}
        onDuplicate={onDuplicate}
        onRemove={onRemove}
        extraButtons={[ <DownloadButton onClick={handleDownload} /> ]}
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

const HistogramPanel = React.memo(function HistogramPanel({ id, data, onRemove, onReupload, onDuplicate,
  onLinkClick, isLinkModeActive, isEligibleLinkTarget,isLinked, linkedTo,
  highlightedSite, highlightOrigin, onHighlight, hoveredPanelId, justLinkedPanels,
  setHoveredPanelId, setPanelData,
}) {
  const { filename } = data;
  const isTabular = !Array.isArray(data.data);
  const [selectedCol, setSelectedCol] = useState(
    isTabular
      ? (data.selectedCol ||
        data.data.headers.find(h => typeof data.data.rows[0][h] === 'number'))
      : null
  );
  const [yLog, setYLog] = useState(Boolean(data?.yLog));
  useEffect(() => {
  setYLog(Boolean(data?.yLog));
}, [data?.yLog]);
  const [selectedXCol, setSelectedXCol] = useState(
    isTabular
      ? (data.selectedXCol ||
        data.data.headers.find(h => typeof data.data.rows[0][h] === 'number'))
      : null
  );
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
  const [chartContainerRef, { height }] = useElementSize({ debounceMs: 90 });
  return (
  <PanelContainer
    id={id}
    linkedTo={linkedTo}
    hoveredPanelId={hoveredPanelId}
    setHoveredPanelId={setHoveredPanelId}
    onDoubleClick={() => onReupload(id)}
    isEligibleLinkTarget={isEligibleLinkTarget}
    justLinkedPanels={justLinkedPanels}
  >
    <PanelHeader
      id={id}
      prefix="Data: "
      filename={filename}
      setPanelData={setPanelData}
      onDuplicate={onDuplicate}
      onLinkClick={onLinkClick}
      isLinkModeActive={isLinkModeActive}
      isEligibleLinkTarget={isEligibleLinkTarget}
      isLinked={isLinked}
      onRemove={onRemove}
      extraButtons={[ 
        <LogYButton
        onClick={() => {
          setPanelData(prev => ({
            ...prev,
            [id]: { ...prev[id], yLog: !yLog }
          }));
          setYLog(v => !v);
        }} isActive={yLog}/>,
        <DownloadButton onClick={handleDownload} />]}
      />
    <div className="p-2">
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
    <div ref={chartContainerRef} className="flex flex-col h-full px-2 pb-2 overflow-hidden">
      <Histogram
        values={valuesToPlot}
        xValues={xValues}
        panelId={id}
        onHighlight={onHighlight}
        highlightedSite={highlightedSite}
        highlightOrigin={highlightOrigin}
        setPanelData={setPanelData}
        highlightedSites={data?.highlightedSites || []}
        linkedTo={linkedTo}
        height={height}
        yLogActive={yLog}
      />
    </div>
  </PanelContainer>
);
});


// --- download helpers -------------------------

/** strip extension safely; fall back if empty */
const baseName = (fname, fallback) =>
  (fname && fname.replace(/\.[^.]+$/, '')) || fallback;

/** curry a click handler that downloads `content` as a text file */
const mkDownload = (base, content, ext, mime = 'text/plain;charset=utf-8') =>
  () => downloadText(`${base}.${ext}`, content, mime);

// --- Shared helpers ---------------------------

/** Parse PDB once: returns chain -> { atomsCA: [{label,x,y,z,resSeq,iCode}], seq: "AA..."} */
function parsePdbChains(pdb) {
  const chains = new Map(); // chainId -> { atomsCA: [], seq: [] }
  const seenCA = new Set(); // dedupe per (chain|resSeq|icode)

  const get = (cid) => {
    if (!chains.has(cid)) chains.set(cid, { atomsCA: [], seq: [] });
    return chains.get(cid);
  };

  for (const line of pdb.split(/\r?\n/)) {
    if (!line.startsWith('ATOM')) continue;

    const atomName = line.slice(12, 16).trim();
    const resName  = line.slice(17, 20).trim().toUpperCase();
    const chainId  = (line[21] || 'A').trim() || 'A';
    const resSeq   = line.slice(22, 26).trim();
    const iCode    = (line[26] || '').trim();

    if (atomName === 'CA') {
      const key = `${chainId}|${resSeq}|${iCode}`;
      if (seenCA.has(key)) continue;
      seenCA.add(key);

      const x = Number(line.slice(30, 38));
      const y = Number(line.slice(38, 46));
      const z = Number(line.slice(46, 54));
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;

      const label = `${chainId}:${resSeq}${iCode || ''}`;
      get(chainId).atomsCA.push({ label, x, y, z, resSeq, iCode });
      // sequence added once per residue (on CA)
      const one = threeToOne[resName] || 'X';
      get(chainId).seq.push(one);
    }
  }

  // finalize
  const result = new Map();
  for (const [cid, { atomsCA, seq }] of chains.entries()) {
    result.set(cid, { atomsCA, seq: seq.join('') });
  }
  return result;
}

/** Euclidean distance matrix from an ordered list of atoms with labels */
function distanceMatrixFromAtoms(atoms) {
  const N = atoms.length;
  const labels = atoms.map(a => a.label);
  const matrix = Array.from({ length: N }, () => Array(N).fill(0));
  for (let i = 0; i < N; i++) {
    for (let j = i; j < N; j++) {
      const dx = atoms[i].x - atoms[j].x;
      const dy = atoms[i].y - atoms[j].y;
      const dz = atoms[i].z - atoms[j].z;
      const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
      matrix[i][j] = d; matrix[j][i] = d;
    }
  }
  return { labels, matrix };
}

/** Reorder an MSA array by Newick leaf order, appending non-matches at end */
function reorderMsaByLeafOrder(msaSeqs, leafOrder) {
  const byId = Object.create(null);
  msaSeqs.forEach(s => { byId[s.id] = s; });
  const inTree = leafOrder.map(id => byId[id]).filter(Boolean);
  const extras = msaSeqs.filter(s => !leafOrder.includes(s.id));
  return [...inTree, ...extras];
}

/** Reorder a symmetric heatmap by Newick leaf order; append non-matches */
function reorderHeatmapByLeafOrder(labels, matrix, leafOrder) {
  const idx = Object.create(null);
  labels.forEach((l, i) => { idx[l] = i; });

  const newOrder = leafOrder.map(l => idx[l]).filter(i => i !== undefined);
  const extras   = labels.map((_, i) => i).filter(i => !newOrder.includes(i));
  const order    = [...newOrder, ...extras];

  const newLabels = order.map(i => labels[i]);
  const newMatrix = order.map(i => order.map(j => matrix[i][j]));
  return { labels: newLabels, matrix: newMatrix };
}

/** MSA column -> (gap-skipping) residue index for a single sequence string */
function msaColToResidueIndex(seq, col) {
  let idx = -1;
  for (let i = 0; i <= col && i < seq.length; i++) {
    if (seq[i] !== '-') idx++;
  }
  return idx < 0 ? null : idx;
}

/** Residue index -> MSA column for a single sequence string */
function residueIndexToMsaCol(seq, residIdx) {
  if (residIdx == null) return null;
  let idx = -1;
  for (let i = 0; i < seq.length; i++) {
    if (seq[i] !== '-') {
      idx++;
      if (idx === residIdx) return i;
    }
  }
  return null;
}

/** Try to infer chainId from a sequence id like "..._chain_A" or "A" */
function chainIdFromSeqId(id) {
  if (!id) return null;
  const m = id.match(/_chain_([A-Za-z0-9])\b/i);
  if (m) return m[1];
  if (/^[A-Za-z0-9]$/.test(id)) return id; // bare "A"
  return null;
}

/** Given alignment data and an optional preferred chain id, pick best sequence */
function pickAlignedSeqForChain(alnData, preferredChainId, structureChainsLengths) {
  if (!alnData || !Array.isArray(alnData.data)) return { seq: null, chainId: null };

  if (preferredChainId) {
    const named = alnData.data.find(s => {
      const cid = chainIdFromSeqId(s.id);
      return cid === preferredChainId || s.id === preferredChainId;
    });
    if (named) return { seq: named, chainId: preferredChainId };
  }

  if (structureChainsLengths) {
    for (const s of alnData.data) {
      const len = (s.sequence || '').replace(/-/g, '').length;
      const match = Object.entries(structureChainsLengths).find(([, L]) => L === len);
      if (match) return { seq: s, chainId: match[0] };
    }
  }

  return { seq: alnData.data[0] || null, chainId: preferredChainId || null };
}



function App() {
  const [panels, setPanels] = useState([]);
  const [layout, setLayout] = useState([]);
  const [linkMode, setLinkMode] = useState(null);
  const [panelLinks, setPanelLinks] = useState({});
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


  const addPanel = useCallback((config) => {
    const { type, data, basedOnId, layoutHint = {} } = config;
    const newId = `${type}-${Date.now()}`;

    setPanelData(prev => ({ ...prev, [newId]: data }));

    setPanels(prev => {
      const withoutFooter = prev.filter(p => p.i !== '__footer');
      return [...withoutFooter, { i: newId, type }, { i: '__footer', type: 'footer' }];
    });

    setLayout(prevLayout => {
      const layoutWithoutFooter = prevLayout.filter(l => l.i !== '__footer');
      const footer = prevLayout.find(l => l.i === '__footer');
      
      let newLayoutItem;
      const originalLayout = basedOnId ? layoutWithoutFooter.find(l => l.i === basedOnId) : null;

      if (originalLayout) {
        // Position relative to the original panel
        const rightX = originalLayout.x + originalLayout.w;
        const fitsRight = rightX + originalLayout.w <= 12;
        const newX = fitsRight ? rightX : originalLayout.x;
        const newY = fitsRight ? originalLayout.y : originalLayout.y + originalLayout.h;
        newLayoutItem = {
          i: newId,
          x: newX,
          y: newY,
          w: layoutHint.w || originalLayout.w,
          h: layoutHint.h || 10,
          minW: 3,
          minH: 5,
          ...layoutHint,
        };
      } else {
        // Position at the bottom of the grid
        const maxY = layoutWithoutFooter.reduce((max, l) => Math.max(max, l.y + l.h), 0);
        newLayoutItem = { i: newId, x: (layoutWithoutFooter.length * 4) % 12, y: maxY, w: 4, h: 20, minW: 3, minH: 5, ...layoutHint };
      }
      
      const nextLayout = [...layoutWithoutFooter, newLayoutItem];
      const newMaxY = nextLayout.reduce((max, l) => Math.max(max, l.y + l.h), 0);
      const newFooter = { ...(footer || {}), i: '__footer', x: 0, y: newMaxY, w: 12, h: 2, static: true };

      return [...nextLayout, newFooter];
    });
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const onSyncScroll = useCallback((scrollLeft, originId) => {
    const targetId = panelLinks[originId];
    if (!targetId) return;

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
    if (!panel || !data) return;

    addPanel({
      type: panel.type,
      data: JSON.parse(JSON.stringify(data)), // Deep copy
      basedOnId: id,
    });
  }, [panels, panelData, addPanel]);

    const handleDuplicateTranslate = useCallback((id) => {
    const data = panelData[id];
    if (!data) return;

    const translatedMsa = translateNucToAmino(data.data);
    const newFilename = (data.filename ? data.filename.replace(/\.[^.]+$/, '') : 'alignment') + '_protein.fasta';

    addPanel({
      type: 'alignment',
      data: {
        ...data,
        data: translatedMsa,
        filename: newFilename,
        codonMode: false,
      },
      basedOnId: id,
    });
  }, [panelData, addPanel]);

    const handleCreateSeqLogo = useCallback((id) => {
    const data = panelData[id];
    if (!data) return;

    addPanel({
      type: 'seqlogo',
      data: {
        msa: data.data,
        filename: (data.filename ? data.filename.replace(/\.[^.]+$/, '') : 'alignment'),
      },
      basedOnId: id,
      layoutHint: { h: 8 },
    });
  }, [panelData, addPanel]);


const handleCreateSequenceFromStructure = useCallback((id) => {
  const data = panelData[id];
  if (!data?.pdb) return;

  const chains = parsePdbChains(data.pdb);
  if (chains.size === 0) { alert("Could not extract sequences (no CA atoms found)."); return; }

  const baseName = (data.filename ? data.filename.replace(/\.[^.]+$/, '') : 'structure');
  const originalLayout = layout.find(l => l.i === id);
  const baseY = originalLayout ? (originalLayout.y + originalLayout.h) : 0;

  const newPanels = [];
  const newLayouts = [];
  const newPanelDataEntries = {};

  [...chains.entries()].forEach(([chainId, { seq }], idx) => {
    if (!seq) return;
    const newId = `alignment-from-pdb-${chainId}-${Date.now()}-${idx}`;
    newPanels.push({ i: newId, type: 'alignment' });
    newLayouts.push({ i: newId, x: 0, y: baseY + idx * 3, h: 3, w: 12, minH: 3, minW: 3 });
    newPanelDataEntries[newId] = {
      data: [{ id: `${baseName}_chain_${chainId}`, sequence: seq }],
      filename: `${baseName}_chain_${chainId}.fasta`,
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
}, [panelData, layout, setPanels, setLayout, setPanelData]);


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
  const base  = (s.filename ? s.filename.replace(/\.[^.]+$/, '') : 'structure');
  const suffix = choice === 'ALL' ? 'ALL' : choice;

  addPanel({
    type: 'heatmap',
    data: { labels, matrix, filename: `${base}_distmap_${suffix}` },
    basedOnId: id,
    layoutHint: { w: 4, h: 20 }
  });
}, [panelData, addPanel]);


const handleTreeToDistance = useCallback((id) => {
  const treeData = panelData[id];
  if (!treeData?.data) return;
  try {
    const { labels, matrix } = newickToDistanceMatrix(treeData.data);
    const base = (treeData.filename ? treeData.filename.replace(/\.[^.]+$/, '') : 'tree');
    addPanel({
      type: 'heatmap',
      data: { labels, matrix, filename: `${base}_distmatrix` },
      basedOnId: id,
      layoutHint: { w: 4, h: 20 }
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

  // Prepare labels and uppercase sequences
  const seqs = a.data.map(s => ({
    id: s.id,
    seq: (s.sequence || '').toUpperCase()
  }));
  const labels = seqs.map(s => s.id);

  const N = seqs.length;
  const matrix = Array.from({ length: N }, () => Array(N).fill(0));

  // Pairwise normalized Hamming distance with pairwise gap deletion
  // - Count only positions where BOTH sequences are not gaps ('-' or '.')
  // - distance = mismatches / comparable_positions  (0 if none)
  const isGap = (c) => c === '-' || c === '.';

  for (let i = 0; i < N; i++) {
    matrix[i][i] = 0;
    for (let j = i + 1; j < N; j++) {
      const A = seqs[i].seq;
      const B = seqs[j].seq;
      const L = Math.min(A.length, B.length);

      let comparable = 0;
      let mismatches = 0;

      for (let k = 0; k < L; k++) {
        const aChar = A[k];
        const bChar = B[k];
        if (isGap(aChar) || isGap(bChar)) continue;
        comparable++;
        if (aChar !== bChar) mismatches++;
      }

      const d = comparable > 0 ? (mismatches / comparable) : 0;
      matrix[i][j] = d;
      matrix[j][i] = d;
    }
  }

  const base = (a.filename ? a.filename.replace(/\.[^.]+$/, '') : 'alignment');
  addPanel({
    type: 'heatmap',
    data: { labels, matrix, filename: `${base}_dist` },
    basedOnId: id,
    layoutHint: { w: 4, h: 20 }
  });
}, [panelData, addPanel]);

const handleLinkClick = useCallback((id) => {
  const unlinkPair = (copy, a) => {
    const b = copy[a];
    if (b) { delete copy[b]; }
    delete copy[a];
  };

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
    // start/cancel or unlink single
    if (panelLinks[id]) {
      const other = panelLinks[id];
      setPanelLinks(pl => {
        const copy = { ...pl };
        unlinkPair(copy, id);
        unlinkPair(copy, other);
        return copy;
      });
    } else {
      setLinkMode(id);
    }
  } else {
    if (linkMode === id) {
      setLinkMode(null);
    } else {
      const a = linkMode, b = id;
      setPanelLinks(pl => {
        const copy = { ...pl };
        // unlink any existing
        if (copy[a]) unlinkPair(copy, a);
        if (copy[b]) unlinkPair(copy, b);
        // link
        copy[a] = b; copy[b] = a;
        return copy;
      });

      setJustLinkedPanels([linkMode, id]);
      setTimeout(() => setJustLinkedPanels([]), 1000);
      reorderIfTreeLinked(a, b);
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

  const targetId = panelLinks[originId];
  if (!targetId) return;

  const sourcePanel = panels.find(p => p.i === originId);
  const targetPanel = panels.find(p => p.i === targetId);
  if (!sourcePanel || !targetPanel) return;

  const clearDownstream = () => {
    // clear heatmap -> tree/align/structure transient state on hover out
    if (site !== null) return;
    if (sourcePanel.type === 'heatmap' && targetPanel.type === 'tree') {
       setPanelData(prev => {
   const cur = prev[targetId] || {};
   if (!cur.linkedHighlights || cur.linkedHighlights.length === 0) return prev;
   return { ...prev, [targetId]: { ...cur, linkedHighlights: [] } };
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
  };

  if (site === null) { clearDownstream(); return; }

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
      const sourceData = panelData[originId];
      const targetData = panelData[targetId];
      if (!targetData) return;
      let col = site;
      if (sourceData && !Array.isArray(sourceData.data)) {
        const xCol = sourceData.selectedXCol ||
          sourceData.data.headers.find(h => typeof sourceData.data.rows[0][h] === 'number');
        if (xCol) {
          const xVal = sourceData.data.rows[site]?.[xCol];
          if (typeof xVal === 'number') col = xVal;
        }
      }
      const isCodon = !!targetData.codonMode;
      setScrollPositions(prev => {
     const v = col * (isCodon ? 3 : 1) * CELL_SIZE;
     if (prev[targetId] === v) return prev;
     return { ...prev, [targetId]: v };
   });
      setHighlightSite(col);
      setHighlightOrigin(originId);
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
      const structData = panelData[originId];
      const alnData    = panelData[targetId];
      if (!alnData?.data) return;

      const structureChainId = structData?.linkedChainId
        || chainIdFromSeqId(alnData.data[0]?.id)
        || null;

      const { seq } = pickAlignedSeqForChain(alnData, structureChainId, null);
      if (!seq) return;

      const col = residueIndexToMsaCol(seq.sequence, site);
      if (col == null) return;

      const isCodon = !!panelData[targetId]?.codonMode;
            setScrollPositions(prev => {
     const v = col * (isCodon ? 3 : 1) * CELL_SIZE;
     if (prev[targetId] === v) return prev;
     return { ...prev, [targetId]: v };
   });
 if (!(highlightSite === col && highlightOrigin === originId)) {
   setHighlightSite(col);
   setHighlightOrigin(originId);
 }
    },
  };

  const key = `${S}->${T}`;
  if (handlers[key]) handlers[key]();
}, [panelLinks, panels, panelData, highlightSite, highlightOrigin]);



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
        if (
        (filename.toLowerCase().endsWith('.tsv') && lines[0].includes('\t')) ||
        (filename.toLowerCase().endsWith('.csv') && lines[0].includes(','))
        ) {
          const isTSV = filename.toLowerCase().endsWith('.tsv');
          const delimiter = isTSV ? '\t' : ',';
          const headers = lines[0].split(delimiter).map(h => h.trim());
          const rows = lines.slice(1).map(line => {
            const cols = line.split(delimiter);
            const obj = {};
            headers.forEach((h, i) => {
              const v = cols[i]?.trim();
              const n = Number(v);
              obj[h] = isNaN(n) ? v : n;
            });
            return obj;
          });
          panelPayload = { data: { headers, rows }, filename };
          }
        else {
          // Split by line to preserve line numbers
          const values = lines.map(line => Number(line.trim())).filter(n => !isNaN(n));
          // Use line numbers (1-based) as xValues
          panelPayload = { data: values, filename, xValues: values.map((_, i) => i + 1) };
        }
    } else if (type === 'heatmap') {
        const text = await file.text();
        const parsed = parsePhylipDistanceMatrix(text);
        panelPayload = { ...parsed, filename };
  }    else if (type === 'structure') {
        const text = await file.text();
        panelPayload = { pdb: text, filename };
        }

      // Update or add panel data
      if (isReupload) {
      setPanelData(prev => ({ ...prev, [id]: panelPayload }));}
      else {
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
      const other = c[id];
      delete c[id];
      if (other) delete c[other];
      return c;
    });
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
    } catch (err) {
      alert('Invalid board file');
    }
    fileInputRefBoard.current.value = null;
    setTitleFlipKey(Date.now());
  };

  const handleSaveBoard = () => {
    const board = { panels, layout, panelData, panelLinks };
    mkDownload('mseaboard', JSON.stringify(board, null, 2), 'json', 'application/json')();
  };

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
      return { type: 'histogram', payload: { data: { headers, rows }, filename } };
    } else {
      const values = lines.map(s => Number(s.trim())).filter(n => Number.isFinite(n));
      return { type: 'histogram', payload: { data: values, filename, xValues: values.map((_, i) => i + 1) } };
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

  const baseName = (data.filename ? data.filename.replace(/\.[^.]+$/, '') : 'alignment');
  addPanel({
    type: 'histogram',
    data: {
      data: table,
      filename: `${baseName}_site_stats${isCodon ? '_codon' : ''}.csv`,
      selectedXCol: isCodon ? 'codon' : 'site',
      selectedCol: 'conservation'
    },
    basedOnId: id,
    layoutHint: { w: 4, h: 14 }
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

const LINK_COMPAT = {
  alignment: new Set(['alignment','seqlogo','histogram','structure','tree', 'heatmap']),
  seqlogo:   new Set(['alignment','histogram','seqlogo']),
  histogram: new Set(['alignment','histogram','seqlogo']),
  heatmap:   new Set(['tree','heatmap','alignment','structure']),
  tree:      new Set(['alignment','heatmap','tree']),
  structure: new Set(['alignment','heatmap']),
  notepad:   new Set([]),
};

const canLink = (typeA, typeB) =>
  !!(LINK_COMPAT[typeA] && LINK_COMPAT[typeA].has(typeB));

const makeCommonProps = useCallback((panel) => {
  const originId = linkMode;
  const originPanel = originId ? panels.find(p => p.i === originId) : null;
  const highlightOriginType = highlightOrigin ? (panels.find(p => p.i === highlightOrigin)?.type || null) : null;

  const isEligibleLinkTarget =
    !!(
      originPanel &&
      originPanel.i !== panel.i &&                     // not the origin
      canLink(originPanel.type, panel.type)            // compatible types
    );

  return {
    id: panel.i,
    data: panelData[panel.i],
    onRemove: removePanel,
    onReupload: id => triggerUpload(panel.type, id),
    onDuplicate: duplicatePanel,
    onLinkClick: handleLinkClick,
    isLinkModeActive: linkMode === panel.i,
    isLinked: !!panelLinks[panel.i],
    linkedTo: panelLinks[panel.i] || null,
    highlightedSite: highlightSite,
    highlightOrigin: highlightOrigin,
    highlightOriginType,
    onHighlight: handleHighlight,
    hoveredPanelId,
    setHoveredPanelId,
    isEligibleLinkTarget,    
    justLinkedPanels,                          
  };
}, [
  removePanel,
  triggerUpload,
  duplicatePanel,
  handleLinkClick,
  linkMode,
  panelLinks,
  highlightSite,
  highlightOrigin,
  handleHighlight,
  hoveredPanelId,
  setHoveredPanelId,
  panelData,
  panels
]);
    return (
      <div
  className="h-screen w-screen flex flex-col overflow-hidden bg-white text-black"
  onDragEnter={handleDragEnter}
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
>
  {isDragging && (
  <div className="pointer-events-none fixed inset-0 z-[10000] bg-black/30 flex items-center justify-center">
    <div className="pointer-events-none bg-white rounded-2xl shadow-xl px-6 py-4 text-center">
      <div className="text-2xl font-bold">Drop files to open</div>
      <div className="text-sm text-gray-600 mt-1">
        • JSON: Load board • FASTA/NWK/PDB/PHY/TSV/CSV/TXT: Open in a panel
      </div>
    </div>
  </div>
)}
        <div className="p-4 flex justify-between items-center">
          <TitleFlip key={titleFlipKey} text="MSEABOARD" colors={logoColors}/>
<div className="flex items-center gap-5">
  <div className="flex items-center gap-2 mr-8">
  {/* Save Board Button */}
  <div className="relative group">
    <button
      onClick={handleSaveBoard}
      className="w-12 h-12 bg-gray-200 text-black rounded-xl hover:bg-gray-300 shadow-lg hover:shadow-xl flex items-center justify-center"
    >
      <ArrowDownTrayIcon className="w-8 h-8" />
    </button>
    <span className="absolute text-center left-1/2 -translate-x-1/2 top-16 z-10 px-2 py-1 rounded-xl bg-gray-300 text-black text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
      <b>Save Board</b>
      <br />
      Save this board layout, data<br /> and links to a file
    </span>
  </div>
  {/* Load Board Button */}
  <div className="relative group">
    <button
      onClick={() => fileInputRefBoard.current.click()}
      className="w-12 h-12 bg-gray-200 text-black rounded-xl hover:bg-gray-300 shadow-lg hover:shadow-xl flex items-center justify-center"
    >
      <ArrowUpTrayIcon className="w-8 h-8" />
    </button>
        <span className="absolute text-center left-1/2 -translate-x-1/2 top-16 z-10 px-2 py-1 rounded-xl bg-gray-300 text-black text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
      <b>Load Board</b>
      <br />
      Load a saved board <br /> from a file
    </span>
  </div>
</div>
  <button
  onClick={() => {
      addPanel({
        type: 'notepad',
        data: { filename: "Notes", text: "" },
        layoutHint: { w: 4, h: 10 }
      });
    }}
    className="w-40 h-20 bg-yellow-100 text-black px-4 py-2 rounded-xl hover:bg-yellow-200 shadow-lg hover:shadow-xl"
  >
    New Notepad
  </button>
  <input
    ref={fileInputRefBoard}
    type="file"
    accept=".json"
    onChange={handleLoadBoard}
    style={{ display: 'none' }}
  />
            <button onClick={() => triggerUpload('alignment')} className="w-40 h-20 bg-green-200 text-black px-4 py-2 rounded-xl hover:bg-green-300 shadow-lg hover:shadow-xl leading-tight">
              Upload MSA (.fasta/.fas)
            </button>
            <button onClick={() => triggerUpload('tree')} className="w-40 h-20 bg-blue-200 text-black px-4 py-2 rounded-xl hover:bg-blue-300 shadow-lg hover:shadow-xl leading-tight">
              Upload Tree (.nwk/.nhx)
            </button>
            <button onClick={() => triggerUpload('histogram')} className="w-40 h-20 bg-orange-200 text-black px-4 py-2 rounded-xl hover:bg-orange-300 shadow-lg hover:shadow-xl leading-tight">
              Upload Data (.txt/.tsv/.csv)
            </button>
            <button onClick={() => triggerUpload('heatmap')} className="w-40 h-20 bg-red-200 text-black px-4 py-2 rounded-xl hover:bg-red-300 shadow-lg hover:shadow-xl leading-tight">
              Upload Distance Matrix (.phy/.phylip/.dist)
            </button>
            <button onClick={() => triggerUpload('structure')} className="w-40 h-20 bg-indigo-200 text-black px-4 py-2 rounded-xl hover:bg-indigo-300 shadow-lg hover:shadow-xl">
              Upload Structure (.pdb)
            </button>
            <GitHubButton />
            <input ref={fileInputRef} type="file" accept=".fasta,.nwk,.nhx,.txt,.tsv,.csv,.fas,.phy,.phylip,.dist,.pdb" onChange={handleFileUpload} style={{ display: 'none' }} />
          </div>
        </div>

        {panels.length > 0 && (
          <div className="flex-grow overflow-auto pb-20">
            <GridLayout
              className="layout"
              layout={layout}
              cols={12}
              rowHeight={30}
              width={windowWidth}
              autoSize={false}
              isResizable
              isDraggable
              margin={[10, 10]}
              containerPadding={[10, 10]}
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
    const data = panelData[panel.i];
    if (!data) return null;

  const commonProps = makeCommonProps(panel);

  return (
  <div key={panel.i}>
    {panel.type === 'alignment' ? (
      <AlignmentPanel
        {...commonProps}
        setPanelData={setPanelData}
        justLinkedPanels={justLinkedPanels}
        onSyncScroll={onSyncScroll}
        externalScrollLeft={scrollPositions[panel.i]}
        highlightedSequenceId={highlightedSequenceId}
        setHighlightedSequenceId={setHighlightedSequenceId}
        onDuplicateTranslate={handleDuplicateTranslate} 
        onCreateSeqLogo={handleCreateSeqLogo}
        onCreateSiteStatsHistogram={handleCreateSiteStatsHistogram}
        onGenerateDistance={handleAlignmentToDistance} 
      />
  ) : panel.type === 'tree' ? (
        <TreePanel
          {...commonProps}
          setPanelData={setPanelData}
          justLinkedPanels={justLinkedPanels}
          highlightedSequenceId={highlightedSequenceId}
          onHoverTip={setHighlightedSequenceId}
          onGenerateDistance={handleTreeToDistance}
        />
      ) : panel.type === 'histogram' ? (
        <HistogramPanel
          {...commonProps}
          setPanelData={setPanelData}
          justLinkedPanels={justLinkedPanels}
        />
      ) : panel.type === 'notepad' ? (
        <NotepadPanel
          {...commonProps}
          setPanelData={setPanelData}
          justLinkedPanels={justLinkedPanels}
        />
      ) : panel.type === 'heatmap' ? (
        <HeatmapPanel
        {...commonProps}
        onHighlight={handleHighlight}
        setPanelData={setPanelData}
        justLinkedPanels={justLinkedPanels}

      />
      ) :panel.type === 'seqlogo' ? (
    <SeqLogoPanel
      {...commonProps}
      setPanelData={setPanelData}
      justLinkedPanels={justLinkedPanels}
      highlightedSite={highlightSite}
      highlightOrigin={highlightOrigin}
      onHighlight={handleHighlight}
      linkedTo={panelLinks[panel.i] || null}
      hoveredPanelId={hoveredPanelId}
      setHoveredPanelId={setHoveredPanelId}
      onLinkClick={handleLinkClick}
      isLinkModeActive={linkMode === panel.i}
      isLinked={!!panelLinks[panel.i]}
    />
  ): panel.type === 'structure' ? (
  <StructurePanel
    {...commonProps}
setPanelData={setPanelData}
justLinkedPanels={justLinkedPanels}
  onCreateSequenceFromStructure={handleCreateSequenceFromStructure}
  onGenerateDistance={handleStructureToDistance} 
  linkedPanelData={panelLinks[panel.i] ? panelData[panelLinks[panel.i]] : null}
   
  />
)   : null}
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