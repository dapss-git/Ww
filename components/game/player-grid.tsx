'use client';

import Link from 'next/link';
import { Heart, Skull, Check } from 'lucide-react';
import { ROLES } from '@/lib/roles/registry';
import { cn } from '@/lib/utils';
import type { GameView } from '@/types/game';

interface Props {
  view: GameView;
  selectable?: string[];
  selected?: string[];
  onSelect?: (id: string) => void;
}

export function PlayerGrid({ view, selectable, selected = [], onSelect }: Props) {
  const wolfVoteCount: Record<string, number> = {};
  for (const v of view.viewer.wolfVotes) wolfVoteCount[v.targetId] = (wolfVoteCount[v.targetId] ?? 0) + 1;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 p-2 sm:p-3">
      {view.players.map((p) => {
        const dead = p.status !== 'ALIVE';
        const canPick = Boolean(onSelect && selectable?.includes(p.id));
        const isSel = selected.includes(p.id);

        const cardContent = (
          <div
            className={cn(
              'relative flex flex-col items-center justify-between rounded-2xl p-2.5 text-center transition-all duration-200 aspect-square select-none overflow-hidden backdrop-blur-md',
              dead
                ? 'bg-black/60 border border-crimson/30 grayscale contrast-125'
                : 'bg-white/5 border border-white/10 hover:border-gold/50 hover:bg-white/10 shadow-lg',
              p.isYou && !dead && 'ring-2 ring-gold/70 border-gold/40 bg-gold/5 shadow-[0_0_15px_rgba(201,164,92,0.2)]',
              isSel && 'ring-2 ring-crimson border-crimson bg-crimson/15 shadow-[0_0_20px_rgba(225,29,72,0.4)]',
              canPick && 'cursor-pointer hover:scale-105 active:scale-95'
            )}
          >
            {/* RIP Tombstone Watermark / Graphic for Dead Players */}
            {dead && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/75 p-1 backdrop-blur-[2px]">
                <div className="relative flex flex-col items-center">
                  <div className="w-10 h-12 border-2 border-stone-500 rounded-t-full bg-stone-800/90 flex flex-col items-center justify-center shadow-lg">
                    <span className="font-serif font-black tracking-widest text-[11px] text-stone-300">R.I.P</span>
                    <Skull className="h-3.5 w-3.5 text-crimson-soft opacity-80 mt-0.5" />
                  </div>
                  <span className="mt-1 text-[10px] font-semibold text-stone-400 uppercase tracking-tighter truncate max-w-[80px]">
                    {p.username}
                  </span>
                  {p.deathReason && (
                    <span className="text-[8px] text-crimson-soft/90 max-w-[75px] truncate">
                      {p.deathReason}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Header: Seat number & Status badges */}
            <div className="flex w-full items-center justify-between text-[11px] font-mono leading-none z-0">
              <span className="rounded-md bg-black/40 px-1.5 py-0.5 text-mute font-bold">#{p.seat}</span>
              <div className="flex items-center gap-1">
                {p.isLover && <Heart className="h-3.5 w-3.5 text-crimson-soft animate-pulse fill-crimson" />}
                {!dead && <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />}
              </div>
            </div>

            {/* Avatar Circle */}
            <div className="relative my-auto flex flex-col items-center justify-center z-0">
              <div
                className={cn(
                  'h-12 w-12 sm:h-14 sm:w-14 rounded-full border-2 flex items-center justify-center font-display text-lg uppercase shadow-inner transition-transform',
                  p.isYou ? 'border-gold bg-gold/20 text-gold-soft' : 'border-white/20 bg-surface/80 text-ink'
                )}
              >
                {p.username.slice(0, 2)}
              </div>
              {p.isYou && (
                <span className="absolute -bottom-1 rounded-full bg-gold px-1.5 py-0.2 text-[9px] font-bold text-night uppercase tracking-wider">
                  Kamu
                </span>
              )}
            </div>

            {/* Username clickable to Profile */}
            <div className="w-full truncate z-20">
              <Link
                href={`/@${p.username}`}
                onClick={(e) => e.stopPropagation()}
                className="font-medium text-xs text-ink hover:text-gold-soft hover:underline truncate block"
                title={`Lihat profil @${p.username}`}
              >
                @{p.username}
              </Link>
            </div>

            {/* Role indicator if visible */}
            {p.role && (
              <span className={cn('text-[10px] font-semibold truncate max-w-full px-1 z-0', p.team === 'WEREWOLF' ? 'text-crimson-soft' : 'text-gold-soft')}>
                {ROLES[p.role].name}
              </span>
            )}

            {/* Vote Indicators */}
            <div className="absolute bottom-1 right-1 flex items-center gap-1 z-20">
              {view.game.phase === 'VOTING' && p.hasVoted && (
                <span className="rounded-full bg-emerald-500/20 p-0.5 text-emerald-400" title="Sudah voting">
                  <Check className="h-3 w-3 stroke-[3]" />
                </span>
              )}
              {view.game.phase === 'VOTING' && (view.tally[p.id] ?? 0) > 0 && (
                <span className="rounded-full bg-crimson px-1.5 py-0.2 text-[10px] font-bold text-white shadow-sm">
                  {view.tally[p.id]}
                </span>
              )}
              {wolfVoteCount[p.id] ? (
                <span className="rounded-full bg-purple px-1.5 py-0.2 text-[10px] font-bold text-white shadow-sm">
                  {wolfVoteCount[p.id]}
                </span>
              ) : null}
            </div>
          </div>
        );

        return (
          <div key={p.id}>
            {canPick ? (
              <button
                type="button"
                onClick={() => onSelect?.(p.id)}
                className="w-full text-left focus:outline-none"
              >
                {cardContent}
              </button>
            ) : (
              cardContent
            )}
          </div>
        );
      })}
    </div>
  );
}
