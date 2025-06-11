import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const PhyloTreeViewer = ({ newick: newickStr, isNhx = false }) => {
  const containerRef = useRef();
  const [debugInfo, setDebugInfo] = useState('');

  // Enhanced Newick parser that properly handles NHX annotations
  const parseNewick = (newickString) => {
    let pos = 0;
    
    const parseNode = () => {
      const node = { name: '', length: 0, children: [] };
      
      // Skip whitespace
      while (pos < newickString.length && /\s/.test(newickString[pos])) pos++;
      
      if (pos >= newickString.length) return node;
      
      // Handle internal node with children
      if (newickString[pos] === '(') {
        pos++; // skip '('
        
        // Parse children
        do {
          // Skip whitespace
          while (pos < newickString.length && /\s/.test(newickString[pos])) pos++;
          
          if (newickString[pos] === ')') break;
          
          node.children.push(parseNode());
          
          // Skip whitespace
          while (pos < newickString.length && /\s/.test(newickString[pos])) pos++;
          
          if (newickString[pos] === ',') {
            pos++; // skip ','
          }
        } while (pos < newickString.length && newickString[pos] !== ')');
        
        if (newickString[pos] === ')') pos++; // skip ')'
      }
      
      // Parse name (including NHX annotations)
      let name = '';
      while (pos < newickString.length) {
        const char = newickString[pos];
        
        if (char === ':' || char === ',' || char === ')' || char === ';') {
          break;
        }
        
        // Handle NHX annotations - include everything between [&&NHX: and ]
        if (char === '[' && newickString.substr(pos, 6) === '[&&NHX') {
          let nhxEnd = pos;
          while (nhxEnd < newickString.length && newickString[nhxEnd] !== ']') {
            nhxEnd++;
          }
          if (nhxEnd < newickString.length) nhxEnd++; // include the closing ]
          name += newickString.substring(pos, nhxEnd);
          pos = nhxEnd;
        } else {
          name += char;
          pos++;
        }
      }
      
      node.name = name.trim();
      
      // Parse branch length
      if (pos < newickString.length && newickString[pos] === ':') {
        pos++; // skip ':'
        let lengthStr = '';
        while (pos < newickString.length && /[\d.eE+-]/.test(newickString[pos])) {
          lengthStr += newickString[pos++];
        }
        node.length = parseFloat(lengthStr) || 0;

        // — now pull in any NHX annotation that follows the length —
        while (
          pos < newickString.length &&
          newickString[pos] === '[' &&
          newickString.substr(pos, 6) === '[&&NHX'
        ) {
          let annStart = pos;
          // find the closing bracket
          let annEnd = annStart;
          while (annEnd < newickString.length && newickString[annEnd] !== ']') {
            annEnd++;
          }
          if (annEnd < newickString.length) annEnd++;  // include the ']'
          
          // append it onto the “name” field so extractNhxData will see it
          node.name += newickString.substring(annStart, annEnd);
          pos = annEnd; 
        }
      }

      return node;
    };
    
    return parseNode();
  };

  useEffect(() => {
    if (!newickStr) return;

    const container = containerRef.current;
    if (!container) return;

    // Clear previous content
    d3.select(container).selectAll('*').remove();

    //console.log('📄 Raw Newick/NHX input:', newickStr.slice(0, 200));
    setDebugInfo(`Processing: ${newickStr.slice(0, 100)}...`);

    let parsed;
    try {
      parsed = parseNewick(newickStr);
      //console.log('✅ Parsed tree:', parsed);
    } catch (err) {
      //console.error('❌ Failed to parse Newick:', err);
      setDebugInfo(`Parse error: ${err.message}`);
      return;
    }

    const extractNhxData = (nameWithNhx) => {
      if (!nameWithNhx || !isNhx) return { name: nameWithNhx || '', nhx: {} };
      
      const nhxMatch = nameWithNhx.match(/\[&&NHX:([^\]]+)\]/);
      if (!nhxMatch) return { name: nameWithNhx, nhx: {} };
      
      const nhxString = nhxMatch[1];
      const cleanName = nameWithNhx.replace(/\[&&NHX:[^\]]+\]/, '').replace(/"/g, '');
      
      //console.log(`🔍 Parsing NHX: "${nhxString}" from "${nameWithNhx}"`);
      
      const nhxData = {};
      // Split on ':' but handle key=value pairs properly
      const parts = nhxString.split(':');
      for (const part of parts) {
        if (part.includes('=')) {
          const [key, value] = part.split('=', 2);
          nhxData[key.trim()] = value.trim();
          //console.log(`  📝 Found NHX pair: ${key.trim()} = ${value.trim()}`);
        }
      }
      
      return { name: cleanName, nhx: nhxData };
    };

    const convertToD3Hierarchy = (node) => {
      const { name, nhx } = extractNhxData(node.name);
      return {
        name: name,
        nhx: nhx,
        length: node.length,
        children: node.children ? node.children.map(convertToD3Hierarchy) : undefined
      };
    };

    const data = convertToD3Hierarchy(parsed);
    //console.log('🌳 Converted D3 tree data:', data);

    const { width, height } = container.getBoundingClientRect();
    const radius = Math.min(width, height) / 2 - 20;
    const margin = 20;    // how much space round the outside
    const diameter = radius * 2;

    const svg = d3.select(container)
      .append('svg')
      .attr('viewBox', [
      -radius - margin,
      -radius - margin,
      diameter + margin * 2,
      diameter + margin * 2
    ])
      .attr('width', '100%')
      .attr('height', '100%')
      .style('font', '10px sans-serif');

    const g = svg.append('g');

    const root = d3.hierarchy(data);
    d3.cluster().size([2 * Math.PI, radius - 50])(root);

    // Create color mapping for NHX traits
    const colorField = 'Trait';
    const colorMap = {};
    let colorIndex = 0;
    const colorScale = d3.schemeCategory10;

    root.each(d => {
      const val = d.data.nhx?.[colorField];
      if (val && !(val in colorMap)) {
        colorMap[val] = colorScale[colorIndex++ % colorScale.length];
        //console.log(`🎨 Assigned color to "${val}":`, colorMap[val]);
      }
    });

    //console.log('🌈 Final color map:', colorMap);

    // Draw links
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

    // Draw nodes
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
        const val = d.data.nhx?.[colorField];
        const color = val ? colorMap[val] : '#555';
        //console.log(`🔵 Node "${d.data.name}" (${colorField}: ${val}) → fill: ${color}`);
        return color;
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);

    // Draw labels
    g.append('g')
      .selectAll('text')
      .data(root.descendants().filter(d => !d.children)) // Only leaf nodes
      .join('text')
      .attr('transform', d => `
        rotate(${(d.x * 180 / Math.PI - 90)})
        translate(${d.y},0)
        rotate(${d.x >= Math.PI ? 180 : 0})
      `)
      .attr('dy', '0.31em')
      .attr('x', d => d.x < Math.PI ? 8 : -8)
      .attr('text-anchor', d => d.x < Math.PI ? 'start' : 'end')
      .text(d => d.data.name)
      .style('font-size', '12px')
      .style('fill', '#333');

    // Add legend for colors
      const inset = 5;

      if (Object.keys(colorMap).length > 0) {
        const legend = svg.append('g')
          .attr(
            'transform',
            `translate(${-radius - margin + inset}, ${-radius - margin + inset})`
          );

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

    //console.log('✅ Tree rendered with NHX coloring');
    setDebugInfo(`Tree rendered successfully. Found ${Object.keys(colorMap).length} different ${colorField} values.`);

  }, [newickStr, isNhx]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ overflow: 'hidden' }}
    />
  );
};
export default PhyloTreeViewer;