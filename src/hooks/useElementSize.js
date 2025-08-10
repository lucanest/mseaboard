import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Observe an element's size with minimal churn.
 * - Batches updates via requestAnimationFrame
 * - Optional debounce to coalesce bursts
 * - Avoids setState if size hasn't actually changed
 *
 * Usage:
 *   const [ref, size] = useElementSize({ debounceMs: 150 });
 *   <div ref={ref} />
 */

export default function useElementSize({ debounceMs = 0 } = {}) {
  const nodeRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = nodeRef.current;
    if (!el) return;

    let frame = null;
    let t = null;

    const update = (next) => {
      // Batch into RAF
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setSize((prev) =>
          (Math.round(prev.width) === Math.round(next.width) &&
           Math.round(prev.height) === Math.round(next.height))
            ? prev
            : { width: next.width, height: next.height }
        );
      });
    };

    const schedule = (next) => {
      if (debounceMs > 0) {
        if (t) clearTimeout(t);
        t = setTimeout(() => update(next), debounceMs);
      } else {
        update(next);
      }
    };

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      // Prefer borderBoxSize when available (better for padding changes)
      const box = Array.isArray(entry.borderBoxSize) ? entry.borderBoxSize[0] : entry.borderBoxSize;
      const next = box
        ? { width: box.inlineSize, height: box.blockSize }
        : { width: entry.contentRect.width, height: entry.contentRect.height };

      schedule(next);
    });

    ro.observe(el);

    return () => {
      ro.disconnect();
      if (frame) cancelAnimationFrame(frame);
      if (t) clearTimeout(t);
    };
  }, [debounceMs]);

  return [nodeRef, size];
}