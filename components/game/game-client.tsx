'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Eye, Menu, MessageSquare, Moon, Skull, Sun, Users } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/button';
import { useCountdown } from '@/hooks/use-countdown';
import { useGame } from '@/hooks/use-game';
import { PHASE_LABEL, TEAM_LABEL, WIN_LABEL } from '@/lib/game/labels';
import { ROLES } from '@/lib/roles/registry';
import { cn, formatClock } from '@/lib/utils';
import type { GameView } from '@/types/game';
import { ActionPanel } from './action-panel';
import { ChatPanel } from './chat-panel';
import { PlayerList } from './player-list';

const NIGHT_PHASES = ['NIGHT', 'ROLE_ACTION'];

function Header({ view, remaining }: { view: GameView; remaining: number }) {
  const { game } = view;
  const night = NIGHT_PHASES.includes(game.phase);
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-night/85 backdrop-blur-md">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-3 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mute">
          <span className="font-display text-sm tracking-wide text-gold-soft">{game.roomCode}</span>
          <span>Ronde {game.round}</span>
          <span className="inline-flex items-center gap-1 text-ink">{night ? <Moon className="h-3.5 w-3.5 text-purple-soft" aria-hidden /> : <Sun className="h-3.5 w-3.5 text-gold" aria-hidden />}{PHASE_LABEL[game.phase]}</span>
          <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" aria-hidden />{game.aliveCount} hidup</span>
          <span className="inline-flex items-center gap-1"><Skull className="h-3.5 w-3.5" aria-hidden />{game.deadCount} mati</span>
          <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" aria-hidden />{game.spectatorCount}</span>
        </div>
        <div className={cn('rounded-lg border px-3 py-1 font-display text-xl tabular-nums', remaining < 10_000 && game.phase !== 'FINISHED' ? 'border-crimson/60 text-crimson-soft' : 'border-white/10 text-ink')} aria-label="Sisa waktu" role="timer">
          {game.phase === 'FINISHED' ? '--:--' : formatClock(remaining)}
        </div>
      </div>
    </header>
  );
}

function RoleCard({ view }: { view: GameView }) {
  if (!view.viewer.role) return null;
  const role = ROLES[view.viewer.role];
  const reveal = view.game.phase === 'ROLE_REVEAL' || view.game.phase === 'STARTING';
  return (
    <section className={cn('panel p-4', reveal && 'border-gold/50 shadow-glow')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl text-gold-soft">{reveal ? 'Perananmu: ' : ''}{role.name}</h2>
        <Badge tone={role.team === 'WEREWOLF' ? 'crimson' : role.team === 'SOLO' ? 'purple' : 'gold'}>{TEAM_LABEL[role.team]}</Badge>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-mute">{role.description}</p>
    </section>
  );
}

function PhaseBanner({ view }: { view: GameView }) {
  const { game, lastVoteResult } = view;
  const names = (ids: string[]) => ids.map((id) => view.players.find((p) => p.id === id)?.username ?? '?').join(', ');
  let text = '';
  switch (game.phase) {
    case 'STARTING': text = 'Permainan akan segera dimulai...'; break;
    case 'ROLE_REVEAL': text = 'Lihat perananmu dan jaga rahasianya.'; break;
    case 'NIGHT': text = 'Malam. Desa terlelap, kemampuan malam aktif.'; break;
    case 'DAY': text = 'Pagi. Dengarkan kabar semalam, lalu bersiap berdiskusi.'; break;
    case 'DISCUSSION': text = 'Diskusi. Siapa yang paling mencurigakan?'; break;
    case 'VOTING': text = 'Voting. Pilih satu pemain untuk digantung.'; break;
    case 'ROLE_ACTION': text = 'Tembakan terakhir. Pemburu memilih targetnya.'; break;
    case 'RESULT': text = 'Hasil voting.'; break;
    case 'FINISHED': text = game.winnerLabel ? (WIN_LABEL[game.winnerLabel] ?? 'Permainan selesai') : 'Permainan selesai'; break;
    default: text = '';
  }
  return (
    <section className={cn('panel p-4', game.phase === 'FINISHED' && 'border-gold/50 shadow-glow')}>
      <h2 className="font-display text-2xl text-ink">{game.phase === 'FINISHED' ? text : PHASE_LABEL[game.phase]}</h2>
      {game.phase !== 'FINISHED' && <p className="mt-1 text-sm text-mute">{text}</p>}
      {game.phase === 'RESULT' && lastVoteResult && (
        <p className="mt-2 text-sm">
          {lastVoteResult.outcome === 'ELIMINATED' ? <>Digantung: <b className="text-crimson-soft">{names([lastVoteResult.eliminatedId!])}</b></> : 'Tidak ada yang digantung.'}
        </p>
      )}
      {game.phase === 'FINISHED' && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {game.matchId && <LinkButton href={`/match/${game.matchId}`} size="sm">Lihat hasil lengkap</LinkButton>}
          <LinkButton href="/lobby" variant="secondary" size="sm">Kembali ke lobby</LinkButton>
        </div>
      )}
    </section>
  );
}

export function GameClient({ gameId, userId }: { gameId: string; userId: string }) {
  const { data, error, loading, refresh } = useGame(gameId, userId);
  const [playersOpen, setPlayersOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const remaining = useCountdown(data?.view.game.phaseEndsAt ?? null, data?.view.serverTime ?? null);

  if (loading && !data) {
    return <div className="grid min-h-dvh place-items-center text-mute">Memuat permainan...</div>;
  }
  if (!data) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <div className="panel max-w-md space-y-3 p-6 text-center">
          <h1 className="font-display text-2xl text-crimson-soft">{error?.code === 'FORBIDDEN' ? 'Akses ditolak' : 'Game tidak bisa dibuka'}</h1>
          <p className="text-sm text-mute">{error?.message ?? 'Terjadi kesalahan.'}</p>
          <Link href="/lobby" className="text-sm text-gold-soft hover:underline">Kembali ke lobby</Link>
        </div>
      </div>
    );
  }

  const { view, messages } = data;
  const actionTargets = view.viewer.actions.length === 1 ? view.viewer.actions[0].candidates : undefined;

  return (
    <div className="flex min-h-dvh flex-col">
      <Header view={view} remaining={remaining} />
      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-3 px-3 pb-24 pt-3 lg:grid-cols-[250px_minmax(0,1fr)_340px] lg:pb-3">
        <aside className="panel hidden max-h-[calc(100dvh-6rem)] overflow-y-auto scroll-thin lg:block">
          <h2 className="border-b border-white/10 px-4 py-3 font-display text-base text-gold-soft">Pemain</h2>
          <PlayerList view={view} selectable={actionTargets} />
        </aside>

        <main className="min-w-0 space-y-3">
          <PhaseBanner view={view} />
          <RoleCard view={view} />
          <ActionPanel view={view} onDone={refresh} />
        </main>

        <aside className="panel hidden h-[calc(100dvh-6rem)] min-h-0 lg:block">
          <ChatPanel view={view} messages={messages} onSent={refresh} />
        </aside>
      </div>

      {/* Mobile: tombol drawer pemain dan chat bottom sheet */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-white/10 bg-night/90 p-2 backdrop-blur-md lg:hidden" aria-label="Navigasi game">
        <button onClick={() => setPlayersOpen(true)} className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-surface py-2.5 text-sm"><Menu className="h-4 w-4" aria-hidden /> Pemain ({view.game.aliveCount})</button>
        <button onClick={() => setChatOpen(true)} className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-surface py-2.5 text-sm"><MessageSquare className="h-4 w-4" aria-hidden /> Chat</button>
      </nav>
      <Sheet open={playersOpen} onClose={() => setPlayersOpen(false)} title="Pemain" side="left">
        <PlayerList view={view} />
      </Sheet>
      <Sheet open={chatOpen} onClose={() => setChatOpen(false)} title="Chat" side="bottom">
        <ChatPanel view={view} messages={messages} onSent={refresh} />
      </Sheet>
    </div>
  );
}
