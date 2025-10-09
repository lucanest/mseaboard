/**
 * Creates a lightweight proxy to view a flat ArrayBuffer as a 2D matrix.
 * This intercepts property access like `matrix[i][j]` to calculate the
 * correct value from the flat buffer on the fly, without allocating
 * a large nested array in memory.
 */
// MatrixView.js
export function createMatrixView(buffer, n) {
  const data = new Float64Array(buffer);

  // handler for a "row" proxy. It intercepts `row[j]`.
  const rowProxyHandler = {
    get(target, colIndex) {
      // The target for a row proxy is just an object holding its index.
      // e.g., { rowIndex: 5 }
      const j = parseInt(colIndex, 10);
      if (!isNaN(j) && j >= 0 && j < n) {
        // Calculate and return the value from the flat data array
        return data[target.rowIndex * n + j];
      }
      // Make rows behave a little more like arrays (e.g., for console.log)
      if (colIndex === 'length') {
        return n;
      }
      return undefined;
    }
  };

  // This is the handler for the main "matrix" proxy. It intercepts `matrix[i]`.
  const matrixProxyHandler = {
    get(target, prop) {
      // The target for the matrix proxy holds the data and dimensions.
      // e.g., { data: Float64Array, n: 4000 }
      
      // Make the matrix itself report its length correctly.
      if (prop === 'length') {
        return n;
      }

      // Check if the property being accessed is a valid row index
      const i = parseInt(prop, 10);
      if (!isNaN(i) && i >= 0 && i < n) {
        // instead of returning a value, we return another proxy representing the row
        return new Proxy({ rowIndex: i }, rowProxyHandler);
      }
      
      return target[prop];
    }
  };

  return new Proxy({ data, n }, matrixProxyHandler);
}