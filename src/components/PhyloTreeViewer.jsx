// PhyloTreeViewer.jsx

import React, { useEffect, useRef, useState } from 'react';
import { parseNewick } from './Utils';
import * as d3 from 'd3';
import { tooltipStyle } from '../constants/styles'; 
import { WHITE_COLOR, LIGHT_GRAY_COLOR, DARK_GRAY_COLOR, MAGENTA_COLOR, HIGH_COLOR, LOW_COLOR } from '../constants/colors';
import { Box, Button, Chip, IconButton, Slider, Stack, Switch, FormControlLabel } from '@mui/material';


const PhyloTreeViewer = ({
  id,
  panelData, // All data and settings are in this object
  setPanelData, // Function to update the parent's state
  isNhx = false,
  onHoverTip,
  linkedTo,
  highlightOrigin,
  radial = false,
  linkedHighlights = [],
  useBranchLengths = false,
  pruneMode = false,
  toNewick,
  extractMode = false,
  onLeafSelect,
  selectedLeaves = new Set(),
  onCountLeaves,
}) => {
  const containerRef = useRef();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [debugInfo, setDebugInfo] = useState('');
  const [highlightedNode, setHighlightedNode] = useState(null);
  const [highlightedLink, setHighlightedLink] = useState(null);
  const [showControls, setShowControls] = useState(false);
  const [nhxFieldStats, setNhxFieldStats] = useState({});
  const [tooltipContent, setTooltipContent] = useState('');
  const [colorbarTooltip, setColorbarTooltip] = useState({ visible: false, x: 0, y: 0, value: null });
  const controlsRef = useRef(null);

  // Destructure view-independent data from panelData.
  const {
    data: newickStr,
    highlightedNodes = [],
    nhxColorField: initialNhxColorField,
    nhxContinuousFields,
    nhxThresholds,
    radialSettings = {}, // Default to empty objects if not present
    rectangularSettings = {},
  } = panelData || {};

  // Determine the current view's settings.
  // This allows us to have separate settings for radial and rectangular views.
  const currentViewSettings = radial ? radialSettings : rectangularSettings;
  const {
    labelSize = 1,
    nodeRadius = 1,
    branchWidth = 1,
    treeRadius = 1, // Specific to radial, but we can safely destructure
    rightMargin = 100, // Specific to rectangular
  } = currentViewSettings;


  // Manage the nhxColorField state. We use an internal state
  // that is initialized from props. This allows for automatic field detection logic
  // to run without immediately propagating a change upwards.
  const [nhxColorField, setNhxColorField] = useState(initialNhxColorField);
  useEffect(() => {
    setNhxColorField(initialNhxColorField);
  }, [initialNhxColorField]);


  const minFontSize = 4;
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
    if (!showControls) return;
    function handleClickOutside(event) {
      if (
        controlsRef.current &&
        !controlsRef.current.contains(event.target)
      ) {
        setShowControls(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showControls]);

  useEffect(() => {
    if (!newickStr || !size.width || !size.height) return;

    const container = containerRef.current;
    d3.select(container).selectAll('svg').remove();
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
      return { isHighlight, isPersistentHighlight };
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
    onCountLeaves?.(leavesCount);
    const fontScale = 2.7 * scaleFactor / Math.sqrt(leavesCount / 10 + 1);
    const minLabelLength = d3.min(root.leaves(), d => (d.data.name || '').length);
    const maxLabelLength = d3.max(root.leaves(), d => (d.data.name || '').length);
    const approxCharWidth = 4;
    const minMargin = 10;
    const maxMargin = radial ? 140 : rightMargin;
    const margin = Math.max(minMargin, Math.min(maxMargin, maxLabelLength * approxCharWidth));
    const radius = (Math.min(size.width, size.height) / 2 - margin) * (radial ? treeRadius : 1);
    const diameter = radius * 2;
    const maxRadius = radius - 30;

    //  Count field frequencies and values
    const localNhxFieldStats = {};
    root.each(d => {
      if (d.data.nhx && typeof d.data.nhx === 'object') {
        Object.entries(d.data.nhx).forEach(([key, val]) => {
          if (!localNhxFieldStats[key]) {
            localNhxFieldStats[key] = {
              values: new Set(),
              isNumeric: true,
              hasFloat: false,
              min: Infinity,
              max: -Infinity,
            };
          }
          const stats = localNhxFieldStats[key];
          stats.values.add(val);

          if (stats.isNumeric) {
            const numVal = Number(val);
            if (isNaN(numVal) || val === null || String(val).trim() === '') {
              stats.isNumeric = false;
            } else {
              if (!Number.isInteger(numVal)) {
                stats.hasFloat = true;
              }
              stats.min = Math.min(stats.min, numVal);
              stats.max = Math.max(stats.max, numVal);
            }
          }
        });
      }
    });

    Object.values(localNhxFieldStats).forEach(stats => {
      if (!stats.isNumeric) {
        stats.min = undefined;
        stats.max = undefined;
      } else if (stats.min === Infinity) { // Handle case with no numeric values
        stats.min = 0;
        stats.max = 1;
      }
    });
    setNhxFieldStats(localNhxFieldStats);

    // Pick the best key for coloring
    let colorField = nhxColorField;
    if (colorField === undefined && Object.keys(localNhxFieldStats).length > 0) {
      let maxDistinct = 0;
      let bestField = null;
      
      for (const [key, stats] of Object.entries(localNhxFieldStats)) {
        if (stats.values.size > maxDistinct && stats.values.size > 1) {
          maxDistinct = stats.values.size;
          bestField = key;
        }
      }
      
      if (bestField) {
        colorField = bestField;
        // Update both local state and panel data
        setNhxColorField(bestField);
        setPanelData(prev => ({
          ...prev,
          [id]: {
            ...prev[id],
            nhxColorField: bestField,
          },
        }));
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

    // Clear highlight whenever the mouse leaves the SVG area
    svg.on('mousemove', function() {
        if (d3.event.target === this) {
            setHighlightedNode(null);
            onHoverTip?.(null, null);
        }
      });

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
      const drawWidth = size.width - margin - rightMargin;
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


const fieldStats = nhxFieldStats[colorField];
    const isContinuous = fieldStats && (
        (fieldStats.isNumeric && fieldStats.hasFloat) ||
        (nhxContinuousFields && nhxContinuousFields[colorField])
    );
    const threshold = nhxThresholds?.[colorField];
    let colorValueFunction;
    let colorMap = {};

    if (isContinuous && fieldStats) {
        const { min, max } = fieldStats;
        if (threshold != null) {
            // Threshold mode
            colorValueFunction = (val) => Number(val) >= threshold ? HIGH_COLOR : LOW_COLOR;
        } else {
            // Gradient mode
            const interpolator = d3.interpolateRgb(LOW_COLOR, HIGH_COLOR);
            const colorScale = d3.scaleSequential(interpolator).domain([min, max]);
            colorValueFunction = (val) => {
                const numVal = Number(val);
                return isNaN(numVal) ? DARK_GRAY_COLOR : colorScale(numVal);
            };
        }
    } else {
        // Discrete mode (original logic)
        let colorIndex = 0;
        const colorScale = d3.schemeCategory10;
        if (fieldStats) {
            const sortedValues = Array.from(fieldStats.values).sort();
            sortedValues.forEach(val => {
                if (!(val in colorMap)) {
                    colorMap[val] = colorScale[colorIndex++ % colorScale.length];
                }
            });
        }
        colorValueFunction = (val) => colorMap[val] || DARK_GRAY_COLOR;
    }

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
      .attr('stroke-width', 2 * scaleFactor * branchWidth)
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
          setTooltipContent(`<strong>Click to prune this branch</strong>`);
        } else {
          setTooltipContent(`<strong>Branch length:</strong> ${length !== undefined ? d3.format(".4f")(length) : 'N/A'}`);
        }
      })
      .on('mouseleave', function (event, d) {
        const idx = links.indexOf(event);
        if (idx > -1) d3.select(branchPaths.nodes()[idx]).attr('stroke', LIGHT_GRAY_COLOR).attr('stroke-width', 2 * scaleFactor * branchWidth);
        setTooltipContent('');
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
      const maxDimension = radial ? maxRadius : size.width - margin - rightMargin;

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
      const outerRadius = radius + Math.max(minMargin, Math.min(maxMargin, minLabelLength * approxCharWidth));

      const arc = d3.arc()
        .innerRadius(radius - 30)
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
                  setTooltipContent('');
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
      .attr('r', d => Math.max(minNodeRadius, Math.min(maxNodeRadius, 3 * scaleFactor)) * nodeRadius)
      .style('cursor', extractMode ? 'pointer' : 'default')
      .attr('fill', d => {
        const val = d.data.nhx?.[colorField];
        return val != null ? colorValueFunction(val) : DARK_GRAY_COLOR;
      })
      .attr('stroke', d => {
        const { isHighlight, isPersistentHighlight } = getHighlightState(d);
        return isHighlight ? DARK_GRAY_COLOR : (isPersistentHighlight ? MAGENTA_COLOR : WHITE_COLOR);
      })
      .attr('stroke-width', d => {
        const { isHighlight, isPersistentHighlight } = getHighlightState(d);
        return isHighlight || isPersistentHighlight ? 2 : 1;
      })
      .on('mouseenter', function (event, d) {
        const nodeName = event.data?.name;
        const isLeaf = event.height == 0;
        const nhxData = event.data?.nhx || {};

        const nhxString =
          (nodeName ? `<div><span style="font-size: 14px; font-weight: bold;">${nodeName}</span></div>` : '') +
          (
            Object.entries(nhxData)
              .map(([key, val]) => `<div><strong>${key}</strong>: ${val}</div>`)
              .join('')
          );
        d3.select(this)
          // set a black border on hover
          .attr('stroke', 'black')
          .attr('stroke-width', 2);
        
          setTooltipContent(nhxString);

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
            const val = d.data.nhx?.[colorField];
            return val != null ? colorValueFunction(val) : DARK_GRAY_COLOR;
          })
          .attr('stroke', d => {
            const { isHighlight, isPersistentHighlight } = getHighlightState(d);
            return isHighlight ? DARK_GRAY_COLOR : (isPersistentHighlight ? MAGENTA_COLOR : WHITE_COLOR);
          })
          .attr('stroke-width', d => {
            const { isHighlight, isPersistentHighlight } = getHighlightState(d);
            return isHighlight || isPersistentHighlight ? 2 : 1;
          });
        setTooltipContent('');
        onHoverTip?.(null, null);
        setHighlightedNode(null);
      })
      .on('click', (event, d) => {


      if (extractMode) {
            onLeafSelect?.(event);
        } else {
            const name = event.data?.name;
            const isLeaf = event.height === 0;
            if (!isLeaf || !name) return;
            // Original highlighting logic for when extractMode is off
            setPanelData(prev => {
              const current = prev[id] || {};
              const prevHighlights = current.highlightedNodes || [];
              const already = prevHighlights.includes(name);
              const updated = already
                ? prevHighlights.filter(n => n !== name)
                : [...prevHighlights, name];
              return { ...prev, [id]: { ...current, highlightedNodes: updated } };
            });
        }
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
        const drawWidth = size.width - margin - rightMargin;
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
          const fontSizeToFit = availableWidth / (maxLabelLength * 0.35); // Using 0.35 as a character width heuristic
          baseSize = Math.min(baseSize, fontSizeToFit);
        }
        let factor = maxLabelLength < 10 ? 2 : 1;
        factor = radial ? factor : factor * 0.7;
        const finalSize = Math.max(minFontSize, Math.min(maxFontSize, baseSize * labelSize), 1 * labelSize * minFontSize) * factor;
        return isHighlight || isPersistentHighlight ? `${finalSize * 1.6}px` : `${finalSize}px`;
      })
      .style('fill', d => {
        const { isHighlight, isPersistentHighlight } = getHighlightState(d);
        if (extractMode && selectedLeaves.has(d.data.name)) {
            return '#2563EB'; // Blue for selected
        }
        return isHighlight ? DARK_GRAY_COLOR : (isPersistentHighlight ? MAGENTA_COLOR : DARK_GRAY_COLOR);
      })
      .style('font-weight', d => {
        const { isHighlight, isPersistentHighlight } = getHighlightState(d);
        if (extractMode && selectedLeaves.has(d.data.name)) {
            return 'bold';
        }
        return isHighlight || isPersistentHighlight ? 'bold' : 'normal';
      })
      .on('mouseenter', (event, d) => {
              setTooltipContent('');
              const nodeName = event.data?.name;
              onHoverTip?.(nodeName || '', id);
              setHighlightedNode(nodeName || null);

      })
      .on('mouseleave', () => {
        onHoverTip?.(null, null);
        setHighlightedNode(null);
      })
    .on('click', (event, d) => {
        // Pass the entire d3 node object up
        if (extractMode) {
            onLeafSelect?.(event);
        } else {
            const name = event.data?.name;
            // Original highlighting logic for when extractMode is off
            setPanelData(prev => {
                const current = prev[id] || {};
                const prevHighlights = current.highlightedNodes || [];
                const already = prevHighlights.includes(name);
                const updated = already ? prevHighlights.filter(n => n !== name) : [...prevHighlights, name];
                return { ...prev, [id]: { ...current, highlightedNodes: updated } };
            });
        }
      })


    // Dynamic legend and colorbar rendering
    legend.selectAll('*').remove();
    svg.selectAll('.colorbar-group').remove();

    // Case 1: The selected field is continuous
    if (isContinuous && fieldStats) {
        // Add colorbar title
        legend.append('text')
            .attr('x', 0)
            .attr('y', (_, i) => i * 20 + 12 -14)
            .text(colorField)
            .style('font-size', '12px')
            .style('fill', DARK_GRAY_COLOR)
            .style('font-weight', '350');

        // render the colorbar for continuous data
        const colorbarY = radial ? 26 : 26;
        const colorbarX = 20
        const colorbar = svg.append('g')
            .attr('class', 'colorbar-group')
            .attr('transform', `translate(${colorbarX}, ${colorbarY})`); // Set fixed top-left position
        const gradientID = `tree-gradient-${id}`;
        const defs = colorbar.append('defs');
        const linearGradient = defs.append('linearGradient').attr('id', gradientID);
        
        const colorScale = d3.scaleSequential(d3.interpolateRgb(LOW_COLOR, HIGH_COLOR))
            .domain([fieldStats.min, fieldStats.max]);

        linearGradient.selectAll("stop")
            .data(d3.range(0, 1.01, 0.1))
            .enter().append("stop")
            .attr("offset", d => `${d*100}%`)
            .attr("stop-color", d => {
                const value = fieldStats.min + d * (fieldStats.max - fieldStats.min);
                // If threshold is active, the gradient should also be binary
                return threshold != null ? (value >= threshold ? HIGH_COLOR : LOW_COLOR) : colorScale(value);
            });

        const barWidth = Math.min(150, size.width/4);
        const barHeight = 10;

        colorbar.append("rect")
            .attr("width", barWidth)
            .attr("height", barHeight)
            .style("fill", `url(#${gradientID})`)
            .attr("rx", 4)
            .style("stroke", "#ccc")
            .style("stroke-width", 1);
            

        const xScale = d3.scaleLinear()
            .domain([fieldStats.min, fieldStats.max])
            .range([0, barWidth]);

        const axis = colorbar.append("g")
            .attr("transform", `translate(0, ${barHeight - 4})`)
            .call(d3.axisBottom(xScale).ticks(5));
        

        // Remove the horizontal axis line
        axis.select(".domain").remove();

        // Remove the vertical tick lines
        axis.selectAll(".tick line").remove();

        colorbar.append('rect')
            .attr('width', barWidth)
            .attr('height', barHeight)
            .style('fill', 'transparent')
            .style('cursor', 'pointer')
            .on('click', function(event) {
                setPanelData(prev => {
                    const currentPanelData = prev[id] || {};
                    const newThresholds = { ...(currentPanelData.nhxThresholds || {}) };
                    if (newThresholds[colorField] != null) {
                        delete newThresholds[colorField];
                    } else {
                        const clickX = d3.mouse(this)[0];
                        newThresholds[colorField] = xScale.invert(clickX);
                    }
                    return { ...prev, [id]: { ...currentPanelData, nhxThresholds: newThresholds } };
                });
            
                
            })
          .on('mousemove', function() { 
                const containerRect = containerRef.current.getBoundingClientRect();
                const barRect = this.getBoundingClientRect(); // Get the colorbar's own position
                const relX = d3.mouse(this)[0];
                const value = xScale.invert(relX);

                setColorbarTooltip({
                    visible: true,
                    x: barRect.left - containerRect.left + relX,
                    y: barRect.bottom - containerRect.top + 11,
                    value: value,
                });
            })
            .on('mouseleave', () => {
                setColorbarTooltip({ visible: false, x: 0, y: 0, value: null });
            });
                
        
    } 
    // Case 2: The selected field is discrete
    else if (Object.keys(colorMap).length > 0) {
      const items = Object.entries(colorMap);
      legend.selectAll('rect')
        .data(items)
        .join('rect')
        .attr('x', 0)
        .attr('y', (_, i) => i * 20 -20)
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', d => d[1])
        .attr('rx', 4);
        

      legend.selectAll('text')
        .data(items)
        .join('text')
        .attr('x', 20)
        .attr('y', (_, i) => i * 20 + 12 -20)
        .text(d => `${colorField}: ${d[0]}`)
        .style('font-size', '12px')
        .style('fill', DARK_GRAY_COLOR)
        .style('font-weight', '400');
    }

    setDebugInfo(`Tree rendered successfully. Found ${Object.keys(colorMap).length} different ${colorField} values.`);
  }, [newickStr, isNhx, size, linkedTo, highlightOrigin, onHoverTip, highlightedNodes, linkedHighlights, radial, useBranchLengths,
     pruneMode, id, setPanelData, toNewick, nhxColorField, labelSize, nodeRadius, branchWidth,
      treeRadius, rightMargin,extractMode, selectedLeaves, onLeafSelect, onCountLeaves]);

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
        setTooltipContent('');
      }
    }
    document.addEventListener('mousemove', handleDocumentMouseMove);
    return () => document.removeEventListener('mousemove', handleDocumentMouseMove);
  }, [onHoverTip]);

    // Create a generic handler to update settings for the current view
    const handleSettingChange = (setting, value) => {
        const viewSettingsKey = radial ? 'radialSettings' : 'rectangularSettings';
        setPanelData(prev => {
            const currentPanelData = prev[id] || {};
            const currentViewSettings = currentPanelData[viewSettingsKey] || {};
            return {
                ...prev,
                [id]: {
                    ...currentPanelData,
                    [viewSettingsKey]: {
                        ...currentViewSettings,
                        [setting]: Array.isArray(value) ? value[0] : value,
                    },
                },
            };
        });
    };

  // Specific handler for the color field to also update local state.
const handleColorFieldChange = (field) => {
    setNhxColorField(field); 
    setPanelData(prev => ({
        ...prev,
        [id]: {
            ...prev[id],
            nhxColorField: field,
            nhxThresholds: { ...((prev[id] || {}).nhxThresholds || {}), [nhxColorField]: null }
        },
    }));
  };

   const handleContinuousToggle = (field, isContinuous) => {
    setPanelData(prev => {
        const currentPanelData = prev[id] || {};
        const continuousFields = { ...(currentPanelData.nhxContinuousFields || {}) };
        if (isContinuous) {
            continuousFields[field] = true;
        } else {
            delete continuousFields[field];
        }
        return {
            ...prev,
            [id]: {
                ...currentPanelData,
                nhxContinuousFields: continuousFields,
            },
        };
    });
  };


  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ overflow: 'hidden', position: 'relative' }}
      onMouseLeave={() => {
        onHoverTip?.(null, null);
        setHighlightedNode(null);
        setHighlightedLink(null);
        setTooltipContent('');
      }}
    >
      {/* The SVG is appended here by the useEffect hook */}

      {/* Control Panel */}
      {showControls && (
        <Box
          ref={controlsRef}
          sx={{
            position: 'absolute',
            bottom: 5,
            left: 5,
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 2,
            p: 1,
            boxShadow: 2,
            minWidth: 200,
            maxWidth: 300,
            maxHeight: 'calc(100% - 20px)',
            overflowY: 'auto',
            zIndex: 20,
          }}
        >
          <Box sx={{ mb: 1 }}>
            <Chip
              label="Style"
              size="small"
              sx={{
                mb: 1.5,
                bgcolor: '#DBEAFE',
                color: 'black',
                fontWeight: 300,
                borderRadius: 1.5,
                fontSize: 10,
                px: 0.5,
                boxShadow: 1,
              }}
            />
            {/* Label Size Slider */}
            <Box sx={{ mb: 1 }}>
              <Chip
                label={`Label size: ${Math.round(labelSize * 100)}%`}
                size="small"
                sx={{ mb: 0.5, bgcolor: '#E5E7EB', color: 'black', fontWeight: 300, borderRadius: 1.5, fontSize: 9, px: 0.5, boxShadow: 1 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                <Slider
                  value={labelSize}
                  onChange={(_, v) => handleSettingChange('labelSize', v)}
                  step={0.1}
                  min={0.2}
                  max={3}
                  size="small"
                  sx={{ width: '90%', maxWidth: 180, color: 'rgba(0,0,0,0.47)', mx: 'auto', '& .MuiSlider-track': { border: 'none' }, '& .MuiSlider-thumb': { width: 16, height: 16, backgroundColor: '#fff', '&::before': { boxShadow: '0 4px 8px rgba(0,0,0,0.4)' }, '&:hover, &.Mui-focusVisible, &.Mui-active': { boxShadow: 'none' } } }}
                />
              </Box>
            </Box>
            {/* Node Radius Slider */}
            <Box sx={{ mb: 1 }}>
              <Chip
                label={`Node radius: ${Math.round(nodeRadius * 100)}%`}
                size="small"
                sx={{ mb: 0.5, bgcolor: '#E5E7EB', color: 'black', fontWeight: 300, borderRadius: 1.5, fontSize: 9, px: 0.5, boxShadow: 1 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                <Slider
                  value={nodeRadius}
                  onChange={(_, v) => handleSettingChange('nodeRadius', v)}
                  step={0.1}
                  min={0.2}
                  max={3}
                  size="small"
                  sx={{ width: '90%', maxWidth: 180, color: 'rgba(0,0,0,0.47)', mx: 'auto', '& .MuiSlider-track': { border: 'none' }, '& .MuiSlider-thumb': { width: 16, height: 16, backgroundColor: '#fff', '&::before': { boxShadow: '0 4px 8px rgba(0,0,0,0.4)' }, '&:hover, &.Mui-focusVisible, &.Mui-active': { boxShadow: 'none' } } }}
                />
              </Box>
            </Box>
            {/* Branch Stroke Width Slider */}
            <Box sx={{ mb: 1 }}>
              <Chip
                label={`Branch width: ${Math.round(branchWidth * 100)}%`}
                size="small"
                sx={{ mb: 0.5, bgcolor: '#E5E7EB', color: 'black', fontWeight: 300, borderRadius: 1.5, fontSize: 9, px: 0.5, boxShadow: 1 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                <Slider
                  value={branchWidth}
                  onChange={(_, v) => handleSettingChange('branchWidth', v)}
                  step={0.1}
                  min={0.2}
                  max={3}
                  size="small"
                  sx={{ width: '90%', maxWidth: 180, color: 'rgba(0,0,0,0.47)', mx: 'auto', '& .MuiSlider-track': { border: 'none' }, '& .MuiSlider-thumb': { width: 16, height: 16, backgroundColor: '#fff', '&::before': { boxShadow: '0 4px 8px rgba(0,0,0,0.4)' }, '&:hover, &.Mui-focusVisible, &.Mui-active': { boxShadow: 'none' } } }}
                />
              </Box>
            </Box>
            {/* Tree Radius Slider (Radial Mode Only) */}
            {radial && (
              <Box sx={{ mb: 1 }}>
                <Chip
                  label={`Tree radius: ${Math.round(treeRadius * 100)}%`}
                  size="small"
                  sx={{ mb: 0.5, bgcolor: '#E5E7EB', color: 'black', fontWeight: 300, borderRadius: 1.5, fontSize: 9, px: 0.5, boxShadow: 1 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                  <Slider
                    value={treeRadius}
                    onChange={(_, v) => handleSettingChange('treeRadius', v)}
                    step={0.05}
                    min={0.1}
                    max={3}
                    size="small"
                    sx={{ width: '90%', maxWidth: 180, color: 'rgba(0,0,0,0.47)', mx: 'auto', '& .MuiSlider-track': { border: 'none' }, '& .MuiSlider-thumb': { width: 16, height: 16, backgroundColor: '#fff', '&::before': { boxShadow: '0 4px 8px rgba(0,0,0,0.4)' }, '&:hover, &.Mui-focusVisible, &.Mui-active': { boxShadow: 'none' } } }}
                  />
                </Box>
              </Box>
            )}
            {/* Right Margin Slider (Rectangular Mode Only) */}
            {!radial && (
              <Box sx={{ mb: 1 }}>
                <Chip
                  label={`Right margin: ${rightMargin}px`}
                  size="small"
                  sx={{ mb: 0.5, bgcolor: '#E5E7EB', color: 'black', fontWeight: 300, borderRadius: 1.5, fontSize: 10, px: 0.5, boxShadow: 1 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                  <Slider
                    value={rightMargin}
                    onChange={(_, v) => handleSettingChange('rightMargin', v)}
                    step={1}
                    min={10}
                    max={200}
                    size="small"
                    sx={{ width: '90%', maxWidth: 180, color: 'rgba(0,0,0,0.47)', mx: 'auto', '& .MuiSlider-track': { border: 'none' }, '& .MuiSlider-thumb': { width: 16, height: 16, backgroundColor: '#fff', '&::before': { boxShadow: '0 4px 8px rgba(0,0,0,0.4)' }, '&:hover, &.Mui-focusVisible, &.Mui-active': { boxShadow: 'none' } } }}
                  />
                </Box>
              </Box>
            )}
          </Box>
          {(Object.keys(nhxFieldStats).length > 0) && (
          <Box sx={{ mb: 1 }}>
            <Chip
              label="Color by NHX field"
              size="small"
              sx={{
                mb: 1.5,
                bgcolor: '#DBEAFE',
                color: 'black',
                fontWeight: 300,
                borderRadius: 1.5,
                fontSize: 10,
                px: 0.5,
                boxShadow: 1,
              }}
            />
            <Stack spacing={0.4}>
              <Button
                key="none"
                size="small"
                variant={!nhxColorField ? "contained" : "outlined"}
                onClick={() => handleColorFieldChange(null)}
                sx={{
                  justifyContent: 'center', textTransform: 'none',
                  backgroundColor: !nhxColorField ? '#60a5fa' : 'inherit',
                }}
              >
                None
              </Button>
              {(Object.keys(nhxFieldStats).length > 0) ? Object.keys(nhxFieldStats).map(field => {
                 const stats = nhxFieldStats[field];
                 const isAmbiguous = stats.isNumeric && !stats.hasFloat && stats.values.size > 1;
                 return (
                    <div key={field}>
                        <Button
                            size="small"
                            variant={nhxColorField === field ? "contained" : "outlined"}
                            onClick={() => handleColorFieldChange(field)}
                            sx={{
                                width: '100%', justifyContent: 'center', textTransform: 'none',
                                backgroundColor: nhxColorField === field ? '#60a5fa' : 'inherit',
                            }}
                        >
                            {field}
                        </Button>
                        {nhxColorField === field && isAmbiguous && (
                            <FormControlLabel
                                control={
                                    <Switch
                                        size="small"
                                        checked={!!(nhxContinuousFields && nhxContinuousFields[field])}
                                        onChange={(e) => handleContinuousToggle(field, e.target.checked)}
                                    />
                                }
                                label={<span style={{ fontSize: '12px', color: DARK_GRAY_COLOR }}>Treat as continuous</span>}
                                sx={{ ml: 1, display: 'flex', justifyContent: 'center' }}
                            />
                        )}
                    </div>
                 )
              }) : <div style={{ fontSize: 12, color: DARK_GRAY_COLOR, padding: '4px' }}>No NHX fields found</div>}
            </Stack>
          </Box>
          )}
        </Box>
      )}

      {/* Tooltip */}
      <div
        className="tooltip"
        style={{
          ...tooltipStyle,
          left: '10px',
          bottom: '10px',
          maxWidth: '300px',
          display: tooltipContent ? 'block' : 'none',
        }}
        dangerouslySetInnerHTML={{ __html: tooltipContent }}
      />

      {/* Toggle Controls Button */}
      {!showControls  && (
        <IconButton
          size="large"
          sx={{
            position: 'absolute',
            bottom: 12,
            left: 16,
            background: 'rgba(255, 255, 255, 0.9)',
            boxShadow: 2,
            zIndex: 8,
            '&:hover': {
              background: '#bfdafcd7',
              boxShadow: 4,
            },
          }}
          onClick={() => setShowControls(true)}
        >
        </IconButton>
      )}
    {colorbarTooltip.visible && (
        <div
          className="absolute pointer-events-none z-50 bg-transparent text-black text-xs px-2 py-2 rounded"
          style={{
            left: colorbarTooltip.x,
            top: colorbarTooltip.y,
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
          }}
        >
          {colorbarTooltip.value.toFixed(4)}
        </div>
      )}
    </div>
  );
};

export default React.memo(PhyloTreeViewer);