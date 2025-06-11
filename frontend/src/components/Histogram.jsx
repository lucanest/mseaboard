
/* Histogram.jsx */
import React, { useRef, useEffect, useState } from 'react';
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



function Histogram({ values, panelId, onHighlight, highlightedSite, highlightOrigin, linkedTo, height }) {
  const data = values.map((value, index) => ({ site: index + 1, value }));
  const min = Math.min(...values), max = Math.max(...values);
  const unique = Array.from(new Set(values));
  const discrete = isDiscrete(values) && unique.length <= colorPalette.length;
  const cmap = discrete ? Object.fromEntries(unique.map((v, i) => [v, colorPalette[i]])) : null;

  const getColor = v => {
    if (discrete) return cmap[v];
    const t = Math.sqrt((v - min) / (max - min || 1));
    return `rgb(255,${Math.round(255 * (1 - t))},${Math.round(255 * (1 - t))})`;
  };


  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-300 rounded shadow-md text-sm">
          <p className="font-medium">{`${label}`}</p>
          <p className="text-blue-600">{`value : ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

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
  }, [highlightedSite, values]);

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
          <BarChart data={data} margin={{ bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="site"
              label={{ value: 'Index', position: 'insideBottom', offset: 10 }}
              height={50}
              interval={Math.max(0, Math.floor(Math.sqrt(values.length)) - 1)}
            />
            <YAxis label={{ value: 'Value', angle: -90, position: 'insideLeft' }} />
            {panelId === highlightOrigin && (
  <Tooltip content={<CustomTooltip />} />
)}
            <Bar dataKey="value" isAnimationActive={false}>
              {data.map((entry, index) => {
                const isCurrentLinkedHighlight =
                  highlightedSite === index &&
                  linkedTo === highlightOrigin &&
                  panelId !== highlightOrigin;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={getColor(entry.value)}
                    onMouseEnter={() => onHighlight(index, panelId)}
                    onMouseLeave={() => {
  if (highlightedSite !== null && panelId === highlightOrigin) {
    onHighlight(null, panelId);
  }
}}
                    className={isCurrentLinkedHighlight ? 'histogram-highlight' : ''}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {highlightedSite !== null && linkedTo === highlightOrigin && panelId !== highlightOrigin && tooltipPos && (
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
            <p className="font-medium">{`${highlightedSite+1}`}</p>
            <p className="text-blue-600">{`value : ${values[highlightedSite]}`}</p>
          </div>
        )}
      </div>
    </>
  );
}


export default Histogram;
