import { useEffect, useRef, useState } from "react";

export function useStoredState<T>(key: string, fallback: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? fallback : JSON.parse(stored) as T;
    } catch {
      return fallback;
    }
  });
  return [value, (next) => {
    setValue(next);
    localStorage.setItem(key, JSON.stringify(next));
  }];
}

export function useInfiniteCount(resetKey: string, total: number, chunkSize = 80): { count: number; sentinelRef: (node: HTMLDivElement | null) => void } {
  const [count, setCount] = useState(chunkSize);
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  useEffect(() => setCount(chunkSize), [resetKey, chunkSize]);
  useEffect(() => {
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setCount((current) => Math.min(total, current + chunkSize));
    }, { rootMargin: "500px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, total, chunkSize]);
  return { count, sentinelRef: setNode };
}

export function nextInfiniteCount(current: number, total: number, chunkSize = 80): number {
  return Math.min(total, current + chunkSize);
}
