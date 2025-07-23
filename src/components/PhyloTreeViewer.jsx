import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const PhyloTreeViewer = ({
  id,
  newick: newickStr, isNhx = false,
  highlightedSequenceId, onHoverTip,
  linkedTo, highlightOrigin, radial= false
}) => {
  const containerRef = useRef();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [debugInfo, setDebugInfo] = useState('');
  const [highlightedNode, setHighlightedNode] = useState(null);

  
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
    const isLinkedHighlight =
      d.data && highlightedSequenceId === d.data.name &&
      (linkedTo === highlightOrigin || id === highlightOrigin);
    const isHighlight = highlightedNode === d.data.name || isLinkedHighlight;
    return { isLinkedHighlight, isHighlight };
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
const leafNames = root.leaves().map(d => (d.data && d.data.name) ? d.data.name : '');
const maxLabelLength = Math.max(...leafNames.map(name => name.length));
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
      .style("display", "none")
  : d3.select(container).select(".tooltip");


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

const links = root.links();  // Each is { source, target }

g.append('g')
  .selectAll('path.invisible-hover')
  .data(links)
  .join('path')
  .attr('class', 'invisible-hover')       
  .attr('fill', 'none')
  .attr('stroke', 'transparent')
  .attr('stroke-width', 13)
.attr('d', radial
  ? d3.linkRadial().angle(d => d.x).radius(d => d.y)
  : d3.linkHorizontal().x(d => d.y).y(d => d.x))
  .on('mouseover', function (event, index) {
  const link = links[index];
  const length = link?.target?.data?.length;

  tooltip
    .style("display", "block")
    .html(`Branch length: ${length !== undefined ? d3.format(".4f")(length) : 'N/A'}`);
})
  .on('mousemove', function (event) {
    tooltip
      .style("bottom", `10px`)
      .style("left", `10px`);
  })
  .on('mouseout', function () {
    tooltip.style("display", "none");
  });

  g.append('g')
  .selectAll('path.branch')
  .data(links)
  .join('path')
  .attr('class', 'branch')
  .attr('fill', 'none')
  .attr('stroke', '#ccc')
  .attr('stroke-width', 2)
.attr('d', radial
  ? d3.linkRadial().angle(d => d.x).radius(d => d.y)
  : d3.linkHorizontal().x(d => d.y).y(d => d.x));

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
    const { isHighlight } = getHighlightState(d);
    return isHighlight ? '#cc0066' : '#fff';
  })
  .attr('stroke-width', d => {
    const { isHighlight } = getHighlightState(d);
    return isHighlight ? 2 : 1;
  })
.on('mouseenter', (event, d) => {
  const nodeName = event.data?.name;
  const isLeaf = event.height ==0;
  const Trait = event.data?.nhx?.[colorField] || '';

  tooltip
    .style("display", "block")
    .html(`Trait: ${Trait || 'N/A'}`)
  
  

  if (isLeaf) {
  onHoverTip?.(nodeName || '', id);
  setHighlightedNode(nodeName || null);
  }
  else {
    onHoverTip?.(null, null);
  setHighlightedNode(null);
  }
  /* console.log('Hover tip:', {
    nodeName,
    id,
    linkedTo,
    highlightedNode,
    highlightOrigin});*/
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
  });

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
    const { isHighlight } = getHighlightState(d);
    return isHighlight ? '16px' : '12px';
  })
  .style('fill', d => {
    const { isHighlight } = getHighlightState(d);
    return isHighlight ? ' #cc0066' : '#333';
  })
    .style('font-weight', d => {
    const { isHighlight } = getHighlightState(d);
    return isHighlight ? 'bold' : 'normal';
  })
.on('mouseenter', (event, d) => {
  const nodeName = event.data?.name;
  onHoverTip?.(nodeName || '', id);
  setHighlightedNode(nodeName || '');
})
.on('mouseleave', () => {
  onHoverTip?.(null);
  setHighlightedNode(null);
});


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
      onMouseLeave={() => {
        onHoverTip?.(null, null);
        setHighlightedNode(null);
      }}
    />
  );
};

export default PhyloTreeViewer;