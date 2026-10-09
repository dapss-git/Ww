'use client';

import { useCallback } from 'react';
import { api } from '@/lib/client/api';
import { gameChannel, userChannel } from '@/lib/realtime/channels';
import type { ChatMessageView, GameView } from '@/types/game';
import { useLive } from './use-live';

interface Bundle {
  view: GameView;
  messages: ChatMessageView[];
}

/** State game + chat yang sudah difilter server untuk viewer ini. */
export function useGame(gameId: string, userId: string) {
  const fetcher = useCallback(async (): Promise<Bundle> => {
    const { view } = await api<{ view: GameView }>(`/api/games/${gameId}`);
    const { messages } = await api<{ messages: ChatMessageView[] }>(`/api/chat?gameId=${encodeURIComponent(gameId)}`);
    return { view, messages };
  }, [gameId]);

  return useLive<Bundle>(fetcher, { channels: [gameChannel(gameId), userChannel(userId)], intervalMs: 2000 });
}
