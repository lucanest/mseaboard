// App.jsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import throttle from 'lodash.throttle'
import debounce from 'lodash.debounce';
import {DuplicateButton, RemoveButton, LinkButton, RadialToggleButton, CodonToggleButton, TranslateButton, SeqlogoButton, GitHubButton} from './components/Buttons.jsx';
import { translateNucToAmino, isNucleotide, parsePhylipDistanceMatrix, parseFasta, getLeafOrderFromNewick } from './components/Utils.jsx';
import { FixedSizeGrid as Grid } from 'react-window';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import ReactDOM from 'react-dom';
import PhyloTreeViewer from './components/PhyloTreeViewer.jsx';
import PhylipHeatmap from "./components/Heatmap";
import Histogram from './components/Histogram.jsx';
import SequenceLogoSVG from './components/Seqlogo.jsx';

const LABEL_WIDTH = 66;
const CELL_SIZE = 24;

const residueColors = {
  A: 'bg-green-200', C: 'bg-yellow-200', D: 'bg-red-200', E: 'bg-red-200',
  F: 'bg-purple-200', G: 'bg-gray-200', H: 'bg-pink-200', I: 'bg-blue-200',
  K: 'bg-orange-200', L: 'bg-blue-200', M: 'bg-blue-100', N: 'bg-red-100',
  P: 'bg-teal-200', Q: 'bg-red-100', R: 'bg-orange-300', S: 'bg-green-100',
  T: 'bg-green-100', V: 'bg-blue-100', W: 'bg-purple-300', Y: 'bg-purple-100',
  '-': 'bg-white'
};


const MSACell = React.memo(function MSACell({
   style, char, isHoverHighlight, isLinkedHighlight,
   onMouseEnter, onMouseMove, onMouseLeave,onClick, isPersistentHighlight
 }) {
   const background = residueColors[char?.toUpperCase()] || 'bg-white';
   return (
     <div
       style={style}
       className={`flex items-center justify-center  ${background} ${
      isHoverHighlight || isLinkedHighlight
          ? 'alignment-highlight'
          : isPersistentHighlight
          ? 'persistent-alignment-highlight'
          : ''
       }`}
       onMouseEnter={onMouseEnter}
       onMouseMove={onMouseMove}
       onMouseLeave={onMouseLeave}
       onClick={onClick}
     >
       {char}
     </div>
   );
});

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
    <div className="panel-drag-handle bg-gray-100 p-1 mb-2 cursor-move flex items-center justify-between font-bold">
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

function EditableFilename({ 
  id, 
  filename, 
  setPanelData, 
  prefix = '', 
  className = '' 
}) {
  const [editing, setEditing] = useState(false);
  const [filenameInput, setFilenameInput] = useState(filename);

  useEffect(() => {
    setFilenameInput(filename);
  }, [filename]);

  return editing ? (
    <form
      onSubmit={e => {
        e.preventDefault();
        setPanelData(prev => ({
          ...prev,
          [id]: { ...prev[id], filename: filenameInput }
        }));
        setEditing(false);
      }}
      className={`inline ${className}`}
    >
      <input
        className="border rounded px-1 w-32 text-sm"
        value={filenameInput}
        onChange={e => setFilenameInput(e.target.value)}
        autoFocus
        onBlur={() => setEditing(false)}
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

function Tooltip({ x, y, children }) {
  return ReactDOM.createPortal(
    <div
      className="fixed px-1 py-0.5 text-xs bg-gray-200 rounded-xl pointer-events-none z-[9999]"
      style={{ top: y + 24, left: x + 14 }}
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
  const Highlighted = (
  highlightedSite != null &&
  (
    highlightOrigin === id ||
    linkedTo === highlightOrigin
  )
)
  useEffect(() => {
    // Only scroll if highlight comes from a linked panel
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

        const colLeft = highlightedSite * colWidth;
        const colRight = colLeft + colWidth;

        // If not fully visible, scroll to reveal
        if (colLeft < currentScroll) {
          container.scrollTo({
            left: colLeft - 600, // padding
            behavior: "smooth",
          });
        }
        else if (colRight > currentScroll + containerWidth) {
          container.scrollTo({
            left: colRight - containerWidth + 600, // padding
            behavior: "smooth",
          });
        }
    }
    }, [highlightedSite, highlightOrigin, linkedTo, id]);
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
        editing={false}
        setEditing={()=>{}}
        filenameInput={data.filename || "Sequence Logo"}
        setFilenameInput={()=>{}}
        onDuplicate={onDuplicate}
        onRemove={onRemove}
        onLinkClick={onLinkClick}
        isLinkModeActive={isLinkModeActive}
        isLinked={isLinked}
      />
      <div ref={scrollContainerRef}
      className="flex-1 p-2 bg-white overflow-x-auto">
        {sequences.length === 0 ? (
          <div className="text-gray-400 text-center">
            No data to render sequence logo.
          </div>
        ) : (
          
        <SequenceLogoSVG
          sequences={sequences}
          height={200}
          highlightedSite={Highlighted ? highlightedSite : null}
          onHighlight={siteIdx => {
            // Only send highlight if panel is linked, or user is hovering here
            if (onHighlight) onHighlight(siteIdx, id);
          }} 
        />
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
  const containerRef = useRef();
  const [dims, setDims] = useState({ width: 400, height: 400 });

  // Watch for panel resize
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new window.ResizeObserver(entries => {
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

  if (!labels || !matrix) {
    return (
      <PanelContainer id={id} hoveredPanelId={hoveredPanelId} setHoveredPanelId={setHoveredPanelId}>
        <PanelHeader {...{id, filename, setPanelData, onDuplicate, onLinkClick, isLinkModeActive, isLinked, onRemove, editing:false, setEditing:()=>{}, filenameInput:filename, setFilenameInput:()=>{} }}/>
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
          editing={false}
          setEditing={()=>{}}
          filenameInput={filename}
          setFilenameInput={()=>{}}
    />
    {/* Add padding container around the heatmap */}
    <div className="flex-1 p-2 pb-4 pr-4 overflow-hidden">
      {labels && matrix ? (
        <PhylipHeatmap
        id={id}
        labels={labels}
        matrix={matrix}
        highlightSite={highlightedSite}
        highlightOrigin={highlightOrigin}
        onHighlight={onHighlight}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400">No data</div>
      )}
    </div>
  </PanelContainer>
);
});

const AlignmentPanel = React.memo(function AlignmentPanel({
  id,
  data,
  onRemove, onReupload, onDuplicate, onDuplicateTranslate, onCreateSeqLogo,
  onLinkClick, isLinkModeActive, isLinked, linkedTo,
  highlightedSite, highlightOrigin, onHighlight,
  onSyncScroll, externalScrollLeft,
  highlightedSequenceId, setHighlightedSequenceId,hoveredPanelId,
  setHoveredPanelId, setPanelData
}) {
  const msaData = useMemo(() => data.data, [data.data]);
  const filename = data.filename;
  const containerRef = useRef(null);
  const gridContainerRef = useRef(null);
  const gridRef = useRef(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const [hoveredCol, setHoveredCol] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [codonMode, setCodonModeState] = useState(data.codonMode || false);
  const [scrollTop, setScrollTop] = useState(0);
  const isNuc = useMemo(() => isNucleotide(msaData), [msaData]);


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

  // throttle highlight to once every 150ms
  const throttledHighlight = useMemo(
    () => throttle((col,row, originId, clientX, clientY) => {
      setHoveredCol(col);
      setHoveredRow(row);
      setTooltipPos({ x: clientX, y: clientY });
      onHighlight(col, originId);
    }, 150),
    [onHighlight]
  );

  // throttle scroll handler to once every 150ms
  const throttledOnScroll = useCallback(
    throttle(({ scrollTop, scrollLeft }) => {
      setScrollTop(scrollTop);
      if (linkedTo != null && scrollLeft != null) {
        onSyncScroll(scrollLeft, id);
      }
    }, 150),
    [onSyncScroll, linkedTo, id]
  );

  const setCodonMode = useCallback((fnOrValue) => {
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
  }, [id, setPanelData]);

  useEffect(() => {
    if (data.codonMode !== codonMode) {
      setCodonModeState(data.codonMode || false);
    }
  }, [data.codonMode]);

  useEffect(() => {
    if (hoveredPanelId !== id && hoveredPanelId !== linkedTo) {
      setHoveredCol(null);
      setHoveredRow(null);
      if (id === highlightOrigin) {
        onHighlight(null, id);
      }
    }
  }, [hoveredPanelId, id, linkedTo, highlightOrigin, onHighlight]);

  useEffect(() => {
    window.clearAlignmentHighlight = (panelId) => {
      if (panelId === id) {
        setHoveredCol(null);
        setHoveredRow(null);
        onHighlight(null, id);
      }
    };
    return () => {
      if (window.clearAlignmentHighlight) delete window.clearAlignmentHighlight;
    };
  }, [id, onHighlight]);

  useEffect(() => {
    if (hoveredPanelId !== id) {
      setHoveredCol(null);
      setHoveredRow(null);
      setHighlightedSequenceId(null);
      if (id === highlightOrigin) {
        onHighlight(null, id);
      }
    }
  }, [hoveredPanelId, id, highlightOrigin, onHighlight]);

  useEffect(() => {
  if (!gridContainerRef.current) return;


  const handleResize = debounce((width, height) => {
    setDims(prev => {
      if (prev.width === width && prev.height === height) return prev;
      return { width, height };
    });
  }, 200); // Debounce at 200ms

  let resizeRAF = null;
  const ro = new ResizeObserver(entries => {
    if (resizeRAF != null) return;
    resizeRAF = requestAnimationFrame(() => {
      let width, height;
      for (let { contentRect } of entries) {
        width = contentRect.width;
        height = contentRect.height;
      }
      handleResize(width, height);
      resizeRAF = null;
    });
  });

  ro.observe(gridContainerRef.current);

  return () => {
    ro.disconnect();
    handleResize.cancel();      
    if (resizeRAF != null)      
      cancelAnimationFrame(resizeRAF);
  };
  }, []);

  useEffect(() => {
    if (!gridRef.current || typeof externalScrollLeft !== 'number') return;

    const viewportWidth = dims.width - LABEL_WIDTH;
    const outer = gridRef.current._outerRef;
    const currentScrollLeft = outer ? outer.scrollLeft : 0;
    const colStart = externalScrollLeft;
    const itemWidth = codonMode ? 3 * CELL_SIZE : CELL_SIZE;
    const colEnd = colStart + itemWidth;

    if (colStart < currentScrollLeft || colEnd > currentScrollLeft + viewportWidth) {
      gridRef.current.scrollTo({ scrollLeft: colStart });
    }
  }, [externalScrollLeft, dims.width, codonMode]);

  const rowCount = msaData.length;
  const colCount = msaData[0]?.sequence.length || 0;

  const Cell = useCallback(
  ({ columnIndex, rowIndex, style }) => {
    const char = msaData[rowIndex].sequence[columnIndex];
    const codonIndex = Math.floor(columnIndex / 3);
    const idx = codonMode ? codonIndex : columnIndex;
    const persistentHighlights = data.highlightedSites || [];
    const isPersistentHighlight = persistentHighlights.includes(idx); 
    const isHoverHighlight = codonMode ? hoveredCol != null && hoveredCol === codonIndex : hoveredCol === columnIndex;
    const isLinkedHighlight =
      linkedTo &&
      highlightedSite != null &&
      (linkedTo === highlightOrigin || id === highlightOrigin) &&
      (codonMode ? codonIndex === highlightedSite : columnIndex === highlightedSite);
    const handleClick = useCallback(() => {
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
    }, [id, idx, setPanelData]);

    const handleMouseEnter = useCallback(
      (e) => {
        const { clientX, clientY } = e;
        const idx = codonMode ? codonIndex : columnIndex;
        throttledHighlight(idx, rowIndex, id, clientX, clientY);
        if (linkedTo && setHighlightedSequenceId) {
          setHighlightedSequenceId(msaData[rowIndex].id);
        }
      },
      [
        codonMode, codonIndex, columnIndex, rowIndex, id,
        throttledHighlight, linkedTo, setHighlightedSequenceId, msaData
      ]
    );
 
    const handleMouseMove = useCallback(
      (e) => {
        const { clientX, clientY } = e;
        const idx = codonMode ? codonIndex : columnIndex;
        throttledHighlight(idx, rowIndex, id, clientX, clientY);
      },
      [codonMode, codonIndex, columnIndex, rowIndex, id, throttledHighlight]
    );
 

 
     return (
       <MSACell
         key={`${rowIndex}-${columnIndex}`}
         columnIndex={columnIndex}
         rowIndex={rowIndex}
         style={style}
         char={char}
         isHoverHighlight={isHoverHighlight}
         isLinkedHighlight={isLinkedHighlight}
         onMouseEnter={handleMouseEnter}
         onMouseMove={handleMouseMove}
        onClick={handleClick}
        isPersistentHighlight={isPersistentHighlight}
       />
     );
   },
   [
     msaData, codonMode, hoveredCol, highlightedSite, highlightOrigin,
     linkedTo, id, onHighlight, throttledHighlight,
     setHoveredCol, setHoveredRow, setHighlightedSequenceId
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
        onMouseLeave={() => {
          throttledHighlight.cancel();
          setHoveredCol(null);
          if (id === highlightOrigin) {
            onHighlight(null, id);
          }
        }}
      >
        <PanelHeader
          id={id}
          prefix="MSA: "
          filename={filename}
          setPanelData={setPanelData}
          extraButtons={isNuc ? [
            <CodonToggleButton
                onClick={() => setCodonMode(m => !m)}
                isActive={codonMode}
              />,
              <TranslateButton onClick={() => onDuplicateTranslate(id)} />,
              <SeqlogoButton onClick={() => onCreateSeqLogo(id)} />
            ] : [<SeqlogoButton onClick={() => onCreateSeqLogo(id)} />]}
          onDuplicate={onDuplicate}
          onLinkClick={onLinkClick}
          isLinkModeActive={isLinkModeActive}
          isLinked={isLinked}
          onRemove={onRemove}
        />
      

        {hoveredCol != null && (hoveredPanelId === id || hoveredPanelId === linkedTo) && id === highlightOrigin && (
        <Tooltip x={tooltipPos.x} y={tooltipPos.y}>
          <div className="flex flex-col items-center">
            <span className="font-bold">
              {codonMode
                ? `Codon ${hoveredCol + 1}`
                : `Site ${hoveredCol + 1}`}
            </span>
            {hoveredRow != null && msaData[hoveredRow] && (
              <span className="text-gray-700 font-mono text-xs">{msaData[hoveredRow].id}</span>
            )}
          </div>
        </Tooltip>
        )}

        {highlightedSite != null &&
          linkedTo === highlightOrigin &&
          id !== highlightOrigin && (
            <Tooltip x={tooltipPos.x} y={tooltipPos.y}>
          <span>
            {codonMode ? 'Codon ' : 'Site '}
            <span className="font-bold">{highlightedSite + 1}</span>
          </span>
            </Tooltip>
          )}

        <div
          ref={gridContainerRef}
          className="flex-1 flex overflow-hidden font-mono text-sm"
        >
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
        {sequenceLabels.map(({ index, rawId, shortId, id: seqId}) => {
        const isLinkedNameHighlight =
            highlightedSequenceId === seqId && (hoveredPanelId === id || hoveredPanelId === linkedTo);

  return (
    <div
      key={index}
      style={{
        height: CELL_SIZE,
        lineHeight: `${CELL_SIZE}px`
      }}
      className={`flex items-center pr-2 pl-2 text-right font-bold truncate ${
        isLinkedNameHighlight ? 'bg-yellow-100' : ''
      }`}
      title={rawId}
      onMouseEnter={() => {
        if (linkedTo) setHighlightedSequenceId(id);
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

          <Grid
            ref={gridRef}
            columnCount={colCount}
            columnWidth={CELL_SIZE}
            height={dims.height}
            rowCount={rowCount}
            rowHeight={CELL_SIZE}
            width={Math.max(dims.width - LABEL_WIDTH, 0)}
            onScroll={throttledOnScroll}
            overscanRowCount={2}
            overscanColumnCount={2}
          >
            {Cell}
          </Grid>
        </div>
      </div>
    </PanelContainer>
  );
});

const TreePanel = React.memo(function TreePanel({
  id, data, onRemove, onReupload, onDuplicate,
  highlightedSequenceId, onHoverTip,
  linkedTo, highlightOrigin,
  onLinkClick, isLinkModeActive, isLinked,hoveredPanelId,
  setHoveredPanelId, setPanelData
}) {
  const { data: newick, filename, isNhx,RadialMode=true } = data;

  const handleRadialToggle = useCallback(() => {
    setPanelData(pd => ({
      ...pd,
      [id]: {
        ...pd[id],
        RadialMode: !RadialMode
      }
    }));
  }, [id, setPanelData, RadialMode]);

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
          />
        ]}
      isLinked={isLinked}
      onRemove={onRemove}
      />
      <div className="flex-1 overflow-auto flex items-center justify-center">
          <PhyloTreeViewer
            newick={newick}
            isNhx={isNhx}
            highlightedSequenceId={highlightedSequenceId}
            onHoverTip={onHoverTip}
            linkedTo={linkedTo}
            highlightOrigin={highlightOrigin}
            radial={RadialMode}
            id={id}
          setPanelData={setPanelData}
          highlightedNodes={data.highlightedNodes || []}
          linkedHighlights={data.linkedHighlights || []}
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

  useEffect(() => {
    setText(data.text || "");
    setFilenameInput(data.filename || "Notes");
  }, [data.text, data.filename]);

  return (
    <PanelContainer
      id={id}
      hoveredPanelId={hoveredPanelId}
      setHoveredPanelId={setHoveredPanelId}
      onDoubleClick={() => setEditing(true)}
    >
      <PanelHeader
        id={id}
        prefix="-"
        filename={filenameInput}
        setPanelData={setPanelData}
        onDuplicate={onDuplicate}
        onRemove={onRemove}
      />
      <div className="flex-1 p-2">
        <textarea
          className="w-full h-full border rounded-xl p-2 resize-none"
          value={text}
          onChange={e => {
            setText(e.target.value);
            setPanelData(prev => ({
              ...prev,
              [id]: { ...prev[id], text: e.target.value }
            }));
          }}
          placeholder="Write your notes here..."
          style={{ minHeight: 120 }}
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
        data.data.headers.find(h => typeof data.data.rows[0][h] !== 'number'))
      : null
  );

  useEffect(() => {
    if (isTabular) {
      setSelectedCol(
        data.selectedCol ||
        data.data.headers.find(h => typeof data.data.rows[0][h] === 'number')
      );
      setSelectedXCol(
        data.selectedXCol ||
        data.data.headers.find(h => typeof data.data.rows[0][h] !== 'number')
      );
    }
  }, [isTabular, data.selectedCol, data.selectedXCol, data.data]);

  const numericCols = useMemo(() => {
    if (!isTabular) return [];
    return data.data.headers.filter(h =>
      data.data.rows.every(row => typeof row[h] === 'number')
    );
  }, [isTabular, data]);

  const allCols = useMemo(() => {
    return isTabular ? data.data.headers : [];
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
  const chartContainerRef = useRef(null);
  const [height, setHeight] = useState(300); // default height
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const handleResize = () => {
      setHeight(chartContainerRef.current.offsetHeight);
    };
    handleResize();
    const ro = new window.ResizeObserver(handleResize);
    ro.observe(chartContainerRef.current);
    return () => ro.disconnect();
  }, []);
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
    />
    <div className="p-2">
      {isTabular && (
        <div className="flex items-center gap-4">
          <div>
            <label className="mr-2">X:</label>
            <select
              value={selectedXCol}
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
              {allCols.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>
                    <div>
            <label className="mr-2">Y:</label>
            <select
              value={selectedCol}
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
  const fileInputRefWorkspace = useRef(null);
  const pendingTypeRef = useRef(null);
  const pendingPanelRef = useRef(null);

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

    const newId = `${panel.type}-${Date.now()}`;
    const newPanel = { ...panel, i: newId };

    const originalLayout = layout.find(l => l.i === id);
    let newX = (originalLayout.x + originalLayout.w);
    if (newX + originalLayout.w > 12) {
      newX = originalLayout.x;
    } 
    const newLayout = {
      ...originalLayout,
      i: newId,
      x: newX,
      y: originalLayout.y + 1
    };


  setPanels(prev => [...prev.filter(p => p.i !== '__footer'), newPanel, { i: '__footer', type: 'footer' }]);
  setLayout(prev => {
    const withoutFooter = prev.filter(l => l.i !== '__footer');
    const footer = prev.find(l => l.i === '__footer');
    return [...withoutFooter, newLayout, footer];
  });
  setPanelData(prev => ({ ...prev, [newId]: JSON.parse(JSON.stringify(data)) }));
  }, [panels, panelData, layout]);

  const handleDuplicateTranslate = useCallback((id) => {
    const panel = panels.find(p => p.i === id);
    const data = panelData[id];
    if (!panel || !data) return;

    const translatedMsa = translateNucToAmino(data.data)

    const newId = `alignment-aa-${Date.now()}`;
    const newPanel = { ...panel, i: newId };

    const originalLayout = layout.find(l => l.i === id);
    let newX = (originalLayout.x + originalLayout.w);
    if (newX + originalLayout.w > 12) {
      newX = originalLayout.x;
    }
    const newLayout = {
      ...originalLayout,
      i: newId,
      x: newX,
      y: originalLayout.y + 1
    };

    setPanels(prev => [...prev.filter(p => p.i !== '__footer'), newPanel, { i: '__footer', type: 'footer' }]);
    setLayout(prev => {
      const withoutFooter = prev.filter(l => l.i !== '__footer');
      const footer = prev.find(l => l.i === '__footer');
      return [...withoutFooter, newLayout, footer];
    });
    setPanelData(prev => ({
      ...prev,
      [newId]: {
        ...data,
        data: translatedMsa,
        filename: (data.filename ? data.filename.replace(/\.[^.]+$/, '') : 'alignment') + '_protein.fasta',
        codonMode: false
      }
    }));
  }, [panels, panelData, layout, setPanels, setLayout, setPanelData]);

  const handleCreateSeqLogo = useCallback((id) => {
    const panel = panels.find(p => p.i === id);
    const data = panelData[id];
    if (!panel || !data) return;

    const newId = `seqlogo-${Date.now()}`;
    const newPanel = { i: newId, type: 'seqlogo' };

    const originalLayout = layout.find(l => l.i === id);
    const newLayout = {
      ...originalLayout,
      h:8,
      i: newId,
      x: originalLayout.x,
      y: originalLayout.y + 1
    };

    setPanels(prev => [
      ...prev.filter(p => p.i !== '__footer'),
      newPanel,
      { i: '__footer', type: 'footer' }
    ]);
    setLayout(prev => {
      const withoutFooter = prev.filter(l => l.i !== '__footer');
      const footer = prev.find(l => l.i === '__footer');
      return [...withoutFooter, newLayout, footer];
    });
    setPanelData(prev => ({
      ...prev,
      [newId]: {
        msa: data.data,
        filename: (data.filename ? data.filename.replace(/\.[^.]+$/, '') : 'alignment')
      }
    }));
  }, [panels, panelData, layout]);

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
          (targetData.data.headers.find(h => typeof targetData.data.rows[0][h] !== 'number'));
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
          (sourceData.data.headers.find(h => typeof sourceData.data.rows[0][h] !== 'number'));
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
          const lines = text.trim().split(/\r?\n/);
          const values = lines.map(line => Number(line.trim())).filter(n => !isNaN(n));
          // Use line numbers (1-based) as xValues
          panelPayload = { data: values, filename, xValues: values.map((_, i) => i + 1) };
        }
    } else if (type === 'heatmap') {
        const text = await file.text();
        const parsed = parsePhylipDistanceMatrix(text);
        panelPayload = { ...parsed, filename };
  }

      // Update or add panel data
      setPanelData(prev => ({ ...prev, [id]: panelPayload }));

      if (!isReupload) {
        // Add new panel in layout
        setPanels(prev => {
          const withoutFooter = prev.filter(p => p.i !== '__footer');
          return [
            ...withoutFooter,
            { i: id, type },
            { i: '__footer', type: 'footer' }
          ];
        });
        const layoutWithoutFooter = layout.filter(l => l.i !== '__footer');
        const maxY = layoutWithoutFooter.reduce((max, l) => Math.max(max, l.y + l.h), 0);
        const newPanelLayout = { i: id, x: (layoutWithoutFooter.length * 4) % 12, y: maxY, w: 4, h: 20, minW: 1, minH: 5 };
        setLayout([...layoutWithoutFooter, newPanelLayout, { i: '__footer', x: 0, y: maxY + 1, w: 12, h: 2, static: true }]);
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

    const handleLoadWorkspace = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const workspace = JSON.parse(text);
      setPanels(workspace.panels || []);
      setLayout(workspace.layout || []);
      setPanelData(workspace.panelData || {});
      setPanelLinks(workspace.panelLinks || {});
    } catch (err) {
      alert('Invalid workspace file');
    }
    fileInputRefWorkspace.current.value = null;
  };

  const handleSaveWorkspace = () => {
    const workspace = {
      panels,
      layout,
      panelData,
      panelLinks
    };
    const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mseaview-workspace.json';
    a.click();
    URL.revokeObjectURL(url);
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
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-white text-black">
        <div className="p-4 flex justify-between items-center">
          <div className="flex items-center justify-start w-full">
            {'MSEAVIEW'.split('').map((char, i) => (
              <span key={i} className={`w-16 h-16 flex items-center justify-center text-5xl font-bold leading-none ${residueColors[char]} `}>{char}</span>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <button
    onClick={handleSaveWorkspace}
    className="w-40 h-20 bg-gray-200 text-black px-4 py-2 rounded-xl hover:bg-gray-300 shadow-lg hover:shadow-xl"
  >
    Save Workspace
  </button>
  <button
    onClick={() => fileInputRefWorkspace.current.click()}
    className="w-40 h-20 bg-gray-200 text-black px-4 py-2 rounded-xl hover:bg-gray-300 shadow-lg hover:shadow-xl"
  >
    Load Workspace
  </button>
  <button
    onClick={() => {
      const id = `notepad-${Date.now()}`;
      setPanels(prev => [
        ...prev.filter(p => p.i !== '__footer'),
        { i: id, type: 'notepad' },
        { i: '__footer', type: 'footer' }
      ]);
      const layoutWithoutFooter = layout.filter(l => l.i !== '__footer');
      const maxY = layoutWithoutFooter.reduce((max, l) => Math.max(max, l.y + l.h), 0);
      setLayout([
        ...layoutWithoutFooter,
        { i: id, x: (layoutWithoutFooter.length * 4) % 12, y: maxY, w: 4, h: 10, minW: 1, minH: 5 },
        { i: '__footer', x: 0, y: maxY + 1, w: 12, h: 2, static: true }
      ]);
      setPanelData(prev => ({
        ...prev,
        [id]: { filename: "Notes", text: "" }
      }));
    }}
    className="w-40 h-20 bg-yellow-100 text-black px-4 py-2 rounded-xl hover:bg-yellow-200 shadow-lg hover:shadow-xl"
  >
    New Notepad
  </button>
  <input
    ref={fileInputRefWorkspace}
    type="file"
    accept=".json"
    onChange={handleLoadWorkspace}
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
            <GitHubButton />
            <input ref={fileInputRef} type="file" accept=".fasta,.nwk,.nhx,.txt,.tsv,.csv,.fas,.phy,.phylip,.dist" onChange={handleFileUpload} style={{ display: 'none' }} />
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
  ) : null}
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
