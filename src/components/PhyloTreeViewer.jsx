// PhyloTreeViewer.jsx
import  React, { useEffect, useRef, useState } from 'react';
import { parseNewick } from './Utils';  
import * as d3 from 'd3';

const BLACK_COLOR = "#fff";
const LIGHT_GRAY_COLOR = "#ccc";
const DARK_GRAY_COLOR = "#555";
const MAGENTA_COLOR = "#cc0066";

const PhyloTreeViewer = ({
  id,
  newick: newickStr, isNhx = false, onHoverTip,
  linkedTo, highlightOrigin, radial= false, setPanelData,
  highlightedNodes = [], linkedHighlights = [],
  useBranchLengths = false,
  pruneMode = false,
  toNewick,
}) => {
  const containerRef = useRef();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [debugInfo, setDebugInfo] = useState('');
  const [highlightedNode, setHighlightedNode] = useState(null);
  const [highlightedLink, setHighlightedLink] = useState(null);


  const minFontSize = 8;
  const maxFontSize = 24;
  const minNodeRadius = 1;
  const maxNodeRadius = 3;

  const scaleFactor = radial ? Math.max(0.7, Math.min(1.5, Math.sqrt(size.width * size.height) / 600)) : Math.max(0.7, Math.min(1.5, Math.sqrt(size.height) / 600));

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

let data = convertToD3Hierarchy(parsed);
let root = d3.hierarchy(data);
const leavesCount = root.leaves().length;
const fontScale = 2.7*scaleFactor / Math.sqrt(leavesCount / 10 + 1);
const maxLabelLength = d3.max(root.leaves(), d => (d.data.name || '').length);
const approxCharWidth = 4;
const minMargin = 10;
const maxMargin = radial ? 140 : 50;
const margin = Math.max(minMargin, Math.min(maxMargin, maxLabelLength * approxCharWidth));
const radius = Math.min(size.width, size.height) / 2 - margin;
const diameter = radius * 2;
const maxRadius = radius - 30;
const tooltip = d3.select(container).select(".tooltip").empty()
  ? d3.select(container)
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0,0,0,0.3)")
      .style("color", BLACK_COLOR)
      .style("padding", "4px 8px")
      .style("border-radius", "8px")
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
    : [0, 0, size.width, size.height])
  .style('font', '10px sans-serif');

// Legend in upper left
const legend = svg.append('g')
  .attr('transform', 'translate(20, 20)');

// Center the tree group
const g = svg.append('g')
  .attr('transform', radial
    ? `translate(${radius + margin},${radius + margin})`
    : `translate(20, 20)`); // Adjust margin for rectangular


if (radial) {
    // D3 layout for Radial mode (y = radius, x = angle)
    d3.tree().size([2 * Math.PI, maxRadius])(root);

    // Override y based on branch length option
    if (useBranchLengths) {
        root.each(d => {
            d.y = (d.parent ? d.parent.y : 0) + (d.data.length || 0);
        });
        const maxLen = d3.max(root.descendants(), d => d.y);
        if (maxLen > 0) {
            const radiusScale = maxRadius / maxLen;
            root.each(d => { d.y *= radiusScale; });
        }
    } else {
        root.eachAfter(d => {
            d.height_from_leaf = d.children ? 1 + d3.max(d.children, c => c.height_from_leaf) : 0;
        });
        const maxHeight = root.height_from_leaf;
        if (maxHeight > 0) {
            root.each(d => {
                d.y = (maxHeight - d.height_from_leaf) * (maxRadius / maxHeight);
            });
        }
    }

    // Equally space leaves in radial mode
    const leaves = root.leaves();
    const angleStep = (2 * Math.PI) / leaves.length;
    leaves.forEach((leaf, i) => { leaf.x = i * angleStep; });
    root.eachAfter(node => {
        if (node.children) {
            node.x = d3.mean(node.children, d => d.x);
        }
    });

} else {
    // D3 layout for Rectangular mode (x = vertical, y = horizontal)
    const drawWidth = size.width - margin*5 -15; // Space for labels + padding
    const drawHeight = size.height - 25;
    d3.tree().size([drawHeight, drawWidth])(root);
    // Override y based on branch length option
    if (useBranchLengths) {
        root.each(d => {
            d.y = (d.parent ? d.parent.y : 0) + (d.data.length || 0);
        });
        const maxLen = d3.max(root.descendants(), d => d.y);
        if (maxLen > 0) {
            const scaleY = drawWidth / maxLen;
            root.each(d => { d.y *= scaleY; });
        }
    } else {
        root.eachAfter(d => {
            d.height_from_leaf = d.children ? 1 + d3.max(d.children, c => c.height_from_leaf) : 0;
        });
        const maxHeight = root.height_from_leaf;
        if (maxHeight > 0) {
             root.each(d => {
                d.y = (maxHeight - d.height_from_leaf) * (drawWidth / maxHeight);
            });
        }

    }
    // Equally space leaves in rectangular mode
    const leaves = root.leaves();
    leaves.forEach((leaf, i) => { leaf.x = (i + 1) * (drawHeight / (leaves.length + 1)); });
    root.eachAfter(node => {
        if (node.children) {
            node.x = d3.mean(node.children, d => d.x);
        }
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


const classicRadialLinkGenerator = (link) => {
    const sa = link.source.x - Math.PI / 2;
    const ta = link.target.x - Math.PI / 2;
    const sr = link.source.y;
    const tr = link.target.y;

    const sx = sr * Math.cos(sa);
    const sy = sr * Math.sin(sa);
    const ix = sr * Math.cos(ta);
    const iy = sr * Math.sin(ta);
    const tx = tr * Math.cos(ta);
    const ty = tr * Math.sin(ta);

    const sweepFlag = link.target.x > link.source.x ? 1 : 0;

    return `M ${sx},${sy} A ${sr},${sr} 0 0 ${sweepFlag} ${ix},${iy} L ${tx},${ty}`;
};

// Link generator for rectangular "elbow" paths
const classicRectangularLinkGenerator = d3.linkHorizontal()
    .x(d => d.y)
    .y(d => d.x);

const linkPathGen = radial ? classicRadialLinkGenerator : classicRectangularLinkGenerator;

// Visible branches
const branchPaths = g.append('g')
  .selectAll('path.branch')
  .data(links)
  .join('path')
  .attr('class', 'branch')
  .attr('fill', 'none')
  .style('pointer-events', 'none')
  .attr('stroke', LIGHT_GRAY_COLOR)
  .attr('stroke-width', 2*scaleFactor)
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
  .style('cursor', pruneMode ? 'pointer' : 'default')
  .on('mouseenter', function (event, d) {
    const idx = links.indexOf(event);
    if (idx > -1) {
        const branchPath = d3.select(branchPaths.nodes()[idx]);
        if (pruneMode) {
            branchPath.attr('stroke', '#E50000').attr('stroke-width', 3);
        } else {
            branchPath.attr('stroke', MAGENTA_COLOR);
        }
    }

    const length = event?.target?.data?.length;
    if (pruneMode) {
        tooltip.style("display", "block").html(`<strong>Click to prune this branch</strong>`);
    } else {
        tooltip
          .style("display", "block")
          .html(`<strong>Branch length:</strong> ${length !== undefined ? d3.format(".4f")(length) : 'N/A'}`);
    }
  })
  .on('mouseleave', function (event, d) {
    const idx = links.indexOf(event);
    if (idx > -1) d3.select(branchPaths.nodes()[idx]).attr('stroke', LIGHT_GRAY_COLOR).attr('stroke-width', 2);
    tooltip.html('').style("display", "none");
  })
  .on('click', (event, d) => {
    if (!pruneMode) return;
  
    const nodeToPrune = event.target;
    const parent = nodeToPrune.parent;
  
    if (!parent) return; // Cannot prune a node without a parent (e.g., the root)
  
    // Case 1: Parent has exactly two children. Pruning one will create a unary node.
    if (parent.children && parent.children.length === 2) {
      const grandparent = parent.parent;
      const sibling = parent.children.find(child => child !== nodeToPrune);
  
      if (!sibling) return;
  
      // New branch length for the sibling is its own plus its parent's branch length.
      const parentBranchLength = parent.data.length || 0;
      const siblingBranchLength = sibling.data.length || 0;
      sibling.data.length = parentBranchLength + siblingBranchLength;
  
      if (grandparent) {
        // Re-parent the sibling to the grandparent.
        const parentIndex = grandparent.children.indexOf(parent);
        if (parentIndex !== -1) {
          grandparent.children[parentIndex] = sibling; // Replace parent with sibling.
          sibling.parent = grandparent; // Update sibling's parent pointer.
        }
      } else {
        // The parent was the root. The sibling becomes the new root.
        sibling.parent = null;
        root = sibling; // Re-assign the root of the hierarchy.
      }
    } 
    // Case 2: Parent is part of a polytomy (more than 2 children).
    else if (parent.children) {
      // Just remove the node. This won't create a unary node.
      parent.children = parent.children.filter(child => child !== nodeToPrune);
    }
  
    // Reserialize the modified tree structure.
    const newNewickString = toNewick(root) + ';';
  
    // Update the panel data.
    setPanelData(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        data: newNewickString,
      }
    }));
  });

// Add dotted lines for label alignment (if using branch lengths)
if (useBranchLengths) {
    const leaves = root.leaves();
    const maxDimension = radial ? maxRadius : size.width - 4*margin - 30;

    g.append('g')
        .selectAll('path.dotted-line')
        .data(leaves)
        .join('path')
        .attr('class', 'dotted-line')
        .attr('stroke', LIGHT_GRAY_COLOR)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2')
        .style('pointer-events', 'none')
        .attr('d', d => {
            if (radial) {
                if (d.y >= maxDimension) return null; // Don't draw if already at the edge
                const angle = d.x - Math.PI / 2;
                const sx = d.y * Math.cos(angle);
                const sy = d.y * Math.sin(angle);
                const ex = maxDimension * Math.cos(angle);
                const ey = maxDimension * Math.sin(angle);
                return `M ${sx},${sy} L ${ex},${ey}`;
            } else {
                if (d.y >= maxDimension) return null;
                return `M ${d.y},${d.x} L ${maxDimension},${d.x}`;
            }
        });
}


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
    .on('mousemove', function (event, d) {
      setHighlightedNode(event.data?.name || null);
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
.attr('transform', d => radial ? `rotate(${(d.x * 180 / Math.PI - 90)}) translate(${d.y},0)` : null)
.attr('cx', d => radial ? null : d.y) //  y is horizontal
.attr('cy', d => radial ? null : d.x) //  x is vertical
  .attr('r', d => Math.max(minNodeRadius, Math.min(maxNodeRadius, 3 * scaleFactor)))
.attr('fill', d => {
const val = d.data && d.data.nhx ? d.data.nhx[colorField] : undefined;
    return val ? colorMap[val] : DARK_GRAY_COLOR;
  })
  .attr('stroke', d => {
    const { isHighlight, isPersistentHighlight } = getHighlightState(d);
    return isHighlight ? DARK_GRAY_COLOR : (isPersistentHighlight ? MAGENTA_COLOR : BLACK_COLOR);
  })
  .attr('stroke-width', d => {
    const { isHighlight, isPersistentHighlight } = getHighlightState(d);
    return isHighlight || isPersistentHighlight ? 2 : 1;
  })
.on('mouseenter', function (event, d) {
  const nodeName = event.data?.name;
  const isLeaf = event.height == 0;
  const nhxData = event.data?.nhx || {};

  const nhxString = Object.entries(nhxData)
    .map(([key, val]) => `<div><strong>${key}</strong>: ${val}</div>`)
    .join('') || '<div>No NHX data</div>';

  d3.select(this).attr('fill', MAGENTA_COLOR);

  tooltip.style("display", "block").html(`${nhxString}`);

  if (isLeaf) {
    onHoverTip?.(nodeName || '', id);
    setHighlightedNode(nodeName || null);
  } else {
    onHoverTip?.(null, null);
    setHighlightedNode(null);
  }
})
.on('mouseleave', function () {
  d3.select(this)
    .attr('fill', d => {
      const val = d.data && d.data.nhx ? d.data.nhx[colorField] : undefined;
      return val ? colorMap[val] : DARK_GRAY_COLOR;
    });
  tooltip.style("display", "none");
  onHoverTip?.(null, null);
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
    return { ...prev, [id]: { ...current, highlightedNodes: updated }};
  });
})

g.append('g')
  .selectAll('text')
.data(root.descendants().filter(d => !d.children && d.data && typeof d.data.name !== 'undefined'))
  .join('text')
.attr('transform', d => {
    if (!radial) return null;
    const labelRadius = (useBranchLengths && d.y < maxRadius) ? maxRadius : d.y;
    return `rotate(${(d.x * 180 / Math.PI - 90)}) translate(${labelRadius},0) rotate(${d.x >= Math.PI ? 180 : 0})`;
})
.attr('x', d => {
    if (radial) return d.x < Math.PI ? 6 : -6;
    const drawWidth = size.width - 4*margin - 30;
    const labelPos = useBranchLengths ? drawWidth : d.y;
    return labelPos + 6;
})
.attr('y', d => radial ? null : d.x) // y is vertical
.attr('text-anchor', d => radial ? (d.x < Math.PI ? 'start' : 'end') : 'start')
.attr('dy', radial ? '0.35em' : null)
.attr('dominant-baseline', radial ? 'auto' : 'middle')
.text(d => (d.data && typeof d.data.name !== 'undefined') ? d.data.name : '')
.style('font-size', d => {
    const { isHighlight, isPersistentHighlight } = getHighlightState(d);
    let baseSize = 12 * fontScale;
    if (radial && maxLabelLength > 0) {
      const availableWidth = margin - 12; // Buffer space
      const fontSizeToFit = availableWidth / (maxLabelLength * 0.35); // Using 0.45 as a character width heuristic
      baseSize = Math.min(baseSize, fontSizeToFit);
    }
    const finalSize = Math.max(minFontSize, Math.min(maxFontSize, baseSize));
    return isHighlight || isPersistentHighlight ? `${finalSize * 1.6}px` : `${finalSize}px`;
  })
  .style('fill', d => {
    const { isHighlight, isPersistentHighlight } = getHighlightState(d);
    return isHighlight ? DARK_GRAY_COLOR : (isPersistentHighlight ? MAGENTA_COLOR : DARK_GRAY_COLOR);
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
    return { ...prev, [id]: { ...current, highlightedNodes: updated } };
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
        .style('fill', DARK_GRAY_COLOR);
    }

    setDebugInfo(`Tree rendered successfully. Found ${Object.keys(colorMap).length} different ${colorField} values.`);
  }, [newickStr, isNhx, size, linkedTo, highlightOrigin, onHoverTip,highlightedNodes,linkedHighlights, radial, useBranchLengths, pruneMode, id, setPanelData, toNewick]);

  useEffect(() => {
    function handleDocumentMouseMove(e) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        setHighlightedNode(null);
        setHighlightedLink(null);
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