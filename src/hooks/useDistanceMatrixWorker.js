/**
 * Custom React hook to manage a Web Worker for computing distance matrices.
 * It handles worker initialization, communication, and state management.
 */
// useDistanceMatrixWorker.js
import { useState, useEffect, useRef, useCallback } from 'react';

export function useDistanceMatrixWorker() {
  const [isCalculatingDistances, setIsCalculatingDistances] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const workerRef = useRef(null);

  useEffect(() => {
    workerRef.current = new Worker('/workers/distanceMatrix.worker.js');

    workerRef.current.onmessage = (e) => {
      const { result: workerResult, error: workerError } = e.data;
      setIsCalculatingDistances(false);
      if (workerError) {
        setError(workerError);
        setResult(null);
      } else {
        setResult(workerResult);
        setError(null);
      }
    };

    workerRef.current.onerror = (err) => {
      console.error("Web Worker error:", err);
      setIsCalculatingDistances(false);
      setError('An unexpected worker error occurred.');
    };

    return () => {
      workerRef.current.terminate();
    };
  }, []);

  const calculate = (atoms) => {
    if (!workerRef.current || isCalculatingDistances) return;
    
    setIsCalculatingDistances(true);
    setResult(null);
    setError(null);

    workerRef.current.postMessage({ atoms });
  };

  // manually clear the hook's state.
  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { calculate, isCalculatingDistances, result, error, reset };
}