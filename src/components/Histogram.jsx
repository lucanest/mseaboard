// Histogram.jsx
import React, {
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  useMemo,
  useCallback,
} from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const colorPalette = [
  '#BFDBFE', '#99F6E4', '#FECACA', '#DCFCE7', '#D8B4FE',
  '#BBF7D0', '#E5E7EB', '#f781bf', '#FEF08A', '#FBCFE8'
];

const isDiscrete = (values) => values.every((v) => Number.isInteger(v));

/** Memoized tooltip component */
const HistogramTooltip = React.memo(function HistogramTooltip({
  active,
  payload,
  label,
  data,
  onHighlight,
  panelId,
  setIsRechartsTooltipActive,
}) {
  useEffect(() => {
    setIsRechartsTooltipActive(active);
    if (active && payload && payload.length && data && data.length) {
      const hoveredSite = payload[0]?.payload?.site;
      if (hoveredSite !== undefined) {
        const hoveredIndex = data.findIndex((d) => d.site === hoveredSite);
        if (hoveredIndex !== -1) {
          onHighlight(hoveredIndex, panelId);
        }
      }
    }
  }, [active, payload, data, onHighlight, panelId, setIsRechartsTooltipActive]);

  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border border-gray-300 rounded shadow-md text-sm">
        <p className="font-medium">{`${label}`}</p>
        <p className="text-blue-600">{`Value : ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
});

function Histogram({
  values,
  xValues,
  panelId,
  onHighlight,
  highlightedSite,
  highlightOrigin,
  linkedTo,
  height,
  syncId,
  setPanelData,
  highlightedSites,
}) {
  // Map input arrays into chart data once.
  const data = useMemo(() => {
    const n = values.length;
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      out[i] = { site: xValues ? xValues[i] : i + 1, value: values[i] };
    }
    return out;
  }, [values, xValues]);

  // Fast min/max (single pass)
  const [min, max] = useMemo(() => {
    if (values.length === 0) return [0, 0];
    let mn = values[0], mx = values[0];
    for (let i = 1; i < values.length; i++) {
      const v = values[i];
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    return [mn, mx];
  }, [values]);

  // Discrete logic + palette mapping
  const unique = useMemo(() => Array.from(new Set(values)), [values]);
  const discrete = useMemo(
    () => isDiscrete(values) && unique.length <= colorPalette.length,
    [values, unique.length]
  );
  const cmap = useMemo(() => {
    if (!discrete) return null;
    const obj = {};
    for (let i = 0; i < unique.length; i++) {
      obj[unique[i]] = colorPalette[i];
    }
    return obj;
  }, [discrete, unique]);

  const [isRechartsTooltipActive, setIsRechartsTooltipActive] = useState(false);

  // Color function
  const getColor = useCallback(
    (v) => {
      if (discrete) return cmap[v];
      // Continuous gradient from a custom blue (#60A5FA) to white
      const baseR = 96, baseG = 165, baseB = 250;
      const denom = max - min || 1;
      const t = Math.sqrt((v - min) / denom);
      const r = baseR + Math.round((255 - baseR) * (1 - t));
      const g = baseG + Math.round((255 - baseG) * (1 - t));
      const b = baseB + Math.round((255 - baseB) * (1 - t));
      return `rgb(${r},${g},${b})`;
    },
    [discrete, cmap, min, max]
  );

  const getXLabel = useCallback(
    (idx) => (xValues ? xValues[idx] : idx + 1),
    [xValues]
  );

  // Membership check for persistent highlights
  const highlightedSet = useMemo(
    () => new Set(highlightedSites || []),
    [highlightedSites]
  );

  // Precompute per-bar visual attrs in one pass
  const barVisuals = useMemo(() => {
    const n = data.length;
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      const isCurrentLinkedHighlight =
        highlightedSite === i &&
        (linkedTo === highlightOrigin || panelId === highlightOrigin);

      const isPersistentHighlight = highlightedSet.has(i);

      out[i] = {
        fill: getColor(data[i].value),
        stroke: isCurrentLinkedHighlight
          ? 'black'
          : isPersistentHighlight
          ? '#cc0066'
          : undefined,
        strokeWidth:
          isCurrentLinkedHighlight || isPersistentHighlight ? 2 : 0,
      };
    }
    return out;
  }, [
    data,
    getColor,
    highlightedSite,
    linkedTo,
    highlightOrigin,
    panelId,
    highlightedSet,
  ]);

  // Tooltip positioning for mirrored tooltip on linked charts
  const chartRef = useRef(null);
  const [tooltipPos, setTooltipPos] = useState(null);
  const rafRef = useRef(0);

  const measureTooltip = useCallback(() => {
    if (highlightedSite === null || !chartRef.current) {
      setTooltipPos(null);
      return;
    }
    const chartEl = chartRef.current;
    const bars = chartEl.querySelectorAll('.recharts-bar-rectangle');
    const bar = bars[highlightedSite];
    if (bar) {
      const rect = bar.getBoundingClientRect();
      const containerRect = chartEl.getBoundingClientRect();
      setTooltipPos({
        left: rect.left - containerRect.left + rect.width / 2,
        top: rect.top - containerRect.top,
      });
    } else {
      setTooltipPos(null);
    }
  }, [highlightedSite]);

  // Use layout effect for precise measurement; throttle to rAF
  useLayoutEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(measureTooltip);
    return () => cancelAnimationFrame(rafRef.current);
  }, [measureTooltip, values, xValues]);

  // Single Bar-level click handler
  const handleBarClick = useCallback(
    (_data, index) => {
      setPanelData((prev) => {
        const current = prev[panelId] || {};
        const currentHighlighted = current.highlightedSites || [];
        const isAlready = currentHighlighted.includes(index);
        const newHighlighted = isAlready
          ? currentHighlighted.filter((i) => i !== index)
          : [...currentHighlighted, index];
        return {
          ...prev,
          [panelId]: {
            ...current,
            highlightedSites: newHighlighted,
          },
        };
      });
    },
    [setPanelData, panelId]
  );

  // X-axis tick interval calculation (memoized)
  const xInterval = useMemo(() => {
    return Math.max(0, Math.floor(Math.sqrt(values.length)) - 1);
  }, [values.length]);

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
          <BarChart data={data} margin={{ bottom: 30 }} syncId={syncId}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="site"
              label={{
                value: 'Index',
                position: 'insideBottom',
                offset: 10,
              }}
              height={50}
              interval={xInterval}
            />
            <YAxis
              label={{ value: 'Value', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              content={
                <HistogramTooltip
                  data={data}
                  onHighlight={onHighlight}
                  panelId={panelId}
                  setIsRechartsTooltipActive={setIsRechartsTooltipActive}
                />
              }
            />
            <Bar
              dataKey="value"
              isAnimationActive={false}
              minPointSize={1}
              onClick={handleBarClick}
            >
              {barVisuals.map((v, i) => (
                <Cell
                  key={i}
                  fill={v.fill}
                  stroke={v.stroke}
                  strokeWidth={v.strokeWidth}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {highlightedSite !== null &&
          linkedTo === highlightOrigin &&
          panelId !== highlightOrigin &&
          tooltipPos &&
          !isRechartsTooltipActive && (
            <div
              style={{
                position: 'absolute',
                left: tooltipPos.left,
                top: tooltipPos.top,
                transform: 'translateX(10%)',
                pointerEvents: 'none',
                zIndex: 10,
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

function areEqual(prev, next) {
  return (
    prev.values === next.values &&
    prev.xValues === next.xValues &&
    prev.panelId === next.panelId &&
    prev.onHighlight === next.onHighlight &&
    prev.highlightedSite === next.highlightedSite &&
    prev.highlightOrigin === next.highlightOrigin &&
    prev.linkedTo === next.linkedTo &&
    prev.height === next.height &&
    prev.syncId === next.syncId &&
    prev.setPanelData === next.setPanelData &&
    prev.highlightedSites === next.highlightedSites
  );
}

export default React.memo(Histogram, areEqual);
