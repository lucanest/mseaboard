// PhyloTreeViewer.jsx
import  React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const PhyloTreeViewer = ({
  id,
  newick: newickStr, isNhx = false, onHoverTip,
  linkedTo, highlightOrigin, radial= false, setPanelData,
  highlightedNodes = [], linkedHighlights = [],
}) => {
  const containerRef = useRef();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [debugInfo, setDebugInfo] = useState('');
  const [highlightedNode, setHighlightedNode] = useState(null);
  const [highlightedLink, setHighlightedLink] = useState(null);

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
  const length = parseFloat(lengthStr) || 0;
  node.length = length;

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

    const getHighlightState = (d) => {
    const isHighlight = highlightedNode === d.data.name || linkedHighlights.includes(d.data.name);
    const isPersistentHighlight = highlightedNodes.includes(d.data.name);
    return {isHighlight, isPersistentHighlight};
  };

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
const maxLabelLength = d3.max(root.leaves(), d => (d.data.name || '').length);
const approxCharWidth = 4;
const minMargin = 10;
const maxMargin = radial ? 140 : 50;
const margin = Math.max(minMargin, Math.min(maxMargin, maxLabelLength * approxCharWidth));
const radius = Math.min(size.width, size.height) / 2 - margin;
const diameter = radius * 2;
const tooltip = d3.select(container).select(".tooltip").empty()
  ? d3.select(container)
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0,0,0,0.3)")
      .style("color", "#fff")
      .style("padding", "4px 8px")
      .style("border-radius", "28px")
      .style("pointer-events", "none")
      .style("font-size", "12px")
      .style("display", "block")
      .style("bottom", "10px")
      .style("left", "10px")
      .html('')
  : d3.select(container).select(".tooltip");

//  Count field frequencies and values
const nhxFieldStats = {};

root.each(d => {
  if (d.data.nhx && typeof d.data.nhx === 'object') {
    Object.entries(d.data.nhx).forEach(([key, val]) => {
      if (!nhxFieldStats[key]) {
        nhxFieldStats[key] = new Set();
      }
      nhxFieldStats[key].add(val);
    });
  }
});

//  Pick the best key for coloring
let colorField = null;
let maxDistinct = 0;

for (const [key, valueSet] of Object.entries(nhxFieldStats)) {
  if (valueSet.size > maxDistinct && valueSet.size > 1) {
    maxDistinct = valueSet.size;
    colorField = key;
  }
}


const svg = d3.select(container)
  .append('svg')
  .attr('width', '100%')
  .attr('height', '100%')
  .attr('viewBox', radial
    ? [0, 0, diameter + margin * 2, diameter + margin * 2]
    : [0, 0, size.width, size.height+20])
  .style('font', '10px sans-serif');

// Legend in upper left
const legend = svg.append('g')
  .attr('transform', 'translate(20, 20)');

// Center the tree group
const g = svg.append('g')
  .attr('transform', radial
    ? `translate(${radius + margin},${radius + margin})`
    : `translate(${margin},10)`);


  if (radial) {
  d3.cluster().size([2 * Math.PI, radius - 50])(root);
} else {
  d3.cluster().size([size.height, size.width - margin * 5])(root);
}

// Equally space leaves 
 if (radial) {
    const leaves = root.leaves();
    const angleStep = (2 * Math.PI) / leaves.length;
    leaves.forEach((leaf, i) => {
      leaf.x = i * angleStep;
    });
  } else {
    const leaves = root.leaves();
    const yStep = size.height / (leaves.length + 1);
    leaves.forEach((leaf, i) => {
      leaf.x = (i + 1) * yStep;
    });
  }

    const colorMap = {};
    let colorIndex = 0;
    const colorScale = d3.schemeCategory10;

    root.each(d => {
      const val = d.data.nhx?.[colorField];
      if (val && !(val in colorMap)) {
        colorMap[val] = colorScale[colorIndex++ % colorScale.length];
      }
    });

const links = root.links();  // Each is { source, target }

// Path generator based on layout mode
const linkPathGen = radial
  ? d3.linkRadial().angle(d => d.x).radius(d => d.y)
  : d3.linkHorizontal().x(d => d.y).y(d => d.x);

// Visible branches (no pointer events)
const branchPaths = g.append('g')
  .selectAll('path.branch')
  .data(links)
  .join('path')
  .attr('class', 'branch')
  .attr('fill', 'none')
  .style('pointer-events', 'none')
  .attr('stroke', '#ccc')
  .attr('stroke-width', 2)
  .attr('d', linkPathGen);

// Invisible, thick hover targets for the same links
g.append('g')
  .selectAll('path.invisible-hover')
  .data(links)
  .join('path')
  .attr('class', 'invisible-hover')       
  .attr('fill', 'none')
  .attr('stroke', 'transparent')
  .attr('stroke-width', 13)
  .attr('d', linkPathGen)
  .on('mouseenter', function (event, d) {
    // highlight the matching visible path without triggering React state
    const idx = links.indexOf(event);
    if (idx > -1) d3.select(branchPaths.nodes()[idx]).attr('stroke', 'red');

    const length = event?.target?.data?.length;
    tooltip
      .style("display", "block")
      .html(`Branch length: ${length !== undefined ? d3.format(".4f")(length) : 'N/A'}`);
  })
  .on('mousemove', function () {
    tooltip
      .style("bottom", `10px`)
      .style("left", `10px`);
  })
  .on('mouseleave', function (event, d) {
    const idx = links.indexOf(event);
    if (idx > -1) d3.select(branchPaths.nodes()[idx]).attr('stroke', '#ccc');
    tooltip.html('').style("display", "none");
  });

// Invisible hover arcs for radial mode
if (radial) {
  const leaves = root.leaves();
  const angleStep = (2 * Math.PI) / leaves.length;
  const outerRadius = radius + margin;

  const arc = d3.arc()
    .innerRadius(radius - 50)
    .outerRadius(outerRadius)
    .startAngle(d => d.x - angleStep / 2)
    .endAngle(d => d.x + angleStep / 2);

  g.append('g')
    .selectAll('path.hover-arc')
    .data(leaves)
    .join('path')
    .attr('class', 'hover-arc')
    .attr('d', arc)
    .attr('fill', 'transparent')
    .on('mouseenter', (event, d) => {
      const nodeName = event.data?.name;
      onHoverTip?.(nodeName || '', id);
      setHighlightedNode(nodeName || null);
    })
    .on('mousemove', function (event) {
      setHighlightedNode(event.data?.name || null);
      tooltip
        .style("display", "block")
        .style("bottom", `10px`)
        .style("left", `10px`);
    })
    .on('mouseleave', (event, d) => {
      const toElement = event.relatedTarget;
      if (!toElement || !toElement.classList.contains('hover-arc')) {
        onHoverTip?.(null, null);
        setHighlightedNode(null);
      }
    });
}

g.append('g')
  .selectAll('circle')
  .data(root.descendants())
  .join('circle')
.attr('transform', d => radial
  ? `rotate(${(d.x * 180 / Math.PI - 90)}) translate(${d.y},0)`
  : null)
.attr('cx', d => radial ? null : d.y)
.attr('cy', d => radial ? null : d.x)
      .attr('r', 4)
.attr('fill', d => {  
const val = d.data && d.data.nhx ? d.data.nhx[colorField] : undefined;
    return val ? colorMap[val] : '#555';
  })
  .attr('stroke', d => {
    const { isHighlight, isPersistentHighlight } = getHighlightState(d);
    return isHighlight ? '#333' : (isPersistentHighlight ? "#cc0066" : '#fff');
  })
  .attr('stroke-width', d => {
    const { isHighlight, isPersistentHighlight } = getHighlightState(d);
    return isHighlight || isPersistentHighlight ? 2 : 1;
  })
.on('mouseenter', (event, d) => {
  const nodeName = event.data?.name;
  const isLeaf = event.height ==0;
  const nhxData = event.data?.nhx || {};

  const nhxString = Object.entries(nhxData)
    .map(([key, val]) => `<div><strong>${key}</strong>: ${val}</div>`)
    .join('') || '<div>No NHX data</div>';


  tooltip
    .style("display", "block")
    .html(`${nhxString}`);
  
  

  if (isLeaf) {
  onHoverTip?.(nodeName || '', id);
  setHighlightedNode(nodeName || null);
  }
  else {
    onHoverTip?.(null, null);
  setHighlightedNode(null);
  }

/*
const { isHighlight, isPersistentHighlight } = getHighlightState(event);
const isnameinLinkedHighlights = linkedHighlights.includes(nodeName); 

 console.log('Hover tip:', {
    nodeName,
    isHighlight,
    linkedHighlights,
    isnameinLinkedHighlights,
    id,
    linkedTo,
    highlightedNodes,
    highlightOrigin}); */

})

.on('mousemove', function (event) {
  tooltip
    .style("bottom", `10px`)
    .style("left", `10px`);
})
.on('mouseleave', () => {
  tooltip.style("display", "none");
  onHoverTip?.(null, null);
  setHighlightedNode(null)
  })
.on('click', (event, d) => {

  const name = event.data?.name;
  const isLeaf = event.height === 0;
  if (!isLeaf || !name) return;

  setPanelData(prev => {
    const current = prev[id] || {};
    const prevHighlights = current.highlightedNodes || [];
    const already = prevHighlights.includes(name);
    const updated = already
      ? prevHighlights.filter(n => n !== name)
      : [...prevHighlights, name];
    return {
      ...prev,
      [id]: {
        ...current,
        highlightedNodes: updated
      }
    };
  });
})

g.append('g')
  .selectAll('text')
.data(root.descendants().filter(d => !d.children && d.data && typeof d.data.name !== 'undefined'))
  .join('text')
.attr('transform', d => radial
  ? `rotate(${(d.x * 180 / Math.PI - 90)}) translate(${d.y},0) rotate(${d.x >= Math.PI ? 180 : 0})`
  : null)
.attr('x', d => radial ? (d.x < Math.PI ? 6 : -6) : d.y + 6)
.attr('y', d => radial ? null : d.x)
.attr('text-anchor', d => radial ? (d.x < Math.PI ? 'start' : 'end') : 'start')
.attr('dy', radial ? '0.35em' : '0.35em')
.text(d => (d.data && typeof d.data.name !== 'undefined') ? d.data.name : '')
  .style('font-size', d => {
    const { isHighlight, isPersistentHighlight } = getHighlightState(d);
    return isHighlight || isPersistentHighlight ? '20px' : '12px';
  })
  .style('fill', d => {
    const { isHighlight, isPersistentHighlight } = getHighlightState(d);
    return isHighlight ? '#333' : (isPersistentHighlight ? "#cc0066" : '#333');
  })
    .style('font-weight', d => {
    const { isHighlight, isPersistentHighlight } = getHighlightState(d);
    return isHighlight || isPersistentHighlight ? 'bold' : 'normal';
  })
.on('mouseenter', (event, d) => {
  const nodeName = event.data?.name;
  onHoverTip?.(nodeName || '', id);
  setHighlightedNode(nodeName || null);

})
.on('mouseleave', () => {
  onHoverTip?.(null);
  setHighlightedNode(null);
})
.on('click', (event, d) => {

  const name = event.data?.name;
  const isLeaf = event.height === 0;
  if (!isLeaf || !name) return;

  setPanelData(prev => {
    const current = prev[id] || {};
    const prevHighlights = current.highlightedNodes || [];
    const already = prevHighlights.includes(name);
    const updated = already
      ? prevHighlights.filter(n => n !== name)
      : [...prevHighlights, name];
    return {
      ...prev,
      [id]: {
        ...current,
        highlightedNodes: updated
      }
    };
  });
})

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
        .text(d => `${colorField}: ${d[0]}`)
        .style('font-size', '12px')
        .style('fill', '#333');
    }

    setDebugInfo(`Tree rendered successfully. Found ${Object.keys(colorMap).length} different ${colorField} values.`);
  }, [newickStr, isNhx, size, linkedTo, highlightOrigin, onHoverTip,highlightedNodes,linkedHighlights]);

  useEffect(() => {
    function handleDocumentMouseMove(e) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      // If mouse is outside the panel, clear tooltip
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        setHighlightedNode(null); // clear highlighted node
        setHighlightedLink(null); // clear highlighted link
      }
    }
    document.addEventListener('mousemove', handleDocumentMouseMove);
    return () => document.removeEventListener('mousemove', handleDocumentMouseMove);
  }, [onHoverTip]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ overflow: 'hidden' }}
      onMouseLeave={() => {
        onHoverTip?.(null, null);
        setHighlightedNode(null);
        setHighlightedLink(null);
      }}
    />
  );
};

export default React.memo(PhyloTreeViewer);