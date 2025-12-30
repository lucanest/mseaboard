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
  onHoverTip,
  linkedTo,
  radial = false,
  viewMode = 'radial',
  linkedHighlights = [],
  useBranchLengths = false,
  pruneMode = false,
  toNewick,
  extractMode = false,
  rerootMode = false,
  onLeafSelect,
  selectedLeaves = new Set(),
  onCountLeaves,
}) => {
  const containerRef = useRef();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [highlightedNode, setHighlightedNode] = useState(null);
  const [showControls, setShowControls] = useState(false);
  const [nhxFieldStats, setNhxFieldStats] = useState({});
  const [tooltipContent, setTooltipContent] = useState('');
  const [colorbarTooltip, setColorbarTooltip] = useState({ visible: false, x: 0, y: 0, value: null });
  const controlsRef = useRef(null);
  const isInteractingRef = useRef(false);
  const [thresholdEdit, setThresholdEdit] = useState({ visible: false, x: 0, y: 0, value: '' });

  const shiftPressedRef = useRef(false);
  const zPressedRef = useRef(false);


  // Track Shift and Z key states for panning
  useEffect(() => {
    const handleKey = (e) => { 
      if (e.key === 'Shift') shiftPressedRef.current = e.type === 'keydown';
      if (e.key.toLowerCase() === 'z') zPressedRef.current = e.type === 'keydown';
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);
    return () => { 
      window.removeEventListener('keydown', handleKey); 
      window.removeEventListener('keyup', handleKey); 
    };
  }, []);



  // Destructure view-independent data from panelData.
  const {
    data: newickStr,
    highlightedNodes = [],
    nhxColorField: initialNhxColorField,
    nhxContinuousFields,
    nhxThresholds,
    radialSettings = {}, // Default to empty objects if not present
    rectangularSettings = {},
    unrootedSettings = {},
    colorSettings = {},
  } = panelData || {};

  const isUnrooted = viewMode === 'unrooted';

  // Determine the current view's settings.
  const currentViewSettings = isUnrooted ? unrootedSettings : (radial ? radialSettings : rectangularSettings);
  const {
    labelSize = 1,
    nodeRadius = 1,
    branchWidth = 1,
    treeRadius = 1, 
    rightMargin = 100, 
    colorLabels = false,
    colorBranches = false,
    arc = 360,
    labelExtension = 30, 
    rotation = 0,
    panX = 0,
    panY = 0,
    legendX = 20,
    legendY = 20,
  } = currentViewSettings;

  const COLORBAR_HEIGHT = 50; // Title + Bar + Axis


  // Manage the nhxColorField state. Use an internal state
  // that is initialized from props. This allows for automatic field detection logic
  // to run without immediately propagating a change upwards.
  const [nhxColorField, setNhxColorField] = useState(initialNhxColorField);
  useEffect(() => {
    setNhxColorField(initialNhxColorField);
  }, [initialNhxColorField]);

  // Helper to identify fields that should default to continuous
  const isBootstrapField = (name) => {
    if (!name) return false;
    const lower = name.toLowerCase();
    return ['bootstrap', 'b', 'bp', 'support', 'conf'].includes(lower);
  };

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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showControls]);

  const handleColorChange = (type, value) => {
  setPanelData(prev => ({
    ...prev,
    [id]: {
      ...prev[id],
      colorSettings: { ...(prev[id].colorSettings || {}), [type]: value }
    }
  }));
  };

  const handleDiscreteColorChange = (value, color) => {
    setPanelData(prev => {
      const current = prev[id].colorSettings || {};
      const discreteMap = current.discrete || {};
      const fieldMap = discreteMap[nhxColorField] || {};
      return {
        ...prev,
        [id]: {
          ...prev[id],
          colorSettings: {
            ...current,
            discrete: { ...discreteMap, [nhxColorField]: { ...fieldMap, [value]: color } }
          }
        }
      };
    });
  };

  const handleInvertColors = () => {
    setPanelData(prev => {
      const settings = prev[id].colorSettings || {};
      const high = settings.high || HIGH_COLOR;
      const low = settings.low || LOW_COLOR;
      return {
        ...prev,
        [id]: {
          ...prev[id],
          colorSettings: { ...settings, high: low, low: high }
        }
      };
    });
  };

      const handleRerootClick = (d) => {
      // d is the link object: {source: parent, target: child}
      const nodeV = d.target;
      const nodeU = d.source;
      const originalLength = nodeV.data.length || 0;
      const halfLength = originalLength / 2;

      // Helper to recursively reverse parent-child relationships
      const reverseEdge = (currentNode, newParent, edgeLength) => {
        const oldParent = currentNode.parent;
        const oldLength = currentNode.data.length;

        // Set the new parent
        currentNode.parent = newParent;
        currentNode.data.length = edgeLength;

        // Remove the new parent from current node's children if it was there
        if (currentNode.children) {
            currentNode.children = currentNode.children.filter(c => c !== newParent);
        }

        // Add the old parent as a child and recurse
        if (oldParent) {
            if (!currentNode.children) currentNode.children = [];
            currentNode.children.push(oldParent);
            reverseEdge(oldParent, currentNode, oldLength);
        }

        // If this was an internal node with no children left, remove the children property
        if (currentNode.children && currentNode.children.length === 0) {
            delete currentNode.children;
        }
      };

      // Create the new root node
      const newRootData = { name: "new_root", children: [] };
      const newRoot = d3.hierarchy(newRootData);

      // Child side of the clicked branch
      nodeV.parent = newRoot;
      nodeV.data.length = halfLength;

      // Parent side of the clicked branch
      // We essentially treat the parent node (nodeU) as if it's now a child of newRoot
      // and reverse all relationships back to the old root.
      const oldParentOfU = nodeU.parent;
      const lengthUtoParent = nodeU.data.length;

      // Remove nodeV from nodeU's children
      nodeU.children = nodeU.children.filter(c => c !== nodeV);
      
      if (!nodeU.children) nodeU.children = [];
      if (oldParentOfU) {
          nodeU.children.push(oldParentOfU);
          reverseEdge(oldParentOfU, nodeU, lengthUtoParent);
      }
      
      nodeU.parent = newRoot;
      nodeU.data.length = halfLength;

      newRoot.children = [nodeV, nodeU];

      // Cleanup unary nodes (specifically the old root which might now have only 1 child)
      const finalize = (node) => {
          if (node.children && node.children.length === 1) {
              const singleChild = node.children[0];
              const combinedLength = (node.data.length || 0) + (singleChild.data.length || 0);
              singleChild.parent = node.parent;
              singleChild.data.length = combinedLength;
              return singleChild;
          }
          if (node.children) {
              node.children = node.children.map(finalize);
          }
          return node;
      };

      const finalRoot = finalize(newRoot);
      const newNewick = toNewick(finalRoot) + ";";

      setPanelData(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          data: newNewick,
          rerootMode: false // Exit mode
        }
      }), true);
    };

  useEffect(() => {
    if (!newickStr || !size.width || !size.height) return;

    const container = containerRef.current;
    d3.select(container).selectAll('svg').remove();

    let parsed;
    try {
      parsed = parseNewick(newickStr);
    } catch (err) {
      return;
    }

    const getHighlightState = (d) => {
      const isHighlight = highlightedNode === d.data.name || linkedHighlights.includes(d.data.name);
      const isPersistentHighlight = highlightedNodes.includes(d.data.name);
      return { isHighlight, isPersistentHighlight };
    };

    const extractNhxData = (nameWithNhx) => {
      if (!nameWithNhx) return { name: nameWithNhx || '', nhx: {} };
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
    const maxMargin = (radial || isUnrooted) ? 140 : rightMargin;
    const margin = Math.max(minMargin, Math.min(maxMargin, maxLabelLength * approxCharWidth));
    const radius = (Math.min(size.width, size.height) / 2 - margin) * ((radial || isUnrooted) ? treeRadius : 1);
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
      
    if (bestField && bestField !== initialNhxColorField) {
    setNhxColorField(bestField);
    setPanelData(prev => ({
      ...prev,
      [id]: { ...prev[id], nhxColorField: bestField },
    }));  
      }
      }

    const svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', [0, 0, size.width, size.height])
      .style('font', '10px sans-serif');

    // Clear highlight whenever the mouse leaves the SVG area
    svg.on('mousemove', function() {
      if (isInteractingRef.current) return; // Ignore if dragging/panning
        if (d3.event.target === this) {
            setHighlightedNode(null);
            onHoverTip?.(null, null);
        }
    });

    
    const getTransform = (px, py) => {
      if (isUnrooted || radial) {
        return `translate(${size.width / 2 + px}, ${size.height / 2 + py}) rotate(${rotation})`;
      }
      return `translate(${20 + px}, ${20 + py})`;
    };

    const g = svg.append('g').attr('transform', getTransform(panX, panY));

     // Group for the Legend/Colorbar
    const legendGroup = svg.append('g')
      .attr('class', 'legend-container')
      .attr('transform', `translate(${legendX}, ${legendY})`);

    // Local variables to track the "active" position during the drag
    let activeX = legendX;
    let activeY = legendY;

    // --- DRAG LOGIC FOR LEGEND (Key: Z) ---
    const dragLegend = d3.drag()
      .filter(() => zPressedRef.current)
      .on('start', () => {
        isInteractingRef.current = true;
        // Disable pointer events on the tree so nodes don't trigger hovers
        g.style('pointer-events', 'none');
      })
      .on('drag', () => {
        activeX += d3.event.dx;
        activeY += d3.event.dy;
        legendGroup.attr('transform', `translate(${activeX}, ${activeY})`);
      })
      .on('end', () => {
        isInteractingRef.current = false;
        g.style('pointer-events', 'auto'); // Re-enable tree hovers

        if (activeX === legendX && activeY === legendY) return;
        const viewKey = isUnrooted ? 'unrootedSettings' : (radial ? 'radialSettings' : 'rectangularSettings');
        
        setPanelData(prev => ({
          ...prev,
          [id]: { 
            ...prev[id], 
            [viewKey]: { ...(prev[id][viewKey] || {}), legendX: activeX, legendY: activeY } 
          }
        }), true); // Pass 'true' to save this position to history
      });

    // --- PANNING LOGIC FOR TREE (Key: Shift) ---
    const zoom = d3.zoom()
      .filter(() => shiftPressedRef.current && !d3.event.button)
      .on('start', () => {
        isInteractingRef.current = true;
        // Disable pointer events on the legend so it doesn't interfere
        legendGroup.style('pointer-events', 'none'); 
      })
      .on('zoom', () => {
        g.attr('transform', getTransform(d3.event.transform.x, d3.event.transform.y));
      })
      .on('end', () => {
        isInteractingRef.current = false;
        legendGroup.style('pointer-events', 'auto');
        
        const { x, y } = d3.event.transform;
        if (x === panX && y === panY) return;
        const viewKey = isUnrooted ? 'unrootedSettings' : (radial ? 'radialSettings' : 'rectangularSettings');
        setPanelData(prev => ({
          ...prev,
          [id]: { 
            ...prev[id], 
            [viewKey]: { ...(prev[id][viewKey] || {}), panX: x, panY: y } 
          }
        }), true);
      });

    // Initialize position without triggering a re-render loop
    svg.call(zoom).call(zoom.transform, d3.zoomIdentity.translate(panX, panY));
            //.on("dblclick.zoom", null);
    svg.call(dragLegend);

    let treePxPerUnit = 1; // Default fallback  

    if (isUnrooted) {
      // Unrooted Layout: Equal Angle Algorithm
      root.count(); 
      
      const layoutUnrooted = (node, startAngle, endAngle) => {
        const totalAngle = endAngle - startAngle;
        let currentAngle = startAngle;
        
        if (node.children) {
          node.children.forEach(child => {
            const childAngleWidth = totalAngle * (child.value / node.value);
            const midAngle = currentAngle + childAngleWidth / 2;
            
            const branchLen = useBranchLengths ? (child.data.length || 0.1) : 1;
            child.x = node.x + branchLen * Math.cos(midAngle);
            child.y = node.y + branchLen * Math.sin(midAngle);
            child.angle = midAngle; // Store angle for label orientation
            
            layoutUnrooted(child, currentAngle, currentAngle + childAngleWidth);
            currentAngle += childAngleWidth;
          });
        }
      };

      // Special handling for the binary root: draw as one joined branch
      if (root.children && root.children.length === 2) {
        const [c1, c2] = root.children;
        const totalVal = c1.value + c2.value;
        
        root.x = 0;
        root.y = 0;
        root.angle = 0;

        const b1 = useBranchLengths ? (c1.data.length || 0.1) : 1;
        const b2 = useBranchLengths ? (c2.data.length || 0.1) : 1;

        c1.x = b1; c1.y = 0; c1.angle = 0;
        c2.x = -b2; c2.y = 0; c2.angle = Math.PI;

        const area1 = (c1.value / totalVal) * 2 * Math.PI;
        const area2 = (c2.value / totalVal) * 2 * Math.PI;
        
        layoutUnrooted(c1, -area1 / 2, area1 / 2);
        layoutUnrooted(c2, Math.PI - area2 / 2, Math.PI + area2 / 2);
      } else {
        root.x = 0;
        root.y = 0;
        root.angle = 0;
        layoutUnrooted(root, 0, 2 * Math.PI);
      }

      // Normalize coordinates to fit panel
      const nodes = root.descendants();
      let maxD = 0;
      nodes.forEach(d => {
        const d_dist = Math.sqrt(d.x * d.x + d.y * d.y);
        if (d_dist > maxD) maxD = d_dist;
      });
      const safeRadius = (Math.min(size.width, size.height) / 2 - margin - 10);
      const multiplier = maxD > 0 ? (safeRadius * treeRadius) / maxD : 1;
      treePxPerUnit = multiplier; 
      nodes.forEach(d => {
        d.x *= multiplier;
        d.y *= multiplier;
      });

    } else if (radial) {
      const leavesCount = root.leaves().length;
      const effectiveArc =  (arc * (leavesCount - 1) / leavesCount);
      const arcRadians = (effectiveArc * Math.PI) / 180;
      // D3 layout for Radial mode (y = radius, x = angle)
      d3.tree().size([arcRadians, maxRadius])(root);


      // Override y based on branch length option
      if (useBranchLengths) {
        root.each(d => {
          d.y = (d.parent ? d.parent.y : 0) + (d.data.length || 0);
        });
        const maxLen = d3.max(root.descendants(), d => d.y);
        if (maxLen > 0) {
          const radiusScale = maxRadius / maxLen;
          treePxPerUnit = radiusScale; 
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

       // Update equally space leaves to respect the arc
      const leaves = root.leaves();
      const angleStep = leaves.length > 1 ? arcRadians / (leaves.length - 1) : 0;
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
          treePxPerUnit = scaleY;
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
    
    // Determine default behavior: Continuous if Float or (Numeric & Bootstrap-like)
    const isDefaultContinuous = fieldStats && fieldStats.isNumeric && (
        fieldStats.hasFloat || isBootstrapField(colorField)
    );

    // Check for user override, override takes precedence, otherwise use default
    const userOverride = nhxContinuousFields?.[colorField];
    const isContinuous = userOverride !== undefined ? userOverride : isDefaultContinuous;

    const threshold = nhxThresholds?.[colorField];
    let colorValueFunction;
    let colorMap = {};

    const currentHigh = colorSettings.high || HIGH_COLOR;
    const currentLow = colorSettings.low || LOW_COLOR;
    const currentDiscrete = colorSettings.discrete?.[colorField] || {};

    if (isContinuous && fieldStats) {
        const { min, max } = fieldStats;
        if (threshold != null) {
            // Threshold mode
            colorValueFunction = (val) => Number(val) >= threshold ? currentHigh : currentLow;
        } else {
            // Gradient mode
            const interpolator = d3.interpolateRgb(currentLow, currentHigh);
            const colorScale = d3.scaleSequential(interpolator).domain([min, max]);
            colorValueFunction = (val) => {
                const numVal = Number(val);
                return isNaN(numVal) ? DARK_GRAY_COLOR : colorScale(numVal);
            };
        }
    } else {
        // Discrete mode
        let colorIndex = 0;
        const colorScale = d3.schemeCategory10;
        if (fieldStats) {
            const sortedValues = Array.from(fieldStats.values).sort();
            sortedValues.forEach(val => {
                if (!(val in colorMap)) {
                    colorMap[val] = currentDiscrete[val] || colorScale[colorIndex++ % colorScale.length];
                }
            });
        }
        colorValueFunction = (val) => colorMap[val] || DARK_GRAY_COLOR;
    }

    // Generate links, each is { source, target }
    let links = root.links();
    // Intercept to join binary root branches in unrooted view
    if (isUnrooted && root.children && root.children.length === 2) {
      const [c1, c2] = root.children;
      const joinedLink = {
        source: c1,
        target: c2,
        isRootBranch: true,
        data: {
          length: (c1.data.length || 0) + (c2.data.length || 0)
        }
      };
      links = links.filter(l => l.source !== root);
      links.push(joinedLink);
    }


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

    const unrootedLinkGenerator = (d) => `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`;

    const linkPathGen = isUnrooted ? unrootedLinkGenerator : (radial ? classicRadialLinkGenerator : classicRectangularLinkGenerator);

    // Visible branches
    const branchPaths = g.append('g')
      .selectAll('path.branch')
      .data(links)
      .join('path')
      .attr('class', 'branch')
      .attr('fill', 'none')
      .style('pointer-events', 'none')
      .attr('stroke', d => {
        if (colorBranches && colorField) {
          const valS = d.source.data.nhx?.[colorField];
          const valT = d.target.data.nhx?.[colorField];
          const colS = valS != null ? colorValueFunction(valS) : LIGHT_GRAY_COLOR;
          const colT = valT != null ? colorValueFunction(valT) : LIGHT_GRAY_COLOR;
          return d3.interpolateRgb(colS, colT)(0.5);
        }
        return LIGHT_GRAY_COLOR;
      })
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
        if (isInteractingRef.current) return;
        const idx = links.indexOf(event);
        if (idx > -1) {
          const branchPath = d3.select(branchPaths.nodes()[idx]);
          if (pruneMode) {
            branchPath.attr('stroke', '#E50000');
          } else if (rerootMode) {
            branchPath.attr('stroke', '#C3420D');
          } else {
            branchPath.attr('stroke', MAGENTA_COLOR);
          }
        }

        const length = event.isRootBranch ? (event.data?.length) : (event?.target?.data?.length);
        if (pruneMode) {
          setTooltipContent(`<strong>Click to prune this branch</strong>`);
         } else if (rerootMode) {
          setTooltipContent(`<strong>Click to place root on this branch</strong>`);  
        } else {
          setTooltipContent(`<strong>Branch length:</strong> ${length !== undefined ? d3.format(".4f")(length) : 'N/A'}`);
        }
      })
      .on('mouseleave', function (event, d) {
        const idx = links.indexOf(event);
        if (idx > -1) {
          d3.select(branchPaths.nodes()[idx])
            .attr('stroke', d => {
              if (colorBranches && colorField) {
                const valS = d.source.data.nhx?.[colorField];
                const valT = d.target.data.nhx?.[colorField];
                const colS = valS != null ? colorValueFunction(valS) : LIGHT_GRAY_COLOR;
                const colT = valT != null ? colorValueFunction(valT) : LIGHT_GRAY_COLOR;
                return d3.interpolateRgb(colS, colT)(0.5);
              }
              return LIGHT_GRAY_COLOR;
            })
            .attr('stroke-width', 2 * scaleFactor * branchWidth);
        }
        setTooltipContent('');
      })
      .on('click', (event, d) => {
        if (!pruneMode && !rerootMode) return;

        if (rerootMode) {
          handleRerootClick(event);
          return;
        }
        else if (pruneMode) {
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

        // Update the panel data and force a history save.
        setPanelData(prev => ({
          ...prev,
          [id]: {
            ...prev[id],
            data: newNewickString,
          }
        }), true);
      }
      });


    // Add dotted lines for label alignment (Radial or Unrooted mode)
    if (useBranchLengths || isUnrooted) {
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
          if (isUnrooted) {
            const ex = d.x + labelExtension * Math.cos(d.angle);
            const ey = d.y + labelExtension * Math.sin(d.angle);
            return `M ${d.x},${d.y} L ${ex},${ey}`;
          }
          if (radial) {
            if (d.y >= maxDimension) return null; 
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


if (radial && !isUnrooted) {
  const leaves = root.leaves();
  const leavesCount = leaves.length;
  const effectiveArc = (arc * (leavesCount - 1) / leavesCount);
  const arcRadians = (effectiveArc * Math.PI) / 180;
  const angleStep = leavesCount > 1 ? arcRadians / (leavesCount - 1) : 0;
  
  const outerRadius = radius + Math.max(minMargin, Math.min(maxMargin, minLabelLength * approxCharWidth));

      const arcGen = d3.arc()
        .innerRadius(radius - 30)
        .outerRadius(outerRadius)
        .startAngle(d => d.x - angleStep / 2)
        .endAngle(d => d.x + angleStep / 2);

      g.append('g')
        .selectAll('path.hover-arc')
        .data(leaves)
        .join('path')
        .attr('class', 'hover-arc')
        .attr('d', arcGen)
        .attr('fill', 'transparent')
        .on('mouseenter', (event, d) => {
          if (isInteractingRef.current) return;
                  setTooltipContent('');
                  const nodeName = event.data?.name;
                  onHoverTip?.(nodeName || '', id);
                  setHighlightedNode(nodeName || null);
        })
        .on('mousemove', function (event, d) {
          if (isInteractingRef.current) return;
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
      .data(root.descendants().filter(d => isUnrooted ? d !== root : true)) // Don't draw binary root in unrooted view
      .join('circle')
      .attr('transform', d => {
        if (isUnrooted) return `translate(${d.x},${d.y})`;
        return radial ? `rotate(${(d.x * 180 / Math.PI - 90)}) translate(${d.y},0)` : null;
      })
      .attr('cx', d => (radial || isUnrooted) ? null : d.y) 
      .attr('cy', d => (radial || isUnrooted) ? null : d.x) 
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
        if (isInteractingRef.current) return;
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
        if (isUnrooted) {
            const ex = d.x + labelExtension * Math.cos(d.angle);
            const ey = d.y + labelExtension * Math.sin(d.angle);
            let branchRotation = d.angle * 180 / Math.PI;
            // Calculate total screen angle to determine if flip is needed
            let screenAngle = (branchRotation + rotation) % 360;
            if (screenAngle < 0) screenAngle += 360;
            const isFlipped = screenAngle > 90 && screenAngle < 270;
            if (isFlipped) branchRotation += 180;
            return `translate(${ex},${ey}) rotate(${branchRotation})`;
        }
        if (!radial) return null;
        const labelRadius = (useBranchLengths && d.y < maxRadius) ? maxRadius : d.y;
        let branchRotation = (d.x * 180 / Math.PI - 90);
        let screenAngle = (branchRotation + rotation) % 360;
        if (screenAngle < 0) screenAngle += 360;
        const isFlipped = screenAngle > 90 && screenAngle < 270;
        const flipRotation = isFlipped ? 180 : 0;
        return `rotate(${branchRotation}) translate(${labelRadius},0) rotate(${flipRotation})`;
      })
      .attr('x', d => {
        if (isUnrooted) {
            let screenAngle = (d.angle * 180 / Math.PI + rotation) % 360;
            if (screenAngle < 0) screenAngle += 360;
            return (screenAngle > 90 && screenAngle < 270) ? -6 : 6;
        }
        if (radial) {
            let screenAngle = (d.x * 180 / Math.PI - 90 + rotation) % 360;
            if (screenAngle < 0) screenAngle += 360;
            return (screenAngle > 90 && screenAngle < 270) ? -6 : 6;
        }
        const drawWidth = size.width - margin - rightMargin;
        const labelPos = useBranchLengths ? drawWidth : d.y;
        return labelPos + 6;
      })
      .attr('y', d => (radial || isUnrooted) ? null : d.x) 
      .attr('text-anchor', d => {
        if (isUnrooted) {
            let screenAngle = (d.angle * 180 / Math.PI + rotation) % 360;
            if (screenAngle < 0) screenAngle += 360;
            return (screenAngle > 90 && screenAngle < 270) ? 'end' : 'start';
        }
        if (radial) {
            let screenAngle = (d.x * 180 / Math.PI - 90 + rotation) % 360;
            if (screenAngle < 0) screenAngle += 360;
            return (screenAngle > 90 && screenAngle < 270) ? 'end' : 'start';
        }
        return 'start';
      })
      .attr('dy', (radial || isUnrooted) ? '0.35em' : null)
      .attr('dominant-baseline', (radial || isUnrooted) ? 'auto' : 'middle')
      .text(d => (d.data && typeof d.data.name !== 'undefined') ? d.data.name : '')
      .style('font-size', d => {
        const { isHighlight, isPersistentHighlight } = getHighlightState(d);
        let baseSize = 12 * fontScale;
        if (radial && !isUnrooted && maxLabelLength > 0) {
          const availableWidth = margin - 12; 
          const fontSizeToFit = availableWidth / (maxLabelLength * 0.35); // Using 0.35 as a character width heuristic
          baseSize = Math.min(baseSize, fontSizeToFit);
        }
        let factor = maxLabelLength < 10 ? 2.2 : 1;
        factor = radial ? factor : factor * 0.7;
        const finalSize = Math.max(minFontSize, Math.min(maxFontSize, baseSize * labelSize), 1 * labelSize * minFontSize) * factor;
        return isHighlight || isPersistentHighlight ? `${finalSize * 1.6}px` : `${finalSize}px`;
      })
      .style('fill', d => {
        const { isHighlight, isPersistentHighlight } = getHighlightState(d);
        if (extractMode && selectedLeaves.has(d.data.name)) {
            return '#2563EB'; // Blue for selected
        }
        if (colorLabels) {
            const val = d.data.nhx?.[colorField];
            return val != null ? colorValueFunction(val) : DARK_GRAY_COLOR;
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
        if (isInteractingRef.current) return;
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
        if (extractMode) {
            onLeafSelect?.(event);
        } else {
            const name = event.data?.name;
            setPanelData(prev => {
                const current = prev[id] || {};
                const prevHighlights = current.highlightedNodes || [];
                const already = prevHighlights.includes(name);
                const updated = already ? prevHighlights.filter(n => n !== name) : [...prevHighlights, name];
                return { ...prev, [id]: { ...current, highlightedNodes: updated } };
            });
        }
      }
    )

    // Dynamic legend and colorbar rendering

    // Case 1: The selected field is continuous
    if (isContinuous && fieldStats) {
       // Title
        legendGroup.append('text')
            .attr('x', 0)
            .attr('y', -2)
            .text(colorField)
            .style('font-size', '12px')
            .style('fill', DARK_GRAY_COLOR)
            .style('font-weight', '350');

        const colorbar = legendGroup.append('g')
            .attr('class', 'colorbar-group')
            .attr('transform', `translate(0, 6)`);
        const gradientID = `tree-gradient-${id}`;
        const defs = colorbar.append('defs');
        const linearGradient = defs.append('linearGradient').attr('id', gradientID);
        
         const colorScale = d3.scaleSequential(d3.interpolateRgb(currentLow, currentHigh))
        .domain([fieldStats.min, fieldStats.max]);

        linearGradient.selectAll("stop")
            .data(d3.range(0, 1.01, 0.1))
            .enter().append("stop")
            .attr("offset", d => `${d*100}%`)
            .attr("stop-color", d => {
                const value = fieldStats.min + d * (fieldStats.max - fieldStats.min);
                // If threshold is active, the gradient should also be binary
                return threshold != null ? (value >= threshold ? currentHigh : currentLow) : colorScale(value);
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
        

        axis.select(".domain").remove(); // Remove the horizontal axis line
        axis.selectAll(".tick line").remove(); // Remove the vertical tick lines

        // Local variable inside the useEffect to manage click timing
        let clickTimer;

        colorbar.append('rect')
            .attr('width', barWidth)
            .attr('height', barHeight)
            .style('fill', 'transparent')
            .style('cursor', 'pointer')
            .on('click', function() {
                if (clickTimer) clearTimeout(clickTimer);
                
                // Capture mouse position immediately
                const mouseX = d3.mouse(this)[0];
                const valAtClick = xScale.invert(mouseX);

                // Wait slightly to see if a second click arrives
                clickTimer = setTimeout(() => {
                    setPanelData(prev => {
                        const currentPanelData = prev[id] || {};
                        const newThresholds = { ...(currentPanelData.nhxThresholds || {}) };
                        if (newThresholds[colorField] != null) {
                            delete newThresholds[colorField];
                        } else {
                            newThresholds[colorField] = valAtClick;
                        }
                        return { ...prev, [id]: { ...currentPanelData, nhxThresholds: newThresholds } };
                    });
                }, 20); 
            })
            .on('dblclick', function() {
                // Cancel the pending single-click update
                if (clickTimer) clearTimeout(clickTimer);
                
                // Stop D3 from passing this up to the SVG zoom/drag
                d3.event.stopPropagation(); 
                
                const containerRect = containerRef.current.getBoundingClientRect();
                const barRect = this.getBoundingClientRect();
                const relX = d3.mouse(this)[0];
                const value = xScale.invert(relX);

                setThresholdEdit({
                    visible: true,
                    x: barRect.left - containerRect.left + relX,
                    y: barRect.bottom - containerRect.top + 11,
                    value: value.toFixed(4),
                });
                // set colorbarTooltip invisible on dblclick
                setColorbarTooltip({ visible: false, x: 0, y: 0, value: null });
            })
          .on('mousemove', function() {
                if (isInteractingRef.current || thresholdEdit.visible) return;
                const containerRect = containerRef.current.getBoundingClientRect();
                const barRect = this.getBoundingClientRect(); // Get the colorbar's position
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
      legendGroup.selectAll('rect')
        .data(items)
        .join('rect')
        .attr('x', 0)
        .attr('y', (_, i) => i * 20 - 20 )
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', d => d[1])
        .attr('rx', 4);

      legendGroup.selectAll('text')
        .data(items)
        .join('text')
        .attr('x', 20)
        .attr('y', (_, i) => i * 20 + 12 - 20)
        .text(d => `${colorField}: ${d[0]}`)
        .style('font-size', '12px')
        .style('fill', DARK_GRAY_COLOR);
    }

    // Calculate Legend Height/Width to position the scale bar relatively
    let currentLegendHeight = 0;
    if (nhxColorField) {
      if (isContinuous && fieldStats) {
        currentLegendHeight = COLORBAR_HEIGHT;
      } else if (Object.keys(colorMap).length > 0) {
        currentLegendHeight = Object.keys(colorMap).length * 20 - 5; 
      }
    }

    // Append the scale group to the legend group so that they move together during the drag event
    const scaleGroup = legendGroup.append('g')
      .attr('class', 'scale-bar-container')
      .style('visibility', useBranchLengths ? 'visible' : 'hidden')
      // Position it below the legend content with a small gap
      .attr('transform', `translate(0, ${currentLegendHeight})`);

    if (useBranchLengths) {
      // Calculate Scale Unit
      const targetPx = 80;
      const pixelsPerUnit = treePxPerUnit;
      
      const rawUnit = targetPx / pixelsPerUnit;
      const exponent = Math.floor(Math.log10(rawUnit));
      const fraction = rawUnit / Math.pow(10, exponent);
      let niceFraction = fraction < 1.5 ? 1 : fraction < 3 ? 2 : fraction < 7 ? 5 : 10;
      
      const scaleBarUnit = niceFraction * Math.pow(10, exponent);
      const scaleBarWidthPx = scaleBarUnit * pixelsPerUnit;

      // Draw Visuals (relative to scaleGroup 0,0)
      scaleGroup.append('line')
        .attr('x2', scaleBarWidthPx)
        .attr('stroke', DARK_GRAY_COLOR)
        .attr('stroke-width', 2);
      
      scaleGroup.append('line').attr('x1', 0).attr('x2', 0).attr('y1', -3).attr('y2', 3).attr('stroke', DARK_GRAY_COLOR);
      scaleGroup.append('line').attr('x1', scaleBarWidthPx).attr('x2', scaleBarWidthPx).attr('y1', -3).attr('y2', 3).attr('stroke', DARK_GRAY_COLOR);

      scaleGroup.append('text')
        .attr('x', scaleBarWidthPx / 2)
        .attr('y', 15)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('fill', DARK_GRAY_COLOR)
        .style('user-select', 'none')
        .text(d3.format("~g")(scaleBarUnit));
    }


  }, [newickStr, size, onHoverTip, highlightedNodes, linkedHighlights, radial, viewMode, useBranchLengths,
     pruneMode, id, setPanelData, toNewick, nhxColorField, labelSize, nodeRadius, branchWidth,
      treeRadius, rightMargin, labelExtension, rotation, extractMode, selectedLeaves,
      onLeafSelect, onCountLeaves, colorLabels, colorBranches, arc,thresholdEdit.visible,linkedTo]);

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
        setTooltipContent('');
      }
    }
    document.addEventListener('mousemove', handleDocumentMouseMove);
    return () => document.removeEventListener('mousemove', handleDocumentMouseMove);
  }, [onHoverTip]);

    // Handler to update settings
    const handleSettingChange = (setting, value) => {
        const viewSettingsKey = isUnrooted ? 'unrootedSettings' : (radial ? 'radialSettings' : 'rectangularSettings');
        if (setting === 'colorLabels' || setting === 'colorBranches') {
            // set for all views
            for (const key of ['unrootedSettings', 'radialSettings', 'rectangularSettings']) {
                setPanelData(prev => {
                    const currentPanelData = prev[id] || {};
                    const currentViewSettings = currentPanelData[key] || {};
                    return {
                        ...prev,
                        [id]: {
                            ...currentPanelData,
                            [key]: {
                                ...currentViewSettings,
                                [setting]: Array.isArray(value) ? value[0] : value,
                            },
                        },
                    };
                });
            }
        } else {
            // set for current view only
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
      }
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
        // Explicitly set true or false to allow overriding defaults (e.g. turning off bootstrap gradient)
        continuousFields[field] = isContinuous; 
        
        return {
            ...prev,
            [id]: {
                ...currentPanelData,
                nhxContinuousFields: continuousFields,
            },
        };
    });
  };

   const currentFieldStats = nhxFieldStats[nhxColorField];
   const isContinuous = (nhxContinuousFields?.[nhxColorField] !== undefined)
    ? nhxContinuousFields[nhxColorField]
    : (currentFieldStats?.isNumeric && (currentFieldStats?.hasFloat || isBootstrapField(nhxColorField)));

  

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ overflow: 'hidden', position: 'relative' }}
      onMouseLeave={() => {
        onHoverTip?.(null, null);
        setHighlightedNode(null);
        setTooltipContent('');
      }}
    >
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
                  max={4}
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
                  min={0.0}
                  max={4}
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
                  max={4}
                  size="small"
                  sx={{ width: '90%', maxWidth: 180, color: 'rgba(0,0,0,0.47)', mx: 'auto', '& .MuiSlider-track': { border: 'none' }, '& .MuiSlider-thumb': { width: 16, height: 16, backgroundColor: '#fff', '&::before': { boxShadow: '0 4px 8px rgba(0,0,0,0.4)' }, '&:hover, &.Mui-focusVisible, &.Mui-active': { boxShadow: 'none' } } }}
                />
              </Box>
            </Box>
            {/* Tree Radius Slider (Radial and Unrooted Mode) */}
            {(radial || isUnrooted) && (
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
                    min={0.2}
                    max={4}
                    size="small"
                    sx={{ width: '90%', maxWidth: 180, color: 'rgba(0,0,0,0.47)', mx: 'auto', '& .MuiSlider-track': { border: 'none' }, '& .MuiSlider-thumb': { width: 16, height: 16, backgroundColor: '#fff', '&::before': { boxShadow: '0 4px 8px rgba(0,0,0,0.4)' }, '&:hover, &.Mui-focusVisible, &.Mui-active': { boxShadow: 'none' } } }}
                  />
                </Box>
              </Box>
            )}
            {/* Rotation Slider (Radial and Unrooted Mode) */}
            {(radial || isUnrooted) && (
              <Box sx={{ mb: 1 }}>
                <Chip
                  label={`Rotation: ${rotation}°`}
                  size="small"
                  sx={{ mb: 0.5, bgcolor: '#E5E7EB', color: 'black', fontWeight: 300, borderRadius: 1.5, fontSize: 9, px: 0.5, boxShadow: 1 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                  <Slider
                    value={rotation}
                    onChange={(_, v) => handleSettingChange('rotation', v)}
                    step={1}
                    min={0}
                    max={360}
                    size="small"
                    sx={{ width: '90%', maxWidth: 180, color: 'rgba(0,0,0,0.47)', mx: 'auto', '& .MuiSlider-track': { border: 'none' }, '& .MuiSlider-thumb': { width: 16, height: 16, backgroundColor: '#fff', '&::before': { boxShadow: '0 4px 8px rgba(0,0,0,0.4)' }, '&:hover, &.Mui-focusVisible, &.Mui-active': { boxShadow: 'none' } } }}
                  />
                </Box>
              </Box>
            )}
            {/* Arc Slider (Radial Only) */}
            {radial && !isUnrooted && (
              <Box sx={{ mb: 1 }}>
                <Chip
                  label={`Arc: ${arc}°`}
                  size="small"
                  sx={{ mb: 0.5, bgcolor: '#E5E7EB', color: 'black', fontWeight: 300, borderRadius: 1.5, fontSize: 9, px: 0.5, boxShadow: 1 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                  <Slider
                    value={arc}
                    onChange={(_, v) => handleSettingChange('arc', v)}
                    step={1}
                    min={30}
                    max={360}
                    size="small"
                    sx={{ 
                      width: '90%', maxWidth: 180, color: 'rgba(0,0,0,0.47)', mx: 'auto',
                      '& .MuiSlider-track': { border: 'none' },
                      '& .MuiSlider-thumb': { width: 16, height: 16, backgroundColor: '#fff', '&::before': { boxShadow: '0 4px 8px rgba(0,0,0,0.4)' } }
                    }}
                  />
                </Box>
              </Box>
            )}
            {/* Label Extension Slider (Unrooted Mode Only) */}
            {isUnrooted && (
              <Box sx={{ mb: 1 }}>
                <Chip
                  label={`Label extension: ${labelExtension}px`}
                  size="small"
                  sx={{ mb: 0.5, bgcolor: '#E5E7EB', color: 'black', fontWeight: 300, borderRadius: 1.5, fontSize: 9, px: 0.5, boxShadow: 1 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                  <Slider
                    value={labelExtension}
                    onChange={(_, v) => handleSettingChange('labelExtension', v)}
                    step={1}
                    min={0}
                    max={200}
                    size="small"
                    sx={{ width: '90%', maxWidth: 180, color: 'rgba(0,0,0,0.47)', mx: 'auto', '& .MuiSlider-track': { border: 'none' }, '& .MuiSlider-thumb': { width: 16, height: 16, backgroundColor: '#fff', '&::before': { boxShadow: '0 4px 8px rgba(0,0,0,0.4)' }, '&:hover, &.Mui-focusVisible, &.Mui-active': { boxShadow: 'none' } } }}
                  />
                </Box>
              </Box>
            )}
            {/* Right Margin Slider (Rectangular Mode Only) */}
            {!radial && !isUnrooted && (
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
                                        checked={(() => {
                                            const override = nhxContinuousFields?.[field];
                                            if (override !== undefined) return override;
                                            return isBootstrapField(field);
                                        })()}
                                        onChange={(e) => handleContinuousToggle(field, e.target.checked)}
                                    />
                                }
                                label={<span style={{ fontSize: '12px', color: DARK_GRAY_COLOR }}>Treat as continuous</span>}
                                sx={{ ml: 1, mt: 1, display: 'flex', justifyContent: 'left' }}
                            />
                        )}
                    </div>
                 )
              }) : <div style={{ fontSize: 12, color: DARK_GRAY_COLOR, padding: '4px' }}>No NHX fields found</div>}
            </Stack>
          {nhxColorField && (
          <>
              <FormControlLabel
                  control={
                      <Switch
                          size="small"
                          checked={!!colorLabels}
                          onChange={(e) => handleSettingChange('colorLabels', e.target.checked)}
                      />
                  }
                  label={<span style={{ fontSize: '12px', color: DARK_GRAY_COLOR }}>Color labels</span>}
                  sx={{ mt: 1, ml: 1, display: 'flex', justifyContent: 'left' }}
              />
              <FormControlLabel
                  control={
                      <Switch
                          size="small"
                          checked={!!colorBranches}
                          onChange={(e) => handleSettingChange('colorBranches', e.target.checked)}
                      />
                  }
                  label={<span style={{ fontSize: '12px', color: DARK_GRAY_COLOR }}>Color branches</span>}
                  sx={{ mt: 0, ml: 1, display: 'flex', justifyContent: 'left' }}
              />
          </>
          
          )}
          
        <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid #eee' , textAlign: 'center' }}>
        
        {isContinuous && currentFieldStats ? (
          <Stack direction="row" spacing={2} justifyContent="center" alignItems="center">
            {/* High Color */}
            <Box sx={{ textAlign: 'center' }}>
              
              <Box sx={{ width: 22, height: 22, borderRadius: '6px', bgcolor: colorSettings.high || HIGH_COLOR, border: '1px solid #ddd', position: 'relative', overflow: 'hidden' }}>
                <input 
                  type="color" 
                  value={colorSettings.high || HIGH_COLOR} 
                  onChange={(e) => handleColorChange('high', e.target.value)} 
                  style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} 
                />
              </Box>
              <div style={{ fontSize: '8px', color: DARK_GRAY_COLOR, fontWeight: 'bold'}}>High</div>
            </Box>

            {/* Low Color */}
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ width: 22, height: 22, borderRadius: '6px', bgcolor: colorSettings.low || LOW_COLOR, border: '1px solid #ddd', position: 'relative', overflow: 'hidden' }}>
                <input 
                  type="color" 
                  value={colorSettings.low || LOW_COLOR} 
                  onChange={(e) => handleColorChange('low', e.target.value)} 
                  style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} 
                />
              </Box>
              <div style={{ fontSize: '8px', color: DARK_GRAY_COLOR, fontWeight: 'bold'}}>Low</div>
            </Box>

            {/* Invert Button */}
            <Box sx={{ textAlign: 'center' }}>
              <IconButton 
                size="small" 
                onClick={handleInvertColors}
                sx={{ width: 22, height: 22, bgcolor: '#f0f0f0ff', borderRadius: '14px', border: '1px solid #ddd' }}
              >
              </IconButton>
              <div style={{ fontSize: '8px', color: DARK_GRAY_COLOR, fontWeight: 'bold'}}>Invert</div>
            </Box>
          </Stack>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 , justifyContent: 'center' }}>
            {currentFieldStats && Array.from(currentFieldStats.values).sort().map(val => {
              // Get the current color for this specific discrete value
              const valColor = colorSettings.discrete?.[nhxColorField]?.[val] || 
                            (d3.schemeCategory10[Array.from(currentFieldStats.values).sort().indexOf(val) % 10]);
              return (
                <Box key={val} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Box sx={{ width: 22, height: 22, borderRadius: '6px', bgcolor: valColor, border: '1px solid #ddd', position: 'relative', overflow: 'hidden' }}>
                    <input 
                      type="color" 
                      value={valColor} 
                      onChange={(e) => handleDiscreteColorChange(val, e.target.value)} 
                      style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} 
                    />
                  </Box>
                  <div style={{ fontSize: '8px', maxWidth: '20px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{val}</div>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
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
      {/* Threshold Manual Input */}
      {thresholdEdit.visible && (
      <div
        style={{
          position: 'absolute',
          left: thresholdEdit.x,
          top: thresholdEdit.y,
          transform: 'translateX(-50%)',
          zIndex: 100,
        }}
      >
        <input
          autoFocus
          className="text-xs rounded px-5 py-2 outline-none bg-transparent"
          style={{ width: '70px' }}
          value={thresholdEdit.value}
          onChange={(e) => setThresholdEdit({ ...thresholdEdit, value: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const val = parseFloat(thresholdEdit.value);
              if (!isNaN(val)) {
                setPanelData(prev => ({
                  ...prev,
                  [id]: {
                    ...prev[id],
                    nhxThresholds: { ...(prev[id].nhxThresholds || {}), [nhxColorField]: val }
                  }
                }));
              }
              setThresholdEdit({ visible: false, x: 0, y: 0, value: '' });
            } else if (e.key === 'Escape') {
              setThresholdEdit({ visible: false, x: 0, y: 0, value: '' });
            }
          }}
          onBlur={() => setThresholdEdit({ visible: false, x: 0, y: 0, value: '' })}
        />
      </div>
  )}
    </div>
  );
};

export default React.memo(PhyloTreeViewer);