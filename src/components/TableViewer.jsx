// components/TableViewer.jsx
import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';

const TableViewer = React.memo(function TableViewer({ 
  data, 
  selectedXCol, 
  selectedCol,
  height 
}) {
  const isTabular = !Array.isArray(data);
  
  // For tabular data, get headers and rows
  const { headers, rows } = useMemo(() => {
    if (!isTabular) return { headers: [], rows: [] };
    return {
      headers: data.headers || [],
      rows: data.rows || []
    };
  }, [data, isTabular]);

  // For simple array data, create a table with index and value
  const arrayData = useMemo(() => {
    if (isTabular) return [];
    return data.map((value, index) => ({ index: index + 1, value }));
  }, [data, isTabular]);

  const tableHeaders = isTabular ? headers : ['Index', 'Value'];
  const tableRows = isTabular ? rows : arrayData;

  // Row component for virtualized list
  const Row = ({ index, style }) => {
    const row = tableRows[index];
    
    return (
      <div 
        style={style}
        className={`flex border-b border-gray-200 ${
          index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
        } hover:bg-blue-50`}
      >
        {isTabular ? (
          headers.map(header => (
            <div
              key={header}
              className="flex-1 px-2 py-1 truncate border-r border-gray-200 last:border-r-0"
              //title={String(row[header])}
            >
              {String(row[header])}
            </div>
          ))
        ) : (
          <>
            <div className="flex-1 px-2 py-1 truncate border-r border-gray-200">
              {row.index}
            </div>
            <div className="flex-1 px-2 py-1 truncate">
              {row.value}
            </div>
          </>
        )}
      </div>
    );
  };

  if (!isTabular && data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No data available
      </div>
    );
  }

  if (isTabular && rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No tabular data available
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border border-gray-300 rounded-lg overflow-hidden">
      {/* Table header */}
      <div className="flex bg-gray-100 font-semibold border-b border-gray-300">
        {tableHeaders.map(header => (
          <div
            key={header}
            className="flex-1 px-2 py-2 truncate border-r border-gray-300 last:border-r-0"
            //title={header}
          >
            {header}
          </div>
        ))}
      </div>
      
      {/* Table body with virtualization */}
      <div className="flex-1">
        <List
          height={height - 40} // Subtract header height
          itemCount={tableRows.length}
          itemSize={35}
          width="100%"
        >
          {Row}
        </List>
      </div>
      
      {/* Footer with row count */}
      <div className="bg-gray-100 px-2 py-1 text-xs text-gray-600 border-t border-gray-300">
        {tableRows.length} row{tableRows.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
});

export default TableViewer;