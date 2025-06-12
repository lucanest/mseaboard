import React, { useState, useRef, useEffect, useCallback } from 'react';
import { parse } from 'newick';
import { LinkIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { FixedSizeGrid as Grid, FixedSizeList as List } from 'react-window';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import PhyloTreeViewer from './components/PhyloTreeViewer.jsx';
import Histogram from './components/Histogram.jsx';

const residueColors = {
  A: 'bg-green-200', C: 'bg-yellow-200', D: 'bg-red-200', E: 'bg-red-200',
  F: 'bg-purple-200', G: 'bg-gray-200', H: 'bg-pink-200', I: 'bg-blue-200',
  K: 'bg-orange-200', L: 'bg-blue-200', M: 'bg-blue-100', N: 'bg-red-100',
  P: 'bg-teal-200', Q: 'bg-red-100', R: 'bg-orange-300', S: 'bg-green-100',
  T: 'bg-green-100', V: 'bg-blue-100', W: 'bg-purple-300', Y: 'bg-purple-100',
  '-': 'bg-white'
};

function parseFasta(content) {
  const lines = content.split(/\r?\n/);
  const result = [];
  let current = null;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    if (line.startsWith(">")) {
      if (current) result.push(current);
      current = { id: line.slice(1).trim(), sequence: "" };
    } else if (current) {
      current.sequence += line.trim();
    }
  }
  if (current) result.push(current);

  return result;
}

function DuplicateButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="absolute right-8 top-0 p-0.5"
      title="Duplicate panel"
    >
      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-gray-200 border border-gray-400 hover:bg-gray-300">
        <DocumentDuplicateIcon className="w-5 h-5 text-gray-700" />
      </span>
    </button>
  );
}

function RemoveButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="absolute right-2 top-0 text-red-500 hover:text-red-700">
      ×
    </button>
  );
}

function LinkButton({ onClick, isLinked, isLinkModeActive }) {
  return (
  <button
        onClick={onClick}
        className="absolute right-16 top-0 p-0.5"
        title={isLinked ? 'Unlink panels' : 'Link this panel'}>
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded
        ${isLinkModeActive ? 'bg-blue-200' :
        isLinked         ? 'bg-green-200' :
                           'bg-gray-200'}
        border border-gray-400`}>
          <LinkIcon
          className={`
            w-6 h-6
            ${isLinkModeActive ? 'text-blue-700' :
              isLinked         ? 'text-green-700' :
                                'text-gray-500'}`}
            aria-hidden="true"
          />
        </span>
      </button>
  );
}

const AlignmentPanel = React.memo(function AlignmentPanel({
  id,
  data: { data: msaData, filename },
  onRemove, onReupload, onDuplicate,
  onLinkClick, isLinkModeActive, isLinked, linkedTo,
  highlightedSite, highlightOrigin, onHighlight,
  onSyncScroll, externalScrollLeft
}){
  const containerRef     = useRef(null);
  const gridContainerRef = useRef(null);
  const listRef          = useRef(null);

  const [dims, setDims]           = useState({ width: 0, height: 0 });
  const [hoveredCol, setHoveredCol] = useState(null);
  const [tooltipPos, setTooltipPos]   = useState({ x: 0, y: 0 });

  // sizing
  const LABEL_WIDTH = 66;  // px
  const CELL_SIZE   = 24;  // px

  // Re-measure on panel resize
  useEffect(() => {
    if (!gridContainerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (let { contentRect } of entries) {
        setDims({
          width:  contentRect.width,
          height: contentRect.height
        });
      }
    });
    ro.observe(gridContainerRef.current);
    // initial measure
    const { width, height } = gridContainerRef.current.getBoundingClientRect();
    setDims({ width, height });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (gridRef.current && typeof externalScrollLeft === 'number') {
      gridRef.current.scrollTo({ scrollLeft: externalScrollLeft });
    }
    }, [externalScrollLeft]);

    const rowCount = msaData.length;
    const colCount = msaData[0]?.sequence.length || 0;
    const gridRef = useRef(null);
    const derivedTooltipPos = hoveredCol != null ? tooltipPos
                            : { x: -5, y: -20 }; // Default for linked highlight
    // sync label-list scroll with grid
    const onScroll = ({ scrollTop, scrollLeft }) => {
    listRef.current?.scrollTo(scrollTop);

    if (linkedTo != null && scrollLeft != null) {
      onSyncScroll(scrollLeft, id);
    }
  };

  // the Cell renderer checks for both hover and linked-panel highlight:
  const Cell = useCallback(({ columnIndex, rowIndex, style }) => {
    const char   = msaData[rowIndex].sequence[columnIndex];
    const baseBg = residueColors[char.toUpperCase()] || 'bg-white';
    const isHoverHighlight  = hoveredCol === columnIndex;
    // two-way link: if this panel is linked to the origin of the highlight
    const isLinkedHighlight = 
      highlightedSite === columnIndex &&
      linkedTo === highlightOrigin;

    return (
      <div
        style={style}
        className={`
          flex items-center justify-center
          ${baseBg}
          ${isHoverHighlight || isLinkedHighlight ? 'alignment-highlight' : ''}
        `}
        onMouseEnter={e => {
          setHoveredCol(columnIndex);
          onHighlight(columnIndex, id);
          const rect = containerRef.current.getBoundingClientRect();
          setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
        onMouseMove={e => {
          const rect = containerRef.current.getBoundingClientRect();
          setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
        onMouseLeave={() => {
          setHoveredCol(null);
          if (id === highlightOrigin) {onHighlight(null, id);}
        }}
        //title={`Pos ${columnIndex + 1}, ${char}`}
      >
        {char}
      </div>
    );
  }, [
    msaData, hoveredCol,
    highlightedSite, highlightOrigin,
    linkedTo, id, onHighlight
  ]);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col h-full border rounded bg-white"
      onMouseLeave={() => {
        setHoveredCol(null);
      if (id === highlightOrigin) {onHighlight(null, id);}
      }}
      onDoubleClick={() => onReupload(id)}
    >

    <div className="panel-drag-handle select-none font-bold text-center bg-gray-100 p-1 mb-2 cursor-move relative">
      MSA: {filename}
      <DuplicateButton onClick={() => onDuplicate(id)} />
      <RemoveButton onClick={() => onRemove(id)} />
      <LinkButton
        onClick={() => onLinkClick(id)}
        isLinked={isLinked}
        isLinkModeActive={isLinkModeActive}/>
    </div>

  {/* — Hover tooltip (only in the origin panel) — */}
  {hoveredCol != null && id === highlightOrigin && (
    <div
      className="fixed px-1 py-0.5 text-xs bg-gray-200 rounded pointer-events-none z-50"
      style={{
        top:  tooltipPos.y + 24,
        left: tooltipPos.x + 14
      }}>
      Site {hoveredCol + 1}
    </div>
  )}

  {/* — Persistent linked tooltip (only in the linked panel) — */}
  {highlightedSite != null
    && linkedTo === highlightOrigin
    && id !== highlightOrigin && (
    <div
      className="fixed px-1 py-0.5 text-xs bg-gray-200 rounded pointer-events-none z-50"
      style={{
        top:  derivedTooltipPos.y + 24,  
        left: derivedTooltipPos.x + 14
      }}>
      Site {highlightedSite + 1}
    </div>
  )}

  {/* labels + virtualized grid */}
  <div
    ref={gridContainerRef}
    className="flex-1 flex overflow-hidden font-mono text-sm"
  >
    {/* sequence IDs */}
    <List
      ref={listRef}
      height={dims.height}
      width={LABEL_WIDTH*1.9}
      itemCount={rowCount}
      itemSize={CELL_SIZE}
    >
      {({ index, style }) => {
      const rawId = msaData[index].id.replace(/\s+/g, ' ').trim();
      const shortId = rawId.length > 10 ? rawId.slice(0, 8) + '..' : rawId;
      return (
        <div
          style={style}
          className="flex items-center pr-2 pl-2 text-right font-bold truncate"
          title={rawId}
        >
          {shortId}
        </div>
      );
      }}
    </List>
    {/* the alignment */}
      <Grid
      ref={gridRef}
        columnCount={colCount}
        columnWidth={CELL_SIZE}
        height={dims.height}
        rowCount={rowCount}
        rowHeight={CELL_SIZE}
        width={Math.max(dims.width - LABEL_WIDTH, 0)}
        onScroll={onScroll}
      >
        {Cell}
      </Grid>
  </div>
  </div>
  );
});

const TreePanel = React.memo(function TreePanel({ id, data, onRemove, onReupload,onDuplicate, onSelectTip }) {
  const { data: newick, filename, isNhx } = data;

  return (
    <div
      className="border rounded overflow-hidden h-full flex flex-col bg-white"
      onDoubleClick={() => onReupload(id)}
    >
      <div className="panel-drag-handle select-none font-bold text-center bg-gray-100 p-1 mb-2 cursor-move relative">
        Tree: {filename}
        <DuplicateButton onClick={() => onDuplicate(id)} />
        <RemoveButton onClick={() => onRemove(id)} />
      </div>
      <div className="flex-1 overflow-auto flex items-center justify-center">
        <PhyloTreeViewer newick={newick} isNhx={isNhx} onSelectTip={onSelectTip} />
      </div>
    </div>
  );
});


const HistogramPanel = React.memo(function HistogramPanel({ id, data, onRemove, onReupload,onDuplicate,
  onLinkClick, isLinkModeActive, isLinked, linkedTo,
  highlightedSite, highlightOrigin, onHighlight }) {
  const { filename } = data;
  const isTabular = !Array.isArray(data.data);
  const [selectedCol, setSelectedCol] = useState(
    isTabular ? data.data.headers.find(h => typeof data.data.rows[0][h] === 'number') : null
  );
  const numericCols = isTabular
    ? data.data.headers.filter(h =>
        data.data.rows.every(row => typeof row[h] === 'number')
      )
    : [];
  const valuesToPlot = isTabular && selectedCol
    ? data.data.rows.map(row => row[selectedCol])
    : !isTabular
      ? data.data
      : [];

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
// pass highlight props into Histogram
  return (
    <div
      className="border rounded overflow-hidden h-full flex flex-col bg-white"
      onDoubleClick={() => onReupload(id)}
    >
      <div className="panel-drag-handle select-none font-bold text-center bg-gray-100 p-1 mb-2 cursor-move relative">
        Data: {filename}
      <DuplicateButton onClick={() => onDuplicate(id)} />
      <RemoveButton onClick={() => onRemove(id)} />
      <LinkButton
        onClick={() => onLinkClick(id)}
        isLinked={isLinked}
        isLinkModeActive={isLinkModeActive}/>
      </div>
      <div className="p-2">
        {isTabular && (
          <>
            <label className="mr-2">Select column:</label>
            <select
              value={selectedCol}
              onChange={e => setSelectedCol(e.target.value)}
              className="border rounded p-1"
            >
              {numericCols.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </>
        )}
      </div>
      <div ref={chartContainerRef} className="flex flex-col h-full px-2 pb-2 overflow-hidden">
  <Histogram
    values={valuesToPlot}
    panelId={id}
    onHighlight={onHighlight}
    highlightedSite={highlightedSite}
    highlightOrigin={highlightOrigin}
    linkedTo={linkedTo}
    height={height}
  />
</div>
    </div>
  );
});


function App() {
  const [panels, setPanels] = useState([]);
  const [layout, setLayout] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [linkMode, setLinkMode] = useState(null);
  const [panelLinks, setPanelLinks] = useState({}); // { [id]: linkedId }
  const [scrollSyncEnabled, setScrollSyncEnabled] = useState(true);
  const [scrollPositions, setScrollPositions] = useState({});
  const [highlightSite, setHighlightSite] = useState(null);
  const [highlightOrigin, setHighlightOrigin] = useState(null);
  const [panelData, setPanelData] = useState({});
  const fileInputRef = useRef(null);
  const pendingTypeRef = useRef(null);
  const pendingPanelRef = useRef(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) setDarkMode(saved === 'true');
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const onSyncScroll = (scrollLeft, originId) => {
    const targetId = panelLinks[originId];
    if (targetId) {
      setScrollPositions(prev => ({
        ...prev,
        [targetId]: scrollLeft
      }));
    }
  };

  const duplicatePanel = (id) => {
  const panel = panels.find(p => p.i === id);
  const data = panelData[id];
  if (!panel || !data) return;

  const newId = `${panel.type}-${Date.now()}`;
  const newPanel = { ...panel, i: newId };

  // Copy panel layout
  const originalLayout = layout.find(l => l.i === id);
  const newLayout = {
    ...originalLayout,
    i: newId,
    x: (originalLayout.x + 1) % 12, // offset to prevent overlap
    y: originalLayout.y + 1
  };

  setPanels(prev => [...prev.filter(p => p.i !== '__footer'), newPanel, { i: '__footer', type: 'footer' }]);
  setLayout(prev => {
    const withoutFooter = prev.filter(l => l.i !== '__footer');
    const footer = prev.find(l => l.i === '__footer');
    return [...withoutFooter, newLayout, footer];
  });
  setPanelData(prev => ({ ...prev, [newId]: JSON.parse(JSON.stringify(data)) }));
};

  const handleLinkClick = (id) => {
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
            if (copy[a]) { delete copy[a]; delete copy[copy[a]]; }
            if (copy[b]) { delete copy[b]; delete copy[copy[b]]; }
            copy[a] = b;
            copy[b] = a;
            return copy;
          });
        }
        setLinkMode(null);
      }
    }
    // clear any existing highlights
    setHighlightSite(null);
    setHighlightOrigin(null);
  };

const CELL_SIZE = 24;

const handleHighlight = (site, originId) => {
  setHighlightSite(site);
  setHighlightOrigin(originId);

  const targetId = panelLinks[originId];
  if (!targetId || site == null) return;

  const sourcePanel = panels.find(p => p.i === originId);
  const targetPanel = panels.find(p => p.i === targetId);
  if (!sourcePanel || !targetPanel) return;

  if (sourcePanel.type === 'histogram' && targetPanel.type === 'alignment') {
    setScrollPositions(prev => ({
      ...prev,
      [targetId]: site * CELL_SIZE
    }));
  }
};


  // Trigger upload or reupload
  const triggerUpload = (type, panelId = null) => {
    pendingTypeRef.current = type;
    pendingPanelRef.current = panelId;
    if (fileInputRef.current) fileInputRef.current.click();
  };

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
      parse(text);
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
        const values = text.trim().split(/\s+/).map(Number).filter(n => !isNaN(n));
        panelPayload = { data: values, filename };
      }
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
      const newPanelLayout = { i: id, x: (layoutWithoutFooter.length * 4) % 12, y: maxY, w: 4, h: 20, minW: 3, minH: 5 };
      setLayout([...layoutWithoutFooter, newPanelLayout, { i: '__footer', x: 0, y: maxY + 1, w: 12, h: 2, static: true }]);
    }

    // Reset input
    pendingTypeRef.current = null;
    pendingPanelRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const removePanel = (id) => {
    if (id === '__footer') return;
    setPanels(p => p.filter(panel => panel.i !== id));
    setPanelData(d => { const c = { ...d }; delete c[id]; return c; });
    setLayout(l => l.filter(entry => entry.i !== id));
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-white text-black dark:bg-gray-900 dark:text-black">
      <div className="p-4 flex justify-between items-center">
        <div className="flex items-center justify-start w-full">
          {'MSEAVIEW'.split('').map((char, i) => (
            <span key={i} className={`w-16 h-16 flex items-center justify-center text-5xl font-bold leading-none ${residueColors[char]} `}>{char}</span>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => triggerUpload('alignment')} className="bg-green-200 text-black px-4 py-2 rounded hover:bg-green-400">
            Upload MSA (.fasta)
          </button>
          <button onClick={() => triggerUpload('tree')} className="bg-blue-200 text-black px-4 py-2 rounded hover:bg-blue-400">
            Upload Tree (.nwk/.nhx)
          </button>
          <button onClick={() => triggerUpload('histogram')} className="bg-orange-200 text-black px-4 py-2 rounded hover:bg-orange-400">
            Upload data (.txt/.tsv/.csv)
          </button>
          <a
            href="https://github.com/lucanest/mseaview"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-2 py-1 rounded hover:bg-gray-200"
            title="View on GitHub"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 24 24"
              className="w-7 h-7 text-gray-800 dark:text-gray-200"
              aria-hidden="true"
            >
              <path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.867 8.184 6.839 9.504.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.004.07 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.339-2.221-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.254-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.025A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.295 2.748-1.025 2.748-1.025.546 1.378.202 2.396.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.847-2.337 4.695-4.566 4.944.36.31.68.921.68 1.857 0 1.34-.012 2.421-.012 2.751 0 .267.18.578.688.48C19.135 20.2 22 16.447 22 12.021 22 6.484 17.523 2 12 2z"/>
            </svg>
          </a>
          {/*<button onClick={() => setDarkMode(prev => !prev)} className="bg-gray-800 text-white px-2 py-1 rounded hover:bg-gray-700 dark:bg-white dark:text-black dark:hover:bg-gray-300">
            {darkMode ? '☀︎' : '☾'}
          </button>*/}
          <input ref={fileInputRef} type="file" accept=".fasta,.nwk,.nhx,.txt,.tsv,.csv,.fas" onChange={handleFileUpload} style={{ display: 'none' }} />
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
      <div key="__footer" className="flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm" />
    );
  }
  const data = panelData[panel.i];
  if (!data) return null;

  const commonProps = {
    id: panel.i,
    data,
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
  };

  return (
    <div key={panel.i}>
      {panel.type === 'alignment' ? (
<AlignmentPanel
  {...commonProps}
  selectedId={selectedId}
  onSyncScroll={onSyncScroll}
  externalScrollLeft={scrollPositions[panel.i]}
/>
      ) : panel.type === 'tree' ? (
        <TreePanel
          {...commonProps}
          onSelectTip={setSelectedId}
        />
      ) : (
        <HistogramPanel
          {...commonProps}
        />
      )}
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
