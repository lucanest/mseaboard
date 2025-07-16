import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const PhyloTreeViewer = ({
  id,
  newick: newickStr, isNhx = false,
  highlightedSequenceId, onHoverTip,
  linkedTo, highlightOrigin
}) => {
  const containerRef = useRef();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [debugInfo, setDebugInfo] = useState('');

  const parseNewick = (newickString) => {
    let pos = 0;
    const parseNode = () => {
      const node = { name: '', length: 0, children: [] };
      while (pos < newickString.length && /\s/.test(newickString[pos])) pos++;
      if (pos >= newickString.length) return node;

      if (newickString[pos] === '(') {
        pos++;
        do {
          while (pos < newickString.length && /\s/.test(newickString[pos])) pos++;
          if (newickString[pos] === ')') break;
          node.children.push(parseNode());
          while (pos < newickString.length && /\s/.test(newickString[pos])) pos++;
          if (newickString[pos] === ',') pos++;
        } while (pos < newickString.length && newickString[pos] !== ')');
        if (newickString[pos] === ')') pos++;
      }

      let name = '';
      while (pos < newickString.length) {
        const char = newickString[pos];
        if (char === ':' || char === ',' || char === ')' || char === ';') break;
        if (char === '[' && newickString.substr(pos, 6) === '[&&NHX') {
          let nhxEnd = pos;
          while (nhxEnd < newickString.length && newickString[nhxEnd] !== ']') nhxEnd++;
          if (nhxEnd < newickString.length) nhxEnd++;
          name += newickString.substring(pos, nhxEnd);
          pos = nhxEnd;
        } else {
          name += char;
          pos++;
        }
      }
      node.name = name.trim();

      if (pos < newickString.length && newickString[pos] === ':') {
        pos++;
        let lengthStr = '';
        while (pos < newickString.length && /[\d.eE+-]/.test(newickString[pos])) {
          lengthStr += newickString[pos++];
        }
        node.length = parseFloat(lengthStr) || 0;

        while (
          pos < newickString.length &&
          newickString[pos] === '[' &&
          newickString.substr(pos, 6) === '[&&NHX'
        ) {
          let annStart = pos;
          let annEnd = annStart;
          while (annEnd < newickString.length && newickString[annEnd] !== ']') annEnd++;
          if (annEnd < newickString.length) annEnd++;
          node.name += newickString.substring(annStart, annEnd);
          pos = annEnd;
        }
      }

      return node;
    };
    return parseNode();
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!newickStr || !size.width || !size.height) return;

    const container = containerRef.current;
    d3.select(container).selectAll('*').remove();
    setDebugInfo(`Processing: ${newickStr.slice(0, 100)}...`);

    let parsed;
    try {
      parsed = parseNewick(newickStr);
    } catch (err) {
      setDebugInfo(`Parse error: ${err.message}`);
      return;
    }

    const extractNhxData = (nameWithNhx) => {
      if (!nameWithNhx || !isNhx) return { name: nameWithNhx || '', nhx: {} };
      const nhxMatch = nameWithNhx.match(/\[&&NHX:([^\]]+)\]/);
      if (!nhxMatch) return { name: nameWithNhx, nhx: {} };
      const nhxString = nhxMatch[1];
      const cleanName = nameWithNhx.replace(/\[&&NHX:[^\]]+\]/, '').replace(/"/g, '');
      const nhxData = {};
      const parts = nhxString.split(':');
      for (const part of parts) {
        if (part.includes('=')) {
          const [key, value] = part.split('=', 2);
          nhxData[key.trim()] = value.trim();
        }
      }
      return { name: cleanName, nhx: nhxData };
    };

const convertToD3Hierarchy = (node) => {
  if (!node) return { name: '', nhx: {}, length: 0 };
  const { name, nhx } = extractNhxData(node.name ?? '');
  let children = Array.isArray(node.children)
    ? node.children.map(convertToD3Hierarchy).filter(Boolean)
    : [];
  return {
    name: name ?? '',
    nhx: nhx ?? {},
    length: node.length ?? 0,
    ...(children.length > 0 ? { children } : {})
  };
};

const data = convertToD3Hierarchy(parsed);
const root = d3.hierarchy(data);
const leafNames = root.leaves().map(d => (d.data && d.data.name) ? d.data.name : '');
const maxLabelLength = Math.max(...leafNames.map(name => name.length));
const approxCharWidth = 4.05;
const margin = maxLabelLength * approxCharWidth;
const radius = Math.min(size.width, size.height) / 2 - margin;
const diameter = radius * 2;

const svg = d3.select(container)
  .append('svg')
  .attr('viewBox', [
    0,
    0,
    diameter + margin * 2,
    diameter + margin * 2
  ])
  .attr('width', '100%')
  .attr('height', '100%')
  .style('font', '10px sans-serif');

// Legend in upper left
const legend = svg.append('g')
  .attr('transform', 'translate(20, 20)');

// Center the tree group
const g = svg.append('g')
  .attr('transform', `translate(${radius + margin},${radius + margin})`);


    d3.cluster().size([2 * Math.PI, radius - 50])(root);

    const colorField = 'Trait';
    const colorMap = {};
    let colorIndex = 0;
    const colorScale = d3.schemeCategory10;

    root.each(d => {
      const val = d.data.nhx?.[colorField];
      if (val && !(val in colorMap)) {
        colorMap[val] = colorScale[colorIndex++ % colorScale.length];
      }
    });

    g.append('g')
      .selectAll('path')
      .data(root.links())
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 1)
      .attr('d', d3.linkRadial()
        .angle(d => d.x)
        .radius(d => d.y));

    g.append('g')
      .selectAll('circle')
      .data(root.descendants())
      .join('circle')
      .attr('transform', d => `
        rotate(${(d.x * 180 / Math.PI - 90)})
        translate(${d.y},0)
      `)
      .attr('r', 4)
.attr('fill', d => {
  const isLinkedHighlight = 
d.data && highlightedSequenceId === d.data.name &&
    (linkedTo === highlightOrigin || id === highlightOrigin);
  if (isLinkedHighlight) return '#cc0066';
const val = d.data && d.data.nhx ? d.data.nhx[colorField] : undefined;
  return val ? colorMap[val] : '#555';
})
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
.on('mouseenter', (event, d) => onHoverTip?.(d.data && d.data.name ? d.data.name : '', id))
.on('mouseleave', () => onHoverTip?.(null, null))

g.append('g')
  .selectAll('text')
.data(root.descendants().filter(d => !d.children && d.data && typeof d.data.name !== 'undefined'))
  .join('text')
  .attr('transform', d => `
    rotate(${(d.x * 180 / Math.PI - 90)})
    translate(${d.y},0)
    rotate(${d.x >= Math.PI ? 180 : 0})
  `)
  .attr('dy', '0.31em')
  .attr('x', d => d.x < Math.PI ? 8 : -8)
  .attr('text-anchor', d => d.x < Math.PI ? 'start' : 'end')
.text(d => (d.data && typeof d.data.name !== 'undefined') ? d.data.name : '')
  .style('font-size', d => {
const isLinkedHighlight = 
      d.data && highlightedSequenceId === d.data.name &&
      (linkedTo === highlightOrigin || id === highlightOrigin);
    return isLinkedHighlight ? '18px' : '12px';
  })
  .style('fill', d => {
    const isLinkedHighlight = 
      highlightedSequenceId === d.data.name &&
      (linkedTo === highlightOrigin || id === highlightOrigin);
    return isLinkedHighlight ? ' #cc0066' : '#333';
  })
    .style('font-weight', d => {
    const isLinkedHighlight = 
      highlightedSequenceId === d.data.name &&
      (linkedTo === highlightOrigin || id === highlightOrigin);
    return isLinkedHighlight ? 'bold' : 'normal';
  })
.on('mouseenter', (event, d) => onHoverTip?.(d.data && d.data.name ? d.data.name : ''))
.on('mouseleave', () => onHoverTip?.(null));

    if (Object.keys(colorMap).length > 0) {


      const items = Object.entries(colorMap);

      legend.selectAll('rect')
        .data(items)
        .join('rect')
        .attr('x', 0)
        .attr('y', (_, i) => i * 20)
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', d => d[1]);

      legend.selectAll('text')
        .data(items)
        .join('text')
        .attr('x', 20)
        .attr('y', (_, i) => i * 20 + 12)
        .text(d => `Trait: ${d[0]}`)
        .style('font-size', '12px')
        .style('fill', '#333');
    }

    setDebugInfo(`Tree rendered successfully. Found ${Object.keys(colorMap).length} different ${colorField} values.`);
  }, [newickStr, isNhx, size, highlightedSequenceId, linkedTo, highlightOrigin, onHoverTip]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ overflow: 'hidden' }}
    />
  );
};

export default PhyloTreeViewer;