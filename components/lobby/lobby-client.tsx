'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Eye, LogIn, Plus, Users, Lock, KeyRound, MessageSquare, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, ApiClientError } from '@/lib/client/api';
import { MODE_LABEL, ROOM_STATUS_LABEL } from '@/lib/game/labels';
import { LOBBY_CHANNEL } from '@/lib/realtime/channels';
import { useLive } from '@/hooks/use-live';
import type { LobbyRoom } from '@/types/room';
import { CreateRoomForm } from './create-room-form';

const STATUS_TONE: Record<string, 'green' | 'gold' | 'purple' | 'neutral'> = {
  WAITING: 'green',
  STARTING: 'gold',
  IN_PROGRESS: 'purple',
  FINISHED: 'neutral',
  CLOSED: 'neutral',
};

export function LobbyClient({ username }: { username: string }) {
  // Polling chat publik lobby
  const fetchChat = useCallback(async () => {
    try {
      const res = await api<{ messages: { id: string; username: string; content: string }[] }>('/api/lobby/chat');
      setChatMessages(res.messages);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void fetchChat();
    const t = setInterval(fetchChat, 2500);
    return () => clearInterval(t);
  }, [fetchChat]);

  async function sendLobbyChat(e: React.FormEvent) {
    e.preventDefault();
    const txt = chatText.trim();
    if (!txt) return;
    setChatText('');
    try {
      await api('/api/lobby/chat', { method: 'POST', json: { content: txt } });
      await fetchChat();
    } catch {
      setChatText(txt);
    }
  }

  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [keyPromptRoom, setKeyPromptRoom] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState('');
  const [chatMessages, setChatMessages] = useState<{ id: string; username: string; content: string }[]>([]);
  const [chatText, setChatText] = useState('');
  

  const fetcher = useCallback(async () => {
    try {
      const res = await api<{ rooms: LobbyRoom[] }>('/api/rooms');
      return res.rooms || [];
    } catch {
      return [];
    }
  }, []);
  const { data: rooms, loading } = useLive<LobbyRoom[]>(fetcher, { channels: [LOBBY_CHANNEL], intervalMs: 5000 });

  async function enter(code: string, mode: 'join' | 'spectate', key?: string) {
    setError(null);
    setBusy(code);
    try {
      await api(`/api/rooms/${code}/${mode}`, {
        method: 'POST',
        json: key ? { key } : undefined,
      });
      router.push(`/room/${code}`);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'ALREADY_JOINED' && typeof err.details?.roomCode === 'string') {
        router.push(`/room/${err.details.roomCode}`);
        return;
      }
      setError(err instanceof ApiClientError ? err.message : 'Gagal masuk room.');
    } finally {
      setBusy(null);
      setKeyPromptRoom(null);
      setInputKey('');
    }
  }

  function joinById(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!/^WOLF-[A-Z0-9]{5}$/.test(code)) {
      setError('Format Room ID tidak valid. Contoh: WOLF-7X9K2');
      return;
    }
    router.push(`/room/${code}`);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-gold-soft">Lobby</h1>
          <p className="mt-1 text-sm text-mute">Halo, <Link href={`/profile/${username}`} className="text-ink hover:underline">@{username}</Link>. Pilih room atau buat desamu sendiri.</p>
        </div>
        <Button onClick={() => setShowCreate((v) => !v)} variant={showCreate ? 'secondary' : 'primary'}>
          <Plus className="h-4 w-4" aria-hidden /> Buat room
        </Button>
      </div>

      {showCreate && (
        <section className="panel max-w-xl p-5">
          <h2 className="mb-4 font-display text-xl">Room baru</h2>
          <CreateRoomForm />
        </section>
      )}

      <form onSubmit={joinById} className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <label htmlFor="code" className="text-sm text-mute">Punya Room ID?</label>
          <input id="code" className="input uppercase" placeholder="WOLF-7X9K2" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} maxLength={10} />
        </div>
        <Button type="submit" variant="secondary"><LogIn className="h-4 w-4" aria-hidden /> Masuk dengan ID</Button>
      </form>

      {error && <p role="alert" className="rounded-lg border border-crimson/50 bg-crimson/10 px-3 py-2 text-sm text-crimson-soft">{error}</p>}

      
      {/* Obrolan Publik Lobby (Bisa ngobrol santai sambil nunggu pemain) */}
      <section className="panel p-4 space-y-3 border-white/10 bg-surface/75 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <h2 className="font-display text-sm text-gold-soft flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Obrolan Publik Desa (Lobby Chat)
          </h2>
          <span className="text-[11px] text-mute">Terbuka untuk semua pemain</span>
        </div>

        <div className="h-44 overflow-y-auto space-y-2 p-2 scroll-thin rounded-xl bg-night/50 border border-white/5">
          {chatMessages.length === 0 ? (
            <p className="text-xs text-mute text-center py-6">Belum ada obrolan. Sapa pemain lain yang sedang online!</p>
          ) : (
            chatMessages.map((m) => (
              <div key={m.id} className="text-xs break-words">
                <Link href={`/profile/${m.username}`} className="font-bold text-gold-soft hover:underline">
                  @{m.username}
                </Link>
                <span className="text-mute">: </span>
                <span className="text-ink/90">{m.content}</span>
              </div>
            ))
          )}
        </div>

        <form onSubmit={sendLobbyChat} className="flex gap-2">
          <input
            className="input text-xs"
            placeholder="Ketik obrolan di lobby..."
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            maxLength={200}
          />
          <Button type="submit" size="sm" disabled={!chatText.trim()}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl">Room publik</h2>
        {!rooms || rooms.length === 0 ? (
          <p className="panel p-5 text-sm text-mute">Belum ada room publik. Buat satu dan undang temanmu.</p>
        ) : (
          <ul className="space-y-2">
            {rooms.map((r) => (
              <li key={r.code} className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg text-ink">{r.code}</span>
                    <Badge tone={STATUS_TONE[r.status]}>{ROOM_STATUS_LABEL[r.status]}</Badge>
                    {r.visibility === 'PRIVATE' && (
                      <Badge tone="purple" className="flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Privat
                      </Badge>
                    )}
                    {r.hasKey && (
                      <Badge tone="gold" className="flex items-center gap-1">
                        <KeyRound className="h-3 w-3" /> Berkunci
                      </Badge>
                    )}
                  </div>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-mute">
                    <span>Host @{r.host}</span>
                    <span>{MODE_LABEL[r.gameMode] ?? r.gameMode}</span>
                    <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" aria-hidden />{r.playerCount}/{r.maxPlayers}</span>
                    {r.spectatorCount > 0 && <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" aria-hidden />{r.spectatorCount}</span>}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {r.action === 'JOIN' && (
                    <Button
                      size="sm"
                      loading={busy === r.code}
                      onClick={() => {
                        if (r.hasKey) {
                          setKeyPromptRoom(r.code);
                        } else {
                          enter(r.code, 'join');
                        }
                      }}
                    >
                      {r.hasKey ? <Lock className="h-3.5 w-3.5 mr-1" /> : null} Join
                    </Button>
                  )}
                  {r.action === 'SPECTATE' && <Button size="sm" variant="secondary" loading={busy === r.code} onClick={() => enter(r.code, 'spectate')}><Eye className="h-4 w-4" aria-hidden />Spectate</Button>}
                  {r.action === 'RETURN' && <Button size="sm" onClick={() => router.push(r.gameId ? `/game/${r.gameId}` : `/room/${r.code}`)}>Kembali</Button>}
                  {r.action === 'FINISHED' && (r.matchId ? <Link href={`/match/${r.matchId}`} className="text-sm text-gold-soft hover:underline">Lihat hasil</Link> : <Badge>Selesai</Badge>)}
                  {r.action === 'CLOSED' && <Badge tone="crimson">Closed</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Modal Masukkan Kunci Room Privat */}
      {keyPromptRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="panel w-full max-w-sm p-6 space-y-4 border-gold/40 shadow-glow animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-gold-soft">
              <Lock className="h-5 w-5" />
              <h3 className="font-display text-lg">Room Privat Berkunci</h3>
            </div>
            <p className="text-xs text-mute leading-relaxed">
              Room <b>{keyPromptRoom}</b> membutuhkan kunci/password untuk bergabung.
            </p>
            <input
              type="text"
              autoFocus
              className="input text-center text-base tracking-widest uppercase font-mono"
              placeholder="MASUKKAN KUNCI"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputKey.trim()) {
                  enter(keyPromptRoom, 'join', inputKey.trim());
                }
              }}
            />
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="w-1/2"
                onClick={() => {
                  setKeyPromptRoom(null);
                  setInputKey('');
                }}
              >
                Batal
              </Button>
              <Button
                className="w-1/2"
                disabled={!inputKey.trim()}
                loading={busy === keyPromptRoom}
                onClick={() => enter(keyPromptRoom, 'join', inputKey.trim())}
              >
                Buka & Gabung
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
