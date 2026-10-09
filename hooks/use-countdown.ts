'use client';

import { useEffect, useState } from 'react';

/** Hitung mundur berbasis timestamp server (dikoreksi dengan selisih jam client-server). */
export function useCountdown(endsAt: number | null, serverTime: number | null): number {
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (serverTime) setOffset(serverTime - Date.now());
  }, [serverTime]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  if (!endsAt) return 0;
  return Math.max(0, endsAt - (now + offset));
}
