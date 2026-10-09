'use client';

import { useCallback } from 'react';
import { api } from '@/lib/client/api';
import { roomChannel } from '@/lib/realtime/channels';
import type { RoomDetail } from '@/types/room';
import { useLive } from './use-live';

export function useRoom(code: string) {
  const fetcher = useCallback(async () => (await api<{ room: RoomDetail }>(`/api/rooms/${code}`)).room, [code]);
  return useLive<RoomDetail>(fetcher, { channels: [roomChannel(code)], intervalMs: 3000 });
}
