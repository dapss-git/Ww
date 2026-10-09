'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiClientError } from '@/lib/client/api';
import { realtimeEnabled, subscribeChannels } from '@/lib/realtime/client';

interface Options {
  /** Channel realtime yang memicu refresh. Kosong = hanya polling. */
  channels?: string[];
  /** Interval polling (ms). Lebih lambat bila realtime aktif. */
  intervalMs?: number;
  enabled?: boolean;
}

/**
 * Mengambil data dari server dan menyegarkannya lewat realtime + polling.
 * Server tetap source of truth: event realtime hanya menjadi sinyal refresh.
 */
export function useLive<T>(fetcher: () => Promise<T>, { channels = [], intervalMs = 3000, enabled = true }: Options = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const inflight = useRef(false);
  const queued = useRef(false);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    if (inflight.current) {
      queued.current = true;
      return;
    }
    inflight.current = true;
    try {
      const next = await fetcherRef.current();
      if (!alive.current) return;
      setData(next);
      setError(null);
    } catch (e) {
      if (!alive.current) return;
      setError(e instanceof ApiClientError ? e : new ApiClientError('INTERNAL_ERROR', 'Gagal memuat data.'));
    } finally {
      inflight.current = false;
      if (alive.current) setLoading(false);
      if (queued.current) {
        queued.current = false;
        void refresh();
      }
    }
  }, []);

  const channelKey = channels.join('|');

  useEffect(() => {
    alive.current = true;
    if (!enabled) return;
    void refresh();
    const rt = realtimeEnabled() && channels.length > 0;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, rt ? Math.max(intervalMs * 3, 8000) : intervalMs);

    let debounce: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = rt
      ? subscribeChannels(channels, () => {
          if (debounce) clearTimeout(debounce);
          debounce = setTimeout(() => void refresh(), 120);
        })
      : () => undefined;
    const onVisible = () => document.visibilityState === 'visible' && void refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive.current = false;
      clearInterval(timer);
      if (debounce) clearTimeout(debounce);
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelKey, intervalMs, enabled, refresh]);

  return { data, error, loading, refresh, setData };
}
