// App.jsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import throttle from 'lodash.throttle'
import {DuplicateButton, RemoveButton, LinkButton, RadialToggleButton,
CodonToggleButton, TranslateButton, SurfaceToggleButton,
SeqlogoButton, SequenceButton, DistanceMatrixButton, DownloadButton, GitHubButton} from './components/Buttons.jsx';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { translateNucToAmino, isNucleotide, threeToOne,
   parsePhylipDistanceMatrix, parseFasta, getLeafOrderFromNewick, newickToDistanceMatrix,
  downloadSVGElement, downloadText, detectFileType, toFasta, toPhylip} from './components/Utils.jsx';
import { residueColors, logoColors } from './constants/colors.js';
import { FixedSizeGrid as Grid } from 'react-window';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import ReactDOM from 'react-dom';
import PhyloTreeViewer from './components/PhyloTreeViewer.jsx';
import PhylipHeatmap from "./components/Heatmap";
import Histogram from './components/Histogram.jsx';
import SequenceLogoSVG from './components/Seqlogo.jsx';
import StructureViewer from './components/StructureViewer.jsx';
import { TitleFlip } from './components/Animations.jsx';
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
          <LinkButton
            onClick={() => onLinkClick(id)}
            isLinked={isLinked}
            isLinkModeActive={isLinkModeActive}
          />
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

function PanelContainer({ id, linkedTo, hoveredPanelId, setHoveredPanelId, children, onDoubleClick }) {
  return (
    <div
      className={`border rounded-2xl overflow-hidden h-full flex flex-col bg-white
        shadow-lg
        ${hoveredPanelId === id || (linkedTo && hoveredPanelId === linkedTo) ? 'shadow-blue-400/50' : ''}
      `}
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
  onLinkClick, isLinkModeActive, isLinked
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
  id, data, onRemove, onDuplicate, onLinkClick, isLinkModeActive, isLinked,
  hoveredPanelId, setHoveredPanelId, setPanelData, onReupload, highlightedSite,
  highlightOrigin, onHighlight, 
}) {
  const { labels, matrix, filename } = data || {};
  const [containerRef, dims] = useElementSize({ debounceMs: 90 });
  const handleDownload = useCallback(() => {
  const base = (filename?.replace(/\.[^.]+$/, '') || 'distmatrix');
  const content = toPhylip(labels, matrix);
  downloadText(`${base}.phy`, content);
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
  >
    <PanelHeader
          id={id}
          prefix="Distance matrix: "
          filename={filename}
          setPanelData={setPanelData}
          onDuplicate={onDuplicate}
          onLinkClick={onLinkClick}
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
  onCreateSequenceFromStructure, onLinkClick, isLinkModeActive, isLinked,
  linkedTo, highlightedSite, highlightOrigin, onHighlight,
  linkedPanelData
}) {
  const { pdb, filename, surface = false } = data || {};
  const handleSurfaceToggle = useCallback(() => {
    setPanelData(pd => ({
      ...pd,
      [id]: {
        ...pd[id],
        surface: !surface
      }
    }));
  }, [id, setPanelData, surface]);
  const handleDownload = useCallback(() => {
    if (!pdb) return;
    const base = (filename?.replace(/\.[^.]+$/, '') || 'structure');
    downloadText(`${base}.pdb`, pdb);
}, [pdb, filename]);
  return (
    <PanelContainer
      id={id}
      hoveredPanelId={hoveredPanelId}
      setHoveredPanelId={setHoveredPanelId}
      onDoubleClick={() => onReupload(id)}
    >
      <PanelHeader
        id={id}
        prefix="Structure: "
        filename={filename}
        setPanelData={setPanelData}
        onLinkClick={onLinkClick}
        isLinkModeActive={isLinkModeActive}
        isLinked={isLinked}
        onDuplicate={onDuplicate}
        onRemove={onRemove}
extraButtons={[
          <SurfaceToggleButton
            onClick={handleSurfaceToggle}
            isActive={surface}
          />,
          <SequenceButton onClick={() => onCreateSequenceFromStructure(id)} />,
          <DownloadButton onClick={handleDownload} />
        ]}
      />
      <div className="flex-1 p-2 bg-white overflow-hidden">
        {pdb ? (
          <div className="h-full w-full">
            <StructureViewer pdb={pdb} panelId={id} surface = {surface} data={data} setPanelData={setPanelData}
            linkedTo={linkedTo}
      highlightedSite={highlightedSite}
      highlightOrigin={highlightOrigin}
      onHighlight={onHighlight}
      linkedPanelData={linkedPanelData} />
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
  onRemove, onReupload, onDuplicate, onDuplicateTranslate, onCreateSeqLogo,
  onLinkClick, isLinkModeActive, isLinked, linkedTo,
  highlightedSite, highlightOrigin, onHighlight,
  onSyncScroll, externalScrollLeft,
  highlightedSequenceId, setHighlightedSequenceId,
  hoveredPanelId, setHoveredPanelId, setPanelData
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
  const isNuc = useMemo(() => isNucleotide(msaData), [msaData]);
  const handleDownload = useCallback(() => {
    const msa = data?.data || [];
    const content = toFasta(msa);
    const base = (data?.filename?.replace(/\.[^.]+$/, '') || 'alignment');
    downloadText(`${base}.fasta`, content);
}, [data]);

  useEffect(() => {
    if (linkedTo && highlightedSite != null && id !== highlightOrigin) {
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
      throttle((col, row, originId, clientX, clientY) => {
        setHoveredCol(col);
        setHoveredRow(row);
        setTooltipPos({ x: clientX, y: clientY });
        onHighlight(col, originId);
      }, 90),
    [onHighlight]
  );

  // throttle scroll handler to once every 90ms
  const throttledOnScroll = useCallback(
    throttle(({ scrollTop, scrollLeft }) => {
      setScrollTop(scrollTop);
      if (linkedTo != null && scrollLeft != null) {
        onSyncScroll(scrollLeft, id);
      }
    }, 90),
    [onSyncScroll, linkedTo, id]
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
    const currentScrollLeft = outer ? outer.scrollLeft : 0;
    const itemWidth = codonMode ? 3 * CELL_SIZE : CELL_SIZE;
    const colStart = externalScrollLeft;
    const colEnd = colStart + itemWidth;
    if (colStart < currentScrollLeft || colEnd > currentScrollLeft + viewportWidth) {
      gridRef.current.scrollTo({ scrollLeft: colStart });
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

      // local UI state
      setHoveredRow(rowIndex);
      setHoveredCol(idx);
      setTooltipPos({ x: e.clientX, y: e.clientY });

      // cross-panel highlight (throttled)
      throttledHighlight(idx, rowIndex, id, e.clientX, e.clientY);

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
                  <DownloadButton onClick={handleDownload} />
                ]
              : [  <SeqlogoButton onClick={() => onCreateSeqLogo(id)} />,<DownloadButton onClick={handleDownload} />]
          }
          onDuplicate={onDuplicate}
          onLinkClick={onLinkClick}
          isLinkModeActive={isLinkModeActive}
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
          id !== highlightOrigin && (
            <MSATooltip x={tooltipPos.x} y={tooltipPos.y}>
              <span>
                {codonMode ? 'Codon ' : 'Site '}
                <span className="font-bold">{highlightedSite + 1}</span>
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
                const isNameHighlight =
                  isrowhovered || (highlightedSequenceId === seqId && hoveredPanelId === linkedTo);
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
  onLinkClick, isLinkModeActive, isLinked,hoveredPanelId,
  setHoveredPanelId, setPanelData
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
  const base = (data?.filename?.replace(/\.[^.]+$/, '') || 'tree');
  const ext = data?.isNhx ? 'nhx' : 'nwk';
  downloadText(`${base}.${ext}`, text);
}, [data]);

  return (
    <PanelContainer
    id={id}
    linkedTo={linkedTo}
    hoveredPanelId={hoveredPanelId}
    setHoveredPanelId={setHoveredPanelId}
    onDoubleClick={() => onReupload(id)}
    >
      <PanelHeader
      id={id}
      prefix="Tree: "
      filename={filename}
      setPanelData={setPanelData}
      onDuplicate={onDuplicate}
      onLinkClick={onLinkClick}
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
  setHoveredPanelId, setPanelData
}) {
  const [filenameInput, setFilenameInput] = useState(data.filename || "Notes");
  const [text, setText] = useState(data.text || "");
  const handleDownload = useCallback(() => {
  const base = (filenameInput?.toString() || 'notes');
  downloadText(`${base}.txt`, text || '');
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
  onLinkClick, isLinkModeActive, isLinked, linkedTo,
  highlightedSite, highlightOrigin, onHighlight, hoveredPanelId,
  setHoveredPanelId, setPanelData, syncId,
}) {
  const { filename } = data;
  const isTabular = !Array.isArray(data.data);
  const [selectedCol, setSelectedCol] = useState(
    isTabular
      ? (data.selectedCol ||
        data.data.headers.find(h => typeof data.data.rows[0][h] === 'number'))
      : null
  );

  const [selectedXCol, setSelectedXCol] = useState(
    isTabular
      ? (data.selectedXCol ||
        data.data.headers.find(h => typeof data.data.rows[0][h] === 'number'))
      : null
  );

  const handleDownload = useCallback(() => {
    const base = (filename?.replace(/\.[^.]+$/, '') || 'data');
    if (isTabular) {
      const { headers, rows } = data.data;
      const csv = [
        headers.join(','),
        ...rows.map(r => headers.map(h => r[h]).join(','))
      ].join('\n');
      downloadText(`${base}.csv`, csv, 'text/csv;charset=utf-8');
    } else {
      const values = data.data || [];
      const txt = values.join('\n');
      downloadText(`${base}.txt`, txt);
    }
  }, [data, filename, isTabular]);

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
  >
    <PanelHeader
      id={id}
      prefix="Data: "
      filename={filename}
      setPanelData={setPanelData}
      onDuplicate={onDuplicate}
      onLinkClick={onLinkClick}
      isLinkModeActive={isLinkModeActive}
      isLinked={isLinked}
      onRemove={onRemove}
      extraButtons={[
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
        syncId={syncId}
      />
    </div>
  </PanelContainer>
);
});


function App() {
  const [panels, setPanels] = useState([]);
  const [layout, setLayout] = useState([]);
  const [linkMode, setLinkMode] = useState(null);
  const [panelLinks, setPanelLinks] = useState({});
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

    setScrollPositions(prev => ({
        ...prev,
        [targetId]: targetScrollLeft
    }));
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
  if (!data || !data.pdb) return;

  // minimal per-chain PDB parser (proteins via CA atoms)

  // collect unique (chain, resSeq, iCode) via CA atoms in order
  const chains = new Map(); // chainId -> array of one-letter residues in order
  const seen = new Set();   // key: chain|resSeq|iCode to avoid duplicates

  const lines = data.pdb.split(/\r?\n/);
  for (const line of lines) {
    // Standard PDB columns:
    // 1-6  "ATOM  "
    // 13-16 atom name
    // 18-20 resName
    // 22   chainID
    // 23-26 resSeq
    // 27   iCode
    if (!line.startsWith('ATOM')) continue;

    const atomName = line.slice(12,16).trim(); // e.g., "CA"
    if (atomName !== 'CA') continue; // use alpha carbons as residue representatives

    const resName = line.slice(17,20).trim().toUpperCase();
    const one = threeToOne[resName] || 'X';

    const chainId = (line[21] || 'A').trim() || 'A';
    const resSeq  = line.slice(22,26).trim();
    const iCode   = (line[26] || '').trim();

    const key = `${chainId}|${resSeq}|${iCode}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (!chains.has(chainId)) chains.set(chainId, []);
    chains.get(chainId).push(one);
  }

  if (chains.size === 0) {
    alert("Could not extract any chains/sequences from PDB (no CA atoms found).");
    return;
  }

  // Build sequences per chain
  const chainSeqs = Array.from(chains.entries())
    .map(([chainId, arr]) => ({ chainId, sequence: arr.join('') }))
    .filter(s => s.sequence.length > 0);

  if (chainSeqs.length === 0) {
    alert("Could not extract sequence(s) from PDB.");
    return;
  }

  // --- Create one Alignment panel per chain ---
  const originalLayout = layout.find(l => l.i === id);
  const baseY = originalLayout ? (originalLayout.y + originalLayout.h) : 0;

  // We’ll add panels and layout in a single batch
  const newPanels = [];
  const newLayouts = [];
  const newPanelDataEntries = {};

  chainSeqs.forEach((cs, idx) => {
    const newId = `alignment-from-pdb-${cs.chainId}-${Date.now()}-${idx}`;
    newPanels.push({ i: newId, type: 'alignment' });

    // Stack them under the structure panel, full width to be readable
    const newLayout = {
      i: newId,
      x: 0,
      y: baseY + idx * 3, // stagger rows a bit
      h: 3,
      w: 12,
      minH: 3,
      minW: 3
    };
    newLayouts.push(newLayout);

    const baseName = (data.filename ? data.filename.replace(/\.[^.]+$/, '') : 'structure');
    newPanelDataEntries[newId] = {
      data: [{ id: `${baseName}_chain_${cs.chainId}`, sequence: cs.sequence }],
      filename: `${baseName}_chain_${cs.chainId}.fasta`,
      codonMode: false
    };
  });

  // Insert while keeping the __footer logic intact
  setPanels(prev => {
    const withoutFooter = prev.filter(p => p.i !== '__footer');
    return [
      ...withoutFooter,
      ...newPanels,
      { i: '__footer', type: 'footer' }
    ];
  });

  setLayout(prev => {
    const withoutFooter = prev.filter(l => l.i !== '__footer');
    const footer = prev.find(l => l.i === '__footer');
    const next = [...withoutFooter, ...newLayouts];

    // Recompute footer y to appear after the last panel
    const maxY = next.reduce((m, l) => Math.max(m, l.y + l.h), 0);
    const fixedFooter = footer ? { ...footer, y: maxY } : { i: '__footer', x: 0, y: maxY, w: 12, h: 2, static: true };

    return [...next, fixedFooter];
  });

  setPanelData(prev => ({
    ...prev,
    ...newPanelDataEntries
  }));
}, [panelData, layout, setPanels, setLayout, setPanelData]);

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

  const handleLinkClick = useCallback((id) => {
    if (!linkMode) {
      // no panel selected yet
      if (panelLinks[id]) {
        // currently linked: unlink both
        const other = panelLinks[id];
        setPanelLinks(pl => {
          const copy = { ...pl };
          delete copy[id]; delete copy[other];
          return copy;
        });
      } else {
        // start linking
        setLinkMode(id);
      }
    } else {
      // linking in progress
      if (linkMode === id) {
        // cancelled
        setLinkMode(null);
      } else {
        // link or unlink
        const a = linkMode;
        const b = id;
        if (panelLinks[a] === b) {
          // already linked: unlink
          setPanelLinks(pl => {
            const copy = { ...pl };
            delete copy[a]; delete copy[b];
            return copy;
          });
        } else {
          // create new link: first unlink any existing
          setPanelLinks(pl => {
            const copy = { ...pl };
            // Unlink any existing partner of “a”
            const oldA = copy[a];
            if (oldA) {
              delete copy[a];
              delete copy[oldA];
            }
            // Unlink any existing partner of “b”
            const oldB = copy[b];
            if (oldB) {
              delete copy[b];
              delete copy[oldB];
            }
            // Create new link
            copy[a] = b;
            copy[b] = a;
            return copy;
          });

          // Reorder MSA rows to match tree leaf order if the two are linked
          const panelA = panels.find(p => p.i === a);
          const panelB = panels.find(p => p.i === b);
          if (panelA && panelB) {
            let alignmentId = null, treeId = null;
            if (panelA.type === 'alignment' && panelB.type === 'tree') {
              alignmentId = a; treeId = b;
            } else if (panelA.type === 'tree' && panelB.type === 'alignment') {
              alignmentId = b; treeId = a;
            }
            if (alignmentId && treeId) {
              const treeData = panelData[treeId];
              const msaData = panelData[alignmentId];
              if (treeData && msaData && Array.isArray(msaData.data)) {
                const leafOrder = getLeafOrderFromNewick(treeData.data);
                if (leafOrder.length) {
                  // Try to match MSA sequence IDs to tree leaf names
                  const msaSeqs = msaData.data;
                  // Map by id for fast lookup
                  const msaById = {};
                  msaSeqs.forEach(seq => {
                    msaById[seq.id] = seq;
                  });
                  // Reorder, keeping only those present in tree
                  const reordered = leafOrder
                    .map(id => msaById[id])
                    .filter(Boolean);
                  // Append any MSA seqs not in tree at the end
                  const extraSeqs = msaSeqs.filter(seq => !leafOrder.includes(seq.id));
                  setPanelData(prev => ({
                    ...prev,
                    [alignmentId]: {
                      ...prev[alignmentId],
                      data: [...reordered, ...extraSeqs]
                    }
                  }));
                }
              }
            }
            let heatmapId = null;
            if (panelA.type === 'heatmap' && panelB.type === 'tree') {
              heatmapId = a; treeId = b;
            } else if (panelA.type === 'tree' && panelB.type === 'heatmap') {
              heatmapId = b; treeId = a;
            }
            // Reorder heatmap rows/columns to match tree leaf order if the two are linked
                    if (heatmapId && treeId) {
              const treeData = panelData[treeId];
              const heatmapData = panelData[heatmapId];
              if (treeData && heatmapData && heatmapData.labels && heatmapData.matrix) {
                const leafOrder = getLeafOrderFromNewick(treeData.data);
                if (leafOrder.length) {
                  // Create mapping from old label to new index
                  const labelToIndex = {};
                  heatmapData.labels.forEach((label, idx) => {
                    labelToIndex[label] = idx;
                  });
                  
                  // Build new order based on tree leaf order
                  const newOrder = leafOrder
                    .map(label => labelToIndex[label])
                    .filter(idx => idx !== undefined);
                  
                  // Add any labels not in tree at the end
                  const extraIndices = heatmapData.labels
                    .map((_, idx) => idx)
                    .filter(idx => !newOrder.includes(idx));
                  const finalOrder = [...newOrder, ...extraIndices];
                  
                  // Reorder labels and matrix
                  const newLabels = finalOrder.map(idx => heatmapData.labels[idx]);
                  const newMatrix = finalOrder.map(i => 
                    finalOrder.map(j => heatmapData.matrix[i][j])
                  );
                  
                  setPanelData(prev => ({
                    ...prev,
                    [heatmapId]: {
                      ...prev[heatmapId],
                      labels: newLabels,
                      matrix: newMatrix
                    }
                  }));
                }
              }
            }
          
          }
        }
        setLinkMode(null);
      }
    }
    // clear any existing highlights
    setHighlightSite(null);
    setHighlightOrigin(null);
  }, [linkMode, panelLinks, panels, panelData, highlightSite, highlightOrigin]);

  const handleHighlight = useCallback((site, originId) => {
    setHighlightSite(site);
    setHighlightOrigin(originId);

    // 1) must have a linked panel
    const targetId = panelLinks[originId];
    if (!targetId) return;

    // 2) get types once, up front
    const sourcePanel = panels.find(p => p.i === originId);
    const targetPanel = panels.find(p => p.i === targetId);

    // 3) hover-out: clear any heatmap→tree highlights
    if (site === null) {
      if (sourcePanel?.type === 'heatmap' && targetPanel?.type === 'tree') {
        setPanelData(prev => ({
          ...prev,
          [targetId]: {
            ...prev[targetId],
            linkedHighlights: [],
          }
        }));
      }
 if (sourcePanel?.type === 'alignment' && targetPanel?.type === 'structure') {
    setPanelData(prev => ({
      ...prev,
      [targetId]: {
        ...prev[targetId],
        linkedResidueIndex: undefined,
        linkedChainId: prev[targetId]?.linkedChainId // keep chain if you like
      }
    }));
  }
  return;
}

    // Heatmap -> tree
    if (sourcePanel.type === 'heatmap' && targetPanel.type === 'tree') {
      const { labels } = panelData[originId] || {};
      if (labels) {
        const { row, col } = site;
        const leaf1 = labels[row], leaf2 = labels[col];
        setPanelData(prev => ({
          ...prev,
          [targetId]: {
            ...prev[targetId],
            linkedHighlights: [leaf1, leaf2],
          }
        }));
      }
      return;
    }

    // SequenceLogo <-> Alignment
    if (
    (sourcePanel.type === 'seqlogo' && targetPanel.type === 'alignment') ||
    (sourcePanel.type === 'alignment' && targetPanel.type === 'seqlogo')
    ) {
    const siteIdx = site;
    // Scroll alignment panel if necessary
    if (targetPanel.type === 'alignment') {
      const targetData = panelData[targetId];
      if (!targetData) return;
      const targetIsCodon = targetData.codonMode;
      const scrollSite = targetIsCodon ? siteIdx * 3 : siteIdx;
      setScrollPositions(prev => ({
        ...prev,
        [targetId]: scrollSite * CELL_SIZE
      }));
      setHighlightSite(siteIdx);
      setHighlightOrigin(originId);
    } else if (targetPanel.type === 'seqlogo') {
      setHighlightSite(siteIdx);
      setHighlightOrigin(originId);
    }
    return;
    }

    // Alignment -> Histogram
    if (sourcePanel.type === 'alignment' && targetPanel.type === 'histogram') {
      const targetData = panelData[targetId];
      if (targetData && !Array.isArray(targetData.data)) {
        const xCol = targetData.selectedXCol ||
          (targetData.data.headers.find(h => typeof targetData.data.rows[0][h] === 'number'));
        if (xCol) {
          // Find the bar index whose x value matches the alignment column
          const xArr = targetData.data.rows.map(row => row[xCol]);
          let barIdx = xArr.findIndex(x => x === site);
          if (barIdx === -1) barIdx = null;
          setHighlightSite(barIdx);
          setHighlightOrigin(originId);
        }
      }
    }

    // Histogram -> Alignment
    else if (sourcePanel.type === 'histogram' && targetPanel.type === 'alignment') {
      const sourceData = panelData[originId];
      const targetData = panelData[targetId];
      if (!targetData) return;
      let scrollToSite = site;
      let highlightCol = site;
      if (sourceData && !Array.isArray(sourceData.data)) {
        const xCol = sourceData.selectedXCol ||
          (sourceData.data.headers.find(h => typeof sourceData.data.rows[0][h] === 'number'));
        if (xCol) {
          const xVal = sourceData.data.rows[site]?.[xCol];
          if (typeof xVal === 'number') {
            scrollToSite = xVal;
            highlightCol = scrollToSite;
          }
        }
      }
      const targetIsCodon = targetData.codonMode;
      const scrollMultiplier = targetIsCodon ? 3 : 1;

        setScrollPositions(prev => ({
            ...prev,
            [targetId]: scrollToSite * scrollMultiplier * CELL_SIZE
          }));
          setHighlightSite(highlightCol);
          setHighlightOrigin(originId);
    }
    // Alignment -> Alignment
    else if (sourcePanel.type === 'alignment' && targetPanel.type === 'alignment') {
      const originData = panelData[originId];
      const targetData = panelData[targetId];
      if (!originData || !targetData) return;

      const targetIsCodon = targetData.codonMode;
      const scrollSite = targetIsCodon ? site * 3 : site;

      setScrollPositions(prev => ({
        ...prev,
        [targetId]: scrollSite * CELL_SIZE
      }));
      setHighlightSite(site);
      setHighlightOrigin(originId);
    }

  const extractChainIdFromSeqId = (id) => {
  if (!id) return null;
  const m = id.match(/_chain_([A-Za-z0-9])\b/i);
  if (m) return m[1];
  if (/^[A-Za-z0-9]$/.test(id)) return id; // single-letter chain like "A"
  return null;
};

const getSeqForChain = (alignmentData, preferChainId, structureChainsLengths) => {
  if (!alignmentData || !Array.isArray(alignmentData.data)) return { seq: null, chainId: null };
  // Prefer name-based match
  if (preferChainId) {
    const named = alignmentData.data.find(s => {
      const cid = extractChainIdFromSeqId(s.id);
      return cid === preferChainId || s.id === preferChainId;
    });
    if (named) return { seq: named, chainId: preferChainId };
  }
  // Length-based unique match
  if (structureChainsLengths) {
    for (const s of alignmentData.data) {
      const len = (s.sequence || '').replace(/-/g, '').length;
      const match = Object.entries(structureChainsLengths).find(([, L]) => L === len);
      if (match) return { seq: s, chainId: match[0] };
    }
  }
  return { seq: alignmentData.data[0] || null, chainId: preferChainId || null };
};

// Alignment -> Structure
if (sourcePanel?.type === 'alignment' && targetPanel?.type === 'structure') {
  const alnData = panelData[originId];
  const structId = targetId;


  // we don’t know chain lengths here; let viewer deduce by name/length too,
  // but we’ll try to pull a chainId from sequence id for better UX:
  const preferredChainId =
    extractChainIdFromSeqId(alnData?.data?.[0]?.id) ||
    null;

  // We need to map column -> residue index (skip gaps) for the matched sequence
  // Try to find a matching sequence by chain name
  const { seq, chainId } = getSeqForChain(alnData, preferredChainId, null);
  if (seq) {
    const residIdx = (() => {
      let count = -1;
      for (let i = 0; i <= site && i < seq.sequence.length; i++) {
        if (seq.sequence[i] !== '-') count++;
      }
      return count < 0 ? null : count;
    })();

    setPanelData(prev => ({
      ...prev,
      [structId]: {
        ...prev[structId],
        linkedResidueIndex: residIdx,
        linkedChainId: chainId || preferredChainId || undefined
      }
    }));
  }
  return;
}

// Structure -> Alignment
if (sourcePanel?.type === 'structure' && targetPanel?.type === 'alignment') {
  const structData = panelData[originId];
  const alnData = panelData[targetId];
  if (!alnData || !Array.isArray(alnData.data)) return;

  const structureChainId = structData?.linkedChainId
    || extractChainIdFromSeqId(alnData.data[0]?.id)
    || null;

  // pick the best sequence (by name or length)
  const { seq } = getSeqForChain(alnData, structureChainId, null);
  if (!seq) return;

  // translate residue index -> MSA column
  const residIdx = site; // what StructureViewer sends
  const col = (() => {
    let count = -1;
    for (let i = 0; i < seq.sequence.length; i++) {
      if (seq.sequence[i] !== '-') {
        count++;
        if (count === residIdx) return i;
      }
    }
    return null;
  })();

  if (col != null) {
    // Scroll & highlight the alignment column
    const isCodon = panelData[targetId]?.codonMode;
    const scrollMultiplier = isCodon ? 3 : 1;
    setScrollPositions(prev => ({
      ...prev,
      [targetId]: col * scrollMultiplier * CELL_SIZE
    }));
    setHighlightSite(col);
    setHighlightOrigin(originId);
  }
  return;
}
  }, [panelLinks, panels, panelData, highlightOrigin]);


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
    const board = {
      panels,
      layout,
      panelData,
      panelLinks
    };
    const blob = new Blob([JSON.stringify(board, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mseaboard.json';
    a.click();
    URL.revokeObjectURL(url);
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
  const makeCommonProps = useCallback((panel) => {
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
      onHighlight: handleHighlight,
      hoveredPanelId,
      setHoveredPanelId
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
    panelData
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
  let syncId;
    if (panel.type === 'histogram') {
      const otherId = panelLinks[panel.i];  // see if they're linked
      const otherPanel = panels.find(p => p.i === otherId);
      if (otherId && otherPanel?.type === 'histogram') {
        // use a stable string (sort the two IDs so it's the same both ways)
        const [a, b] = [panel.i, otherId].sort();
        syncId = `hist-sync-${a}-${b}`;
      }
    }

  return (
  <div key={panel.i}>
    {panel.type === 'alignment' ? (
      <AlignmentPanel
        {...commonProps}
        setPanelData={setPanelData}
        onSyncScroll={onSyncScroll}
        externalScrollLeft={scrollPositions[panel.i]}
        highlightedSequenceId={highlightedSequenceId}
        setHighlightedSequenceId={setHighlightedSequenceId}
        onDuplicateTranslate={handleDuplicateTranslate} 
        onCreateSeqLogo={handleCreateSeqLogo}
      />
  ) : panel.type === 'tree' ? (
        <TreePanel
          {...commonProps}
          setPanelData={setPanelData}
          highlightedSequenceId={highlightedSequenceId}
          onHoverTip={setHighlightedSequenceId}
          onGenerateDistance={handleTreeToDistance}
        />
      ) : panel.type === 'histogram' ? (
        <HistogramPanel
          {...commonProps}
          setPanelData={setPanelData}
          syncId={syncId}
        />
      ) : panel.type === 'notepad' ? (
        <NotepadPanel
          {...commonProps}
          setPanelData={setPanelData}
        />
      ) : panel.type === 'heatmap' ? (
        <HeatmapPanel
        {...commonProps}
        onHighlight={handleHighlight}
        setPanelData={setPanelData}

      />
      ) :panel.type === 'seqlogo' ? (
    <SeqLogoPanel
      {...commonProps}
      setPanelData={setPanelData}
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
  onCreateSequenceFromStructure={handleCreateSequenceFromStructure}
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
