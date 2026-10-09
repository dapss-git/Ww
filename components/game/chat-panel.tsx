'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, ApiClientError } from '@/lib/client/api';
import type { ChatChannelId } from '@/lib/game/constants';
import { cn } from '@/lib/utils';
import type { ChatMessageView, GameView } from '@/types/game';

const CHANNEL_LABEL: Record<ChatChannelId, string> = {
  PUBLIC: 'Publik',
  WEREWOLF: 'Serigala',
  ROLE: 'Pasangan',
  SPECTATOR: 'Penonton',
};

interface Props {
  view: GameView;
  messages: ChatMessageView[];
  onSent: () => void;
}

export function ChatPanel({ view, messages, onSent }: Props) {
  const channels = view.viewer.canRead;
  const [active, setActive] = useState<ChatChannelId>(channels[0] ?? 'PUBLIC');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const current = channels.includes(active) ? active : (channels[0] ?? 'PUBLIC');
  const list = useMemo(() => messages.filter((m) => m.channel === current), [messages, current]);
  const canSend = view.viewer.canSend.includes(current);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [list.length, current]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !canSend) return;
    setText('');
    setError(null);
    try {
      await api('/api/chat', { method: 'POST', json: { gameId: view.game.id, channel: current, content } });
      onSent();
    } catch (err) {
      setText(content); // restore if failed
      setError(err instanceof ApiClientError ? err.message : 'Gagal mengirim pesan.');
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {channels.length > 1 && (
        <div className="flex gap-1 border-b border-white/10 p-2" role="tablist">
          {channels.map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={c === current}
              onClick={() => setActive(c)}
              className={cn('rounded-md px-3 py-1 text-xs', c === current ? 'bg-gold/15 text-gold-soft' : 'text-mute hover:text-ink')}
            >
              {CHANNEL_LABEL[c]}
            </button>
          ))}
        </div>
      )}
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3 scroll-thin" aria-live="polite">
        {list.length === 0 && <p className="text-sm text-mute">Belum ada pesan.</p>}
        {list.map((m) =>
          m.system ? (
            <p key={m.id} className="rounded-md bg-purple/15 px-2.5 py-1.5 text-center text-xs italic text-purple-soft">{m.content}</p>
          ) : (
            <p key={m.id} className="break-words text-sm">
              <span className={cn('font-medium', m.userId === view.players.find((p) => p.isYou)?.userId ? 'text-gold-soft' : 'text-ink')}>{m.username}</span>
              <span className="text-mute">: </span>
              <span className="text-ink/90">{m.content}</span>
            </p>
          ),
        )}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="border-t border-white/10 p-2">
        {error && <p role="alert" className="mb-1.5 text-xs text-crimson-soft">{error}</p>}
        <div className="flex gap-2">
          <input
            className="input"
            placeholder={canSend ? 'Tulis pesan...' : 'Kamu tidak bisa mengirim pesan sekarang'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!canSend}
            maxLength={300}
            aria-label="Pesan"
          />
          <Button type="submit" disabled={!canSend || !text.trim()} loading={sending} aria-label="Kirim">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
