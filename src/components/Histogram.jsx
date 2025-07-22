
/* Histogram.jsx */
import React, { useRef, useEffect, useState, useMemo, useCallback} from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const colorPalette = [
  '#c1dcc7', '#4daf4a', '#377eb8', '#984ea3', '#ff7f00',
  '#ffff33', '#a65628', '#f781bf', '#999999', '#66c2a5'
];
function isDiscrete(values) {
  return values.every(v => Number.isInteger(v));
}



function Histogram({ values, xValues, panelId, onHighlight, highlightedSite, highlightOrigin, linkedTo, height, syncId }) {
// console.log("Histogram", panelId, "syncId =", syncId);
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
  return `rgb(255,${Math.round(255 * (1 - t))},${Math.round(255 * (1 - t))})`;
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
      // Find the index of the hovered site in your data array
      const hoveredIndex = data.findIndex(d => d.site === hoveredSite);
      if (hoveredIndex !== -1) {
        onHighlight(hoveredIndex, panelId); // Set highlighted site for linked panels
      }
      console.log('Hovered site:', hoveredSite);
    }
  }, [active, payload]);
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border border-gray-300 rounded shadow-md text-sm">
        <p className="font-medium">{`${label}`}</p>
        <p className="text-blue-600">{`value : ${payload[0].value}`}</p>
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
      linkedTo === highlightOrigin &&
      panelId !== highlightOrigin;

    return (
      <Cell
        key={`cell-${index}`}
        fill={getColor(entry.value)}
        className={isCurrentLinkedHighlight ? 'histogram-highlight' : ''}
      />
    );
  });
}, [data, getColor, highlightedSite, linkedTo, highlightOrigin, panelId, onHighlight]);
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
              top: tooltipPos.top - 0, // Adjust as needed
              transform: 'translateX(10%)',
              pointerEvents: 'none',
              zIndex: 10
            }}
            className="bg-white p-2 border border-gray-300 rounded shadow-md text-sm"
          >
            <p className="font-medium">{`${getXLabel(highlightedSite)}`}</p>
            <p className="text-blue-600">{`value : ${values[highlightedSite]}`}</p>
          </div>
        )}
      </div>
    </>
  );
}

export default React.memo(Histogram);
