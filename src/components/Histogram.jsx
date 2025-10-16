// Histogram.jsx
import React, {
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { scaleLinear, scaleBand } from '@visx/scale';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { Bar as VisxBar } from '@visx/shape';
import { FixedSizeList as List } from 'react-window';
import { colorPalette } from '../constants/colors.js';

const isNumerical = (values) => {
  if (!values || values.length === 0) return true;
  return values.every(v => typeof v === 'number' || !isNaN(Number(v)));
};

const isDiscrete = (values) => values.every((v) => Number.isInteger(v));

const LEFT_MARGIN = 40;
const RIGHT_MARGIN = 6;
const TOP_MARGIN = 6;
const BOTTOM_MARGIN_NO_LEGEND = 40;
const BOTTOM_MARGIN_WITH_LEGEND = 80;

const EPSILON = 1e-9; // small tolerance value

const SCROLL_THRESHOLD = 400;
const BAR_MIN_WIDTH_PX = 4;
const GAP_PX = 2;

function Histogram({
  values,
  xValues,
  panelId,
  onHighlight,
  highlightedSite,
  highlightOrigin,
  linkedTo,
  height,
  setPanelData,
  persistentHighlights,
  yLogActive = false,
  indexingMode = '1-based',
}) {
  
  const xValuesAreNumerical = useMemo(() => isNumerical(xValues), [xValues]);
  
  const data = useMemo(() => {
    const n = values.length;
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      out[i] = { 
        site: xValues ? xValues[i] : i + 1, 
        value: values[i],
        index: i 
      };
    }
    return out;
  }, [values, xValues]);

  const transformY = useCallback(
    (v) => {
      if (!yLogActive) return v;
      if (v === 0) return 0;
      return Math.log10(Math.abs(v));
    },
    [yLogActive]
  );

  const [min, max] = useMemo(() => {
    if (values.length === 0) return [0, 0];
    let mn = transformY(values[0]), mx = transformY(values[0]);
    for (let i = 1; i < values.length; i++) {
      const tv = transformY(values[i]);
      if (tv < mn) mn = tv;
      if (tv > mx) mx = tv;
    }
    return [mn, mx];
  }, [values, transformY]);

  const unique = useMemo(() => Array.from(new Set(values)), [values]);
  const discrete = useMemo(
    () => isDiscrete(values) && unique.length <= colorPalette.length,
    [values, unique.length]
  );

  const BOTTOM_MARGIN = discrete ? BOTTOM_MARGIN_WITH_LEGEND : BOTTOM_MARGIN_NO_LEGEND;
  const cmap = useMemo(() => {
    if (!discrete) return null;
    const obj = {};
    for (let i = 0; i < unique.length; i++) obj[unique[i]] = colorPalette[i];
    return obj;
  }, [discrete, unique]);

  const highlightedSet = useMemo(
    () => new Set(persistentHighlights || []),
    [persistentHighlights]
  );

  const mappedHighlightedIndices = useMemo(() => {
    // Determine if this highlight event is relevant to this panel.
    const isLinkedHighlight =
      highlightedSite != null &&
      Array.isArray(linkedTo) &&
      linkedTo.includes(highlightOrigin) &&
      panelId !== highlightOrigin;

    // If it's not a relevant event, or we have no data, do nothing.
    if (!isLinkedHighlight || !xValues) {
      return [];
    }

    // For numerical x-values: use the indexing mode logic
    if (xValuesAreNumerical) {
      const siteFromMsa = highlightedSite;
      const valueToFind = indexingMode === '1-based' ? siteFromMsa + 1 : siteFromMsa;

      const indices = [];
      for (let i = 0; i < xValues.length; i++) {
        if (Math.abs(Number(xValues[i]) - valueToFind) < EPSILON) {
          indices.push(i);
        }
      }
      return indices;
    } 
    // For categorical x-values (like leaf names): direct string comparison
    else {
      // highlightedSite could be a string (leaf name) or index
      const searchValue = typeof highlightedSite === 'string' 
        ? highlightedSite 
        : xValues[highlightedSite]; // fallback to index lookup
      
      const indices = [];
      for (let i = 0; i < xValues.length; i++) {
        if (xValues[i] === searchValue) {
          indices.push(i);
        }
      }
      return indices;
    }
  }, [
    highlightedSite, 
    highlightOrigin, 
    linkedTo, 
    panelId, 
    xValues, 
    indexingMode, 
    xValuesAreNumerical
  ]);

  // Set for efficient lookups inside the barVisuals loop.
  const mappedHighlightedIndicesSet = useMemo(
    () => new Set(mappedHighlightedIndices),
    [mappedHighlightedIndices]
  );

  const getColor = useCallback(
    (v) => {
      if (discrete) return cmap[v];
      const baseR = 96, baseG = 165, baseB = 250;
      const denom = max - min || 1;
      const t = Math.sqrt((v - min) / denom);
      const r = baseR + Math.round((255 - baseR) * 3*(1 - t)/4);
      const g = baseG + Math.round((255 - baseG) * 3*(1 - t)/4);
      const b = baseB + Math.round((255 - baseB) * 3*(1 - t)/4);
      return `rgb(${r},${g},${b})`;
    },
    [discrete, cmap, min, max]
  );

  const getXLabel = useCallback(
    (idx) => (xValues ? xValues[idx] : idx),
    [xValues]
  );

  const needScroll = useMemo(
    () => values.length > SCROLL_THRESHOLD,
    [values.length]
  );

  const outerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(800);
  useLayoutEffect(() => {
    if (!outerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w) setContainerWidth(w);
    });
    ro.observe(outerRef.current);
    return () => ro.disconnect();
  }, []);

  const chartInnerHeight = Math.max(0, height - TOP_MARGIN - BOTTOM_MARGIN);
  const innerWidth = Math.max(0, containerWidth - LEFT_MARGIN - RIGHT_MARGIN);
  const yScale = useMemo(() => {
    return scaleLinear({
      domain: [Math.min(0, min), Math.max(0, max)],
      range: [chartInnerHeight, 0],
      nice: true,
    });
  }, [min, max, chartInnerHeight]);

  const xInterval = useMemo(() => {
    return 19;
  }, [values.length]);

  const [isLocalTooltipActive, setIsLocalTooltipActive] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollingToIndex, setScrollingToIndex] = useState(null);

  const listRef = useRef(null);
  const chartAreaRef = useRef(null);

  const itemSize = needScroll
    ? (BAR_MIN_WIDTH_PX + GAP_PX)
    : Math.max(1, innerWidth / Math.max(1, values.length));
  const barWidth = Math.max(1, itemSize - GAP_PX);

  const visibleWindow = useMemo(() => {
    const listWidth = innerWidth;
    const start = Math.max(0, Math.floor(scrollLeft / itemSize));
    const count = Math.max(1, Math.ceil(listWidth / itemSize));
    const end = Math.min(values.length - 1, start + count - 1);
    return { start, end, listWidth };
  }, [innerWidth, scrollLeft, itemSize, values.length]);

  const isIndexVisible = useCallback((index) => {
    if (index == null) return true;
    const listWidth = innerWidth;
    const viewStart = scrollLeft;
    const viewEnd = scrollLeft + listWidth;

    const barStart = index * itemSize;
    const barEnd = barStart + itemSize;

    return barStart < viewEnd && barEnd > viewStart;
  }, [innerWidth, scrollLeft, itemSize]);

  const scrollBarIntoView = useCallback((index) => {
    if (!needScroll || index == null || !listRef.current) return;

    if (isIndexVisible(index)) {
      setScrollingToIndex(null);
      return;
    }

    const listWidth = innerWidth;
    const contentWidth = values.length * itemSize;
    const targetCenter = index * itemSize + itemSize / 2;
    const bias = 0.35;
    const desiredLeft = targetCenter - listWidth * bias;
    const maxScroll = Math.max(0, contentWidth - listWidth);
    const nextScroll = Math.max(0, Math.min(maxScroll, desiredLeft));

    if (typeof listRef.current.scrollTo === 'function') {
      setScrollingToIndex(index);
      listRef.current.scrollTo(nextScroll);
    }
  }, [needScroll, isIndexVisible, innerWidth, values.length, itemSize]);

  useLayoutEffect(() => {
    const isLinkedTarget =
      mappedHighlightedIndices.length > 0 &&
      Array.isArray(linkedTo) &&
      linkedTo.includes(highlightOrigin) &&
      panelId !== highlightOrigin &&
      needScroll;

    if (!isLinkedTarget) return;

    const id = requestAnimationFrame(() => {
      const firstIndex = mappedHighlightedIndices[0];
      if (firstIndex != null) scrollBarIntoView(firstIndex);
    });
    return () => cancelAnimationFrame(id);
  }, [mappedHighlightedIndices, highlightOrigin, linkedTo, panelId, needScroll, scrollBarIntoView]);

  const handleBarClick = useCallback((index) => {
    setPanelData((prev) => {
      const current = prev[panelId] || {};
      const currentHighlighted = current.persistentHighlights || [];
      const isAlready = currentHighlighted.includes(index);
      const newHighlighted = isAlready
        ? currentHighlighted.filter((i) => i !== index)
        : [...currentHighlighted, index];
      return {
        ...prev,
        [panelId]: {
          ...current,
          persistentHighlights: newHighlighted,
        },
      };
    });
  }, [setPanelData, panelId]);

  const barVisuals = useMemo(() => {
    const n = data.length;
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      const isCurrentLinkedHighlight =
        mappedHighlightedIndicesSet.has(i) &&
        Array.isArray(linkedTo) &&
        linkedTo.includes(highlightOrigin) &&
        panelId !== highlightOrigin;

      const isLocalHover = isLocalTooltipActive && hoverIndex === i;
      const isPersistentHighlight = highlightedSet.has(i);

      out[i] = {
        fill: getColor(data[i].value),
        stroke:
          isCurrentLinkedHighlight || isLocalHover
            ? 'black'
            : isPersistentHighlight
            ? '#cc0066'
            : undefined,
        strokeWidth:
          isCurrentLinkedHighlight || isLocalHover || isPersistentHighlight ? 2 : 0,
      };
    }
    return out;
  }, [
    data,
    getColor,
    linkedTo,
    highlightOrigin,
    panelId,
    highlightedSet,
    isLocalTooltipActive,
    hoverIndex,
    mappedHighlightedIndicesSet,
  ]);

  const getTooltipPos = useCallback((index) => {
    if (index == null || index < 0 || index >= data.length) return null;

    const barLeftOffset = needScroll ? (itemSize - barWidth) / 2 : 0;
    const left =
      LEFT_MARGIN +
      (index * itemSize - (needScroll ? scrollLeft : 0)) +
      barLeftOffset +
      barWidth / 2;
    const y = yScale(transformY(data[index].value));
    const top = TOP_MARGIN + y;

    const tooltipWidth = 130;
    const tooltipHeight = 100;

    const spaceRight = containerWidth - left;
    const spaceBottom = height - top;

    const translateX = spaceRight < tooltipWidth ? '-120%' : '10%';
    const translateY = spaceBottom < tooltipHeight ? '-110%' : '10%';

    return {
      left,
      top,
      transform: `translate(${translateX}, ${translateY})`,
    };
  }, [containerWidth, height, itemSize, barWidth, needScroll, scrollLeft, yScale, data, LEFT_MARGIN]);

  const localTooltipPos = getTooltipPos(hoverIndex);

  const formatTooltip = useCallback((v) => {
    if (!yLogActive) return v.toLocaleString(undefined, { maximumFractionDigits: 5 });
    if (yLogActive && v === 0) return 'NaN';
    const tv = transformY(v);
    return tv.toLocaleString(undefined, { maximumFractionDigits: 5 });
  }, [yLogActive, transformY]);

  const shouldMirror =
    highlightedSite !== null &&
    Array.isArray(linkedTo) && linkedTo.includes(highlightOrigin) &&
    panelId !== highlightOrigin &&
    !isLocalTooltipActive;

  const handleMouseLeaveChart = useCallback(() => {
    setHoverIndex(null);
    setIsLocalTooltipActive(false);
    onHighlight(null, panelId);
  }, [onHighlight, panelId]);

  const handleAreaMouseMove = useCallback((e) => {
    const el = chartAreaRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const xIn = e.clientX - rect.left;
    const yIn = e.clientY - rect.top;
    const inYBand = yIn >= TOP_MARGIN && yIn <= TOP_MARGIN + chartInnerHeight;
    if (!inYBand) return;

    let idx;
    if (needScroll) {
      const xWithScroll = scrollLeft + xIn;
      idx = Math.max(0, Math.min(values.length - 1, Math.floor(xWithScroll / itemSize)));
    } else {
      const xScale = xValuesAreNumerical 
        ? scaleLinear({ domain: [0, values.length], range: [0, innerWidth] })
        : scaleBand({ domain: xValues, range: [0, innerWidth], padding: 0.1 });
      
      const iFloat = xValuesAreNumerical 
        ? xScale.invert(xIn)
        : Math.floor(xIn / (innerWidth / values.length));
      
      idx = Math.max(0, Math.min(values.length - 1, Math.floor(iFloat)));
    }

    const rawXValue = getXLabel(idx);
    
    // For linking: send either the index or the actual xValue
    // For categorical data, send the actual value (leaf name)
    // For numerical data, use the indexing mode logic
    let valueToSend = null;
    
    if (xValuesAreNumerical) {
      const numericXValue = Number(rawXValue);
      if (!isNaN(numericXValue)) {
        valueToSend = indexingMode === '1-based' ? numericXValue - 1 : numericXValue;
      }
    } else {
      // For categorical data, send the actual value (string)
      valueToSend = rawXValue;
    }
    
    setIsLocalTooltipActive(true);
    setHoverIndex(idx);
    onHighlight(valueToSend, panelId);

  }, [
    chartInnerHeight,
    needScroll,
    scrollLeft,
    itemSize,
    values.length,
    onHighlight,
    panelId,
    containerWidth,
    getXLabel,
    indexingMode,
    xValuesAreNumerical,
    xValues,
    innerWidth,
    TOP_MARGIN
  ]);

  const getColumnStyle = useCallback((index) => {
    if (index == null || index < 0 || index >= values.length) return { display: 'none' };

    const leftWithinChart =
      (needScroll ? (index * itemSize - scrollLeft) : (index * itemSize));

    return {
      position: 'absolute',
      left: leftWithinChart,
      top: TOP_MARGIN,
      width: itemSize,
      height: chartInnerHeight,
      background: 'rgba(0,0,0,0.1)',
      pointerEvents: 'none',
      zIndex: 10,
    };
  }, [needScroll, itemSize, scrollLeft, chartInnerHeight, values.length, TOP_MARGIN]);

  const SmallSVG = () => {
    const xScale = xValuesAreNumerical
      ? scaleLinear({ domain: [0, values.length], range: [0, innerWidth] })
      : scaleBand({ domain: xValues, range: [0, innerWidth], padding: 0.1 });

    const y0 = yScale(0);

    return (
      <svg width={innerWidth} height={height}>
        <g transform={`translate(0,${TOP_MARGIN})`}>
          <GridRows
            scale={yScale}
            width={innerWidth}
            stroke="#e5e7eb"
            numTicks={5}
          />
          {data.map((d, i) => {
            const v = d.value;
            const tv = transformY(v);
            const vis = barVisuals[i];
            
            // Calculate x position based on scale type
            const slotLeft = xValuesAreNumerical 
              ? xScale(i)
              : xScale(d.site);
            
            const x = xValuesAreNumerical 
              ? slotLeft + (itemSize - barWidth) / 2
              : slotLeft;
            
            const actualBarWidth = xValuesAreNumerical ? barWidth : xScale.bandwidth();
            const barTop = tv >= 0 ? yScale(tv) : y0;
            const barHeight = Math.abs(yScale(tv) - y0);

            return (
              <VisxBar
                key={i}
                x={x}
                y={barTop}
                width={actualBarWidth}
                height={barHeight}
                fill={vis.fill}
                stroke={vis.stroke}
                strokeWidth={vis.strokeWidth}
                onClick={() => handleBarClick(i)}
              />
            );
          })}
        </g>
      </svg>
    );
  };

  const Item = ({ index, style }) => {
    const v = data[index].value;
    const tv = transformY(v);
    const y0 = yScale(0);
    const barTop = tv >= 0 ? yScale(tv) : y0;
    const barHeight = Math.abs(yScale(tv) - y0);
    const vis = barVisuals[index];
    return (
      <div style={style}>
        <svg width={itemSize} height={height}>
          <g transform={`translate(0, ${TOP_MARGIN})`}>
            <VisxBar
              x={(itemSize - barWidth) / 2}
              y={barTop}
              width={barWidth}
              height={barHeight}
              fill={vis.fill}
              stroke={vis.stroke}
              strokeWidth={vis.strokeWidth}
              onClick={() => handleBarClick(index)}
              style={{ cursor: 'pointer' }}
            />
          </g>
        </svg>
      </div>
    );
  };

  const onListScroll = useCallback(({ scrollOffset, scrollUpdateWasRequested }) => {
    setScrollLeft(scrollOffset);
    if (scrollUpdateWasRequested && scrollingToIndex !== null) {
      setTimeout(() => setScrollingToIndex(null), 0);
    }
  }, [scrollingToIndex]);

  useLayoutEffect(() => {
    if (scrollingToIndex !== null && isIndexVisible(scrollingToIndex)) {
      setScrollingToIndex(null);
    }
  }, [scrollLeft, scrollingToIndex, isIndexVisible]);

  useEffect(() => {
    function handleDocumentMouseMove(e) {
      if (!outerRef.current) return;
      const rect = outerRef.current.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        setIsLocalTooltipActive(false);
        setHoverIndex(null);
      }
    }
    document.addEventListener('mousemove', handleDocumentMouseMove);
    return () => document.removeEventListener('mousemove', handleDocumentMouseMove);
  }, [onHighlight, panelId]);

  const Legend = () =>
    discrete ? (
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
    ) : null;

  return (
    <>
      <Legend />
      <div
        ref={outerRef}
        style={{ position: 'relative', height, overflow: 'visible' }}
        onMouseLeave={handleMouseLeaveChart}
        className="flex"
      >
        {/* Sticky Y-Axis */}
        <div
          style={{
            position: 'sticky',
            left: 0,
            zIndex: 10,
            background: 'transparent',
          }}
        >
          <svg width={LEFT_MARGIN} height={height}>
            <g transform={`translate(0, ${TOP_MARGIN})`}>
              <AxisLeft
                scale={yScale}
                left={LEFT_MARGIN} // Position axis line
                tickLabelProps={() => ({
                  dx: '-0.25em',
                  dy: '0.25em',
                  fontSize: 10,
                  textAnchor: 'end',
                })}
                numTicks={5}
              />
            </g>
          </svg>
        </div>

        {/* Main Chart Area */}
        <div style={{ flex: 1, position: 'relative' }}>
          <svg
            width={containerWidth} // This SVG is for elements that span the full width
            height={height}
            style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
          >
            <g transform={`translate(0,${TOP_MARGIN})`}>
              <GridRows
                scale={yScale}
                width={innerWidth}
                stroke="#e5e7eb"
                numTicks={5}
              />
              <AxisBottom
                top={chartInnerHeight}
                scale={xValuesAreNumerical
                  ? scaleLinear({
                      domain: needScroll
                        ? [visibleWindow.start, Math.max(visibleWindow.start + 1, visibleWindow.end)]
                        : [0, Math.max(0, values.length - 1)],
                      range: [0, needScroll
                        ? visibleWindow.listWidth
                        : Math.max(0, containerWidth - LEFT_MARGIN - RIGHT_MARGIN)],
                    })
                  : scaleBand({
                      domain: xValues,
                      range: [0, innerWidth],
                      padding: 0.1
                    })
                }
                tickValues={
                  needScroll && xValuesAreNumerical
                    ? Array.from(
                        { length: visibleWindow.end - visibleWindow.start + 1 },
                        (_, k) => k + visibleWindow.start
                      ).filter((i) => i % (xInterval + 1) === 0)
                    : xValuesAreNumerical
                    ? Array.from({ length: values.length }, (_, i) => i).filter(
                        (i) => i % (xInterval + 1) === 0
                      )
                    :  // For categorical, again only show a subset to avoid clutter
                      xValues.filter((_, i) => i % (xInterval + 1) === 0)
                      
                }
                tickFormat={(v) => {
                  if (xValuesAreNumerical) {
                    return `${getXLabel(Math.round(Number(v)))}`;
                  } else {
                    // For categorical data, show the actual value
                    return v;
                  }
                }}
                //label="Index"
                tickLabelProps={(value, index, ticks) => ({ 
                                fontSize: 10, 
                                dy: 6,
                                angle: 0,
                                textAnchor: xValuesAreNumerical
                                  ? index === 0
                                    ? 'start'
                                    : index === ticks.length - 1
                                    ? 'end'
                                    : 'middle'
                                  : 'left',
                              })}
              />
            </g>
          </svg>

          <div
            ref={chartAreaRef}
            style={{
              position: 'absolute',
              left: 0,
              right: RIGHT_MARGIN,
              top: 0,
              bottom: 0,
              overflowX: needScroll ? 'auto' : 'hidden',
              overflowY: 'hidden',
            }}
            onMouseMove={handleAreaMouseMove}
            onPointerLeave={handleMouseLeaveChart}
          >
            {isLocalTooltipActive && hoverIndex != null && (
              <div style={getColumnStyle(hoverIndex)} />
            )}

            {shouldMirror && scrollingToIndex === null &&
              mappedHighlightedIndices.map((index) => (
                <div key={`overlay-${index}`} style={getColumnStyle(index)} />
            ))}
            
            {needScroll ? (
              <List
                ref={listRef}
                layout="horizontal"
                height={height}
                width={innerWidth}
                itemCount={values.length}
                itemSize={itemSize}
                overscanCount={64}
                onScroll={onListScroll}
              >
                {Item}
              </List>
            ) : (
              <SmallSVG />
            )}
          </div>

          {localTooltipPos && hoverIndex !== null && hoverIndex >= 0 && hoverIndex < data.length && (
            <div
              style={{
                position: 'absolute',
                left: localTooltipPos.left - LEFT_MARGIN,
                top: localTooltipPos.top,
                transform: localTooltipPos.transform,
                pointerEvents: 'none',
                zIndex: 99999999,
              }}
              className="bg-white p-2 border border-gray-300 rounded-xl shadow-md text-sm"
            >
              <p className="font-medium">{`${getXLabel(hoverIndex)}`}</p>
              <p className="text-blue-600">
                {`Value${yLogActive ? ' (log)' : ''}: ${formatTooltip(data[hoverIndex].value)}`}
              </p>
            </div>
          )}

          {shouldMirror && scrollingToIndex === null && mappedHighlightedIndices.length > 0 && (() => {
            const firstMirroredIndex = mappedHighlightedIndices[0];
            const mirroredTooltipPos = getTooltipPos(firstMirroredIndex);

            if (!mirroredTooltipPos) return null;
            return (
              <div
                style={{
                  position: 'absolute',
                  left: mirroredTooltipPos.left - LEFT_MARGIN,
                  top: mirroredTooltipPos.top,
                  transform: mirroredTooltipPos.transform,
                  pointerEvents: 'none',
                  zIndex: 99999999,
                }}
                className="bg-white p-2 border border-gray-300 rounded-xl shadow-md text-sm"
              >
                <p className="font-medium">{`${getXLabel(firstMirroredIndex)}`}</p>
                <p className="text-blue-600">
                  {`Value${yLogActive ? ' (log)' : ''}: ${formatTooltip(data[firstMirroredIndex].value)}`}
                </p>
              </div>
            );
          })()}
        </div>
      </div>
    </>
  );
}

export default React.memo(Histogram);