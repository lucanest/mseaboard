// Histogram.jsx
import React, { useRef, useEffect, useState, useMemo, useCallback} from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const colorPalette = [
  '#BFDBFE', '#99F6E4', '#FECACA', '#DCFCE7', '#D8B4FE',
  '#BBF7D0', '#E5E7EB', '#f781bf', '#FEF08A', '#FBCFE8'
];
function isDiscrete(values) {
  return values.every(v => Number.isInteger(v));
}

function Histogram({ values, xValues, panelId, onHighlight, highlightedSite, highlightOrigin, linkedTo, height, syncId,  setPanelData,
  highlightedSites}) {

// Use xValues if provided, otherwise fallback to index
const data = useMemo(() => {
  return values.map((value, index) => ({
    site: xValues ? xValues[index] : index + 1,
    value
  }));
}, [values, xValues]);
const [min, max] = useMemo(() => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return [min, max];
}, [values]);
const unique = useMemo(() => Array.from(new Set(values)), [values]);
const discrete = useMemo(() => isDiscrete(values) && unique.length <= colorPalette.length, [unique]);
const cmap = useMemo(() => {
  return discrete ? Object.fromEntries(unique.map((v, i) => [v, colorPalette[i]])) : null;
}, [discrete, unique]);
const [isRechartsTooltipActive, setIsRechartsTooltipActive] = useState(false);
const getColor = useCallback((v) => {
  if (discrete) return cmap[v];
  const t = Math.sqrt((v - min) / (max - min || 1));
  
  
  // Convert #60A5FA to RGB: R=96, G=165, B=250
  const baseR = 96;
  const baseG = 165;
  const baseB = 250;
  
  // Create gradient from your custom color to white
  const r = baseR + Math.round((255 - baseR) * (1-t));
  const g = baseG + Math.round((255 - baseG) * (1-t));
  const b = baseB + Math.round((255 - baseB) * (1-t));
  
  return `rgb(${r},${g},${b})`;
}, [discrete, cmap, min, max]);

// Find the x label for the highlighted bar
const getXLabel = useCallback(
  (idx) => (xValues ? xValues[idx] : idx + 1),
  [xValues]
);

const CustomTooltip = useCallback(({ active, payload, label}) => {
  useEffect(() => {
    setIsRechartsTooltipActive(active);
    if (active && payload && payload.length) {
const hoveredSite = payload[0].payload.site;
      // Find the index of the hovered site in the data array
      const hoveredIndex = data.findIndex(d => d.site === hoveredSite);
      if (hoveredIndex !== -1) {
        onHighlight(hoveredIndex, panelId); // Set highlighted site for linked panels
      }
      // console.log('Hovered site:', hoveredSite);
    }
  }, [active, payload]);
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border border-gray-300 rounded shadow-md text-sm">
        <p className="font-medium">{`${label}`}</p>
        <p className="text-blue-600">{`Value : ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
}, [data, onHighlight, panelId]);

  // Tooltip position state
  const chartRef = useRef(null);
  const [tooltipPos, setTooltipPos] = useState(null);

  useEffect(() => {
    if (highlightedSite !== null && chartRef.current) {
      const chartEl = chartRef.current;
      const bars = chartEl.querySelectorAll('.recharts-bar-rectangle');
      const bar = bars[highlightedSite];
      if (bar) {
        const rect = bar.getBoundingClientRect();
        const containerRect = chartEl.getBoundingClientRect();
        setTooltipPos({
          left: rect.left - containerRect.left + rect.width / 2,
          top: rect.top - containerRect.top
        });
      }
    } else {
      setTooltipPos(null);
    }
  }, [highlightedSite, values, xValues]);

const barCells = useMemo(() => {
  return data.map((entry, index) => {
const isCurrentLinkedHighlight =
  highlightedSite === index &&
  (linkedTo === highlightOrigin || panelId === highlightOrigin);
const isPersistentHighlight = highlightedSites.includes(index); 
    return (
      <Cell
        key={`cell-${index}`}
        fill={getColor(entry.value)}
stroke={isCurrentLinkedHighlight ? 'black' : (isPersistentHighlight ? '#cc0066' : undefined)}
strokeWidth={isCurrentLinkedHighlight || isPersistentHighlight ? 2 : 0}
onClick={() => {
    setPanelData(prev => {
      const current = prev[panelId] || {};
      const currentHighlightedSites = current.highlightedSites || [];
      const isAlready = currentHighlightedSites.includes(index);
      const  newhighlightedSites = isAlready
        ? currentHighlightedSites.filter(i => i !== index)
        : [...currentHighlightedSites, index];
      return {
        ...prev,
        [panelId]: {
          ...current,
          highlightedSites: newhighlightedSites
        }
      };
    });
  }}
      />
    );
  });
}, [data, getColor, highlightedSite, linkedTo, highlightOrigin, panelId, onHighlight,highlightedSites, setPanelData]);
  return (
    <>
      {discrete && (
        <div className="flex flex-wrap items-center mb-2 space-x-4">
          {unique.map((v) => (
            <div key={v} className="flex items-center space-x-1">
              <span
                className="inline-block w-4 h-4 rounded"
                style={{ background: cmap[v], border: '1px solid #ccc' }}
              />
              <span className="text-xs">{v}</span>
            </div>
          ))}
        </div>
      )}

      <div
        ref={chartRef}
        style={{ position: 'relative', height }}
        onMouseLeave={() => {
          if (panelId === highlightOrigin) {
            onHighlight(null, panelId);
          }
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ bottom: 30 } } syncId={syncId}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="site"
              label={{
                value: "Index",
                position: "insideBottom",
                offset: 10
              }}
              height={50}
              interval={Math.max(0, Math.floor(Math.sqrt(values.length)) - 1)}
            />
            <YAxis label={{ value: 'Value', angle: -90, position: 'insideLeft' }} />
<Tooltip content={<CustomTooltip />} />
<Bar dataKey="value" isAnimationActive={false} minPointSize={1}>
  {barCells}
</Bar>
          </BarChart>
        </ResponsiveContainer>

        {highlightedSite !== null && linkedTo === highlightOrigin && panelId !== highlightOrigin && tooltipPos &&
  !isRechartsTooltipActive && (
          <div
            style={{
              position: 'absolute',
              left: tooltipPos.left,
              top: tooltipPos.top - 0,
              transform: 'translateX(10%)',
              pointerEvents: 'none',
              zIndex: 10
            }}
            className="bg-white p-2 border border-gray-300 rounded shadow-md text-sm"
          >
            <p className="font-medium">{`${getXLabel(highlightedSite)}`}</p>
            <p className="text-blue-600">{`Value : ${values[highlightedSite]}`}</p>
          </div>
        )}
      </div>
    </>
  );
}

export default React.memo(Histogram);
