'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Eye, Moon, Skull, Sun, Users, Volume2, VolumeX, AlertOctagon, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/button';
import { useCountdown } from '@/hooks/use-countdown';
import { useGame } from '@/hooks/use-game';
import { PHASE_LABEL, TEAM_LABEL, WIN_LABEL } from '@/lib/game/labels';
import { ROLES } from '@/lib/roles/registry';
import { cn, formatClock } from '@/lib/utils';
import { api, ApiClientError } from '@/lib/client/api';
import type { GameView } from '@/types/game';
import { ActionPanel } from './action-panel';
import { ChatPanel } from './chat-panel';
import { PlayerGrid } from './player-grid';

const NIGHT_PHASES = ['NIGHT', 'ROLE_ACTION'];
const DAY_PHASES = ['DAY', 'DISCUSSION', 'VOTING'];

function Header({
  view,
  remaining,
  onEndGame,
  isEnding,
  soundEnabled,
  toggleSound,
}: {
  view: GameView;
  remaining: number;
  onEndGame?: () => void;
  isEnding?: boolean;
  soundEnabled: boolean;
  toggleSound: () => void;
}) {
  const { game } = view;
  const isNight = NIGHT_PHASES.includes(game.phase);
  const isHost = view.viewer.isHost;

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-night/80 backdrop-blur-xl transition-colors duration-500">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mute">
          <Link href="/lobby" className="flex items-center gap-1 font-display text-sm tracking-wide text-gold-soft hover:underline">
            <ArrowLeft className="h-4 w-4" /> {game.roomCode}
          </Link>
          <span className="rounded-md bg-white/5 px-2 py-0.5 font-medium">Ronde {game.round}</span>
          <span className="inline-flex items-center gap-1 font-semibold text-ink">
            {isNight ? <Moon className="h-3.5 w-3.5 text-purple-soft animate-pulse" /> : <Sun className="h-3.5 w-3.5 text-amber-400" />}
            {PHASE_LABEL[game.phase]}
          </span>
          <span className="inline-flex items-center gap-1 text-emerald-400">
            <Users className="h-3.5 w-3.5" /> {game.aliveCount} hidup
          </span>
          <span className="inline-flex items-center gap-1 text-crimson-soft">
            <Skull className="h-3.5 w-3.5" /> {game.deadCount} mati
          </span>
          {game.spectatorCount > 0 && (
            <span className="inline-flex items-center gap-1 text-mute">
              <Eye className="h-3.5 w-3.5" /> {game.spectatorCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Audio toggle button */}
          <button
            type="button"
            onClick={toggleSound}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-surface/80 text-mute hover:text-ink hover:border-gold/40 transition-colors"
            title={soundEnabled ? 'Matikan Efek Suara' : 'Nyalakan Efek Suara'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-gold" /> : <VolumeX className="h-4 w-4 text-mute" />}
          </button>

          {/* Host End Game Button */}
          {isHost && game.phase !== 'FINISHED' && (
            <button
              type="button"
              disabled={isEnding}
              onClick={() => {
                if (confirm('YAKIN INGIN MENGAKHIRI PERMAINAN? Game akan langsung berhenti dan dianggap selesai.')) {
                  onEndGame?.();
                }
              }}
              className="flex items-center gap-1 rounded-lg border border-crimson/50 bg-crimson/20 px-2.5 py-1 text-xs font-semibold text-crimson-soft hover:bg-crimson/30 transition-colors"
              title="Host mengakhiri game"
            >
              <AlertOctagon className="h-3.5 w-3.5" /> Akhiri Game
            </button>
          )}

          {/* Countdown Clock */}
          <div
            className={cn(
              'rounded-xl border px-3 py-1 font-display text-lg tabular-nums shadow-sm transition-colors',
              remaining < 10_000 && game.phase !== 'FINISHED'
                ? 'border-crimson bg-crimson/15 text-crimson-soft animate-pulse'
                : 'border-white/10 bg-surface/80 text-ink'
            )}
            aria-label="Sisa waktu"
            role="timer"
          >
            {game.phase === 'FINISHED' ? '--:--' : formatClock(remaining)}
          </div>
        </div>
      </div>
    </header>
  );
}

function RoleCard({ view }: { view: GameView }) {
  if (!view.viewer.role) return null;
  const role = ROLES[view.viewer.role];
  
  return (
    <section className={cn('panel p-4 border border-gold/30 bg-surface/80 shadow-glow transition-all')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg text-gold-soft flex items-center gap-2">
          Peran Kamu: <span className="text-ink font-bold">{role.name}</span>
        </h2>
        <Badge tone={role.team === 'WEREWOLF' ? 'crimson' : role.team === 'SOLO' ? 'purple' : 'gold'}>
          {TEAM_LABEL[role.team]}
        </Badge>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-mute">{role.description}</p>
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
    case 'NIGHT': text = 'Malam tiba... Seluruh warga desa terlelap tidur, kawanan serigala mulai mengintai.'; break;
    case 'DAY': text = 'Fajar menyingsing di desa! Ayam berkokok, mari dengarkan kabar peristiwa semalam.'; break;
    case 'DISCUSSION': text = 'Waktu berdiskusi! Siapa yang bertingkah paling mencurigakan?'; break;
    case 'VOTING': text = 'Waktu voting! Pilih satu orang yang dicurigai untuk digantung.'; break;
    case 'ROLE_ACTION': text = 'Tembakan terakhir! Pemburu menentukan sasarannya.'; break;
    case 'RESULT': text = 'Hasil keputusan voting warga desa.'; break;
    case 'FINISHED': text = game.winnerLabel ? (WIN_LABEL[game.winnerLabel] ?? 'Permainan telah berakhir') : 'Permainan telah berakhir'; break;
    default: text = '';
  }

  return (
    <section className={cn('panel p-4 transition-all', game.phase === 'FINISHED' ? 'border-gold/50 bg-gold/5' : 'bg-surface/70')}>
      <h2 className="font-display text-xl text-ink">{game.phase === 'FINISHED' ? text : PHASE_LABEL[game.phase]}</h2>
      {game.phase !== 'FINISHED' && <p className="mt-1 text-xs text-mute">{text}</p>}
      {game.phase === 'RESULT' && lastVoteResult && (
        <p className="mt-2 text-xs">
          {lastVoteResult.outcome === 'ELIMINATED' ? (
            <>Warga menggantung: <b className="text-crimson-soft">{names([lastVoteResult.eliminatedId!])}</b></>
          ) : (
            'Hasil imbang, tidak ada yang digantung hari ini.'
          )}
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
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [endingGame, setEndingGame] = useState(false);
  const prevPhase = useRef<string | null>(null);

  const remaining = useCountdown(data?.view.game.phaseEndsAt ?? null, data?.view.serverTime ?? null);

  // Play Sound Effects on phase transitions
  useEffect(() => {
    if (!data?.view?.game?.phase || !soundEnabled) return;
    const currentPhase = data.view.game.phase;

    if (prevPhase.current && prevPhase.current !== currentPhase) {
      if (NIGHT_PHASES.includes(currentPhase)) {
        try {
          const wolfAudio = new Audio('/wolf.wav');
          wolfAudio.volume = 0.6;
          wolfAudio.play().catch(() => {});
        } catch {}
      } else if (DAY_PHASES.includes(currentPhase) && prevPhase.current === 'NIGHT') {
        try {
          const roosterAudio = new Audio('/rooster.wav');
          roosterAudio.volume = 0.6;
          roosterAudio.play().catch(() => {});
        } catch {}
      }
    }
    prevPhase.current = currentPhase;
  }, [data?.view?.game?.phase, soundEnabled]);

  async function handleEndGame() {
    if (!data?.view?.game?.roomCode) return;
    setEndingGame(true);
    try {
      await api(`/api/rooms/${data.view.game.roomCode}/end`, { method: 'POST' });
      await refresh();
    } catch (e) {
      alert(e instanceof ApiClientError ? e.message : 'Gagal mengakhiri game.');
    } finally {
      setEndingGame(false);
    }
  }

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
  const isNight = NIGHT_PHASES.includes(view.game.phase);
  const isDay = DAY_PHASES.includes(view.game.phase);
  const actionTargets = view.viewer.actions.length === 1 ? view.viewer.actions[0].candidates : undefined;

  return (
    <div
      className={cn(
        'relative flex min-h-dvh flex-col transition-all duration-700',
        isNight ? 'night-sky' : isDay ? 'day-sky' : 'bg-night'
      )}
    >
      {/* Dynamic Background Atmosphere */}
      {isNight && (
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
          {/* Latar Belakang Bulan Purnama */}
          <div className="moon absolute right-8 top-12 h-28 w-28 sm:h-36 sm:w-36 rounded-full opacity-80" />
          <div className="fog-layer absolute inset-0 opacity-40 pointer-events-none" />
        </div>
      )}

      {isDay && (
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
          {/* Sinar Mentari Pagi Desa */}
          <div className="sun-glow absolute left-10 top-10 h-36 w-36 sm:h-48 sm:w-48 rounded-full opacity-50" />
          <div className="fog-layer absolute inset-0 opacity-20 pointer-events-none" />
        </div>
      )}

      <Header
        view={view}
        remaining={remaining}
        onEndGame={handleEndGame}
        isEnding={endingGame}
        soundEnabled={soundEnabled}
        toggleSound={() => setSoundEnabled((v) => !v)}
      />

      {/* Main Game Arena: Sesuai Permintaan User:
          Grid pemain bergaya TikTok Live di atas,
          kemudian di bawah grid ada Peran, Aksi, dan Kolom Chat di bawahnya */}
      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-3 py-4 space-y-4">
        {/* Phase Announcement Banner */}
        <PhaseBanner view={view} />

        {/* 1. Grid Pemain (TikTok Live Style Box Kotak-kotak Berjejer) */}
        <section className="panel overflow-hidden border border-white/10 bg-surface/70 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
            <h2 className="font-display text-sm tracking-wide text-gold-soft flex items-center gap-2">
              <Users className="h-4 w-4" /> Pemain Desa ({view.players.length})
            </h2>
            <span className="text-[11px] text-mute">Klik profil pemain untuk lihat info akun</span>
          </div>
          <PlayerGrid
            view={view}
            selectable={actionTargets}
            selected={selectedTarget ? [selectedTarget] : []}
            onSelect={(id) => setSelectedTarget((cur) => (cur === id ? null : id))}
          />
        </section>

        {/* 2. Di bawah Grid: Peran & Aksi Kamu */}
        <div className="space-y-3">
          <RoleCard view={view} />
          <ActionPanel view={view} onDone={refresh} />
        </div>

        {/* 3. Di bawah Peran: Kolom Chat Panel Full Width */}
        <section className="panel h-[420px] flex flex-col overflow-hidden border border-white/10 bg-surface/75 backdrop-blur-md shadow-2xl">
          <div className="border-b border-white/10 px-4 py-2.5">
            <h2 className="font-display text-sm text-gold-soft">Obrolan Desa (Chat)</h2>
          </div>
          <div className="flex-1 min-h-0">
            <ChatPanel view={view} messages={messages} onSent={refresh} />
          </div>
        </section>
      </main>
    </div>
  );
}
