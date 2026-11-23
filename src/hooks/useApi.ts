'use client';
import { useEffect, useState } from 'react';

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
}

export function useApi<T>(url: string, version = 0): { data: T | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        const payload = (await res.json()) as ApiEnvelope<T> & T;
        if (!res.ok || payload.success === false) {
          throw new Error(payload.error ?? 'Request failed (' + res.status + ')');
        }
        return (payload.data !== undefined ? payload.data : payload) as T;
      })
      .then((d) => {
        setData(d);
        setError(null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Something went wrong');
        setLoading(false);
      });
    return () => controller.abort();
  }, [url, version]);

  return { data, loading, error };
}

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
