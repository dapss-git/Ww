import { Check, Heart, Skull } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLES } from '@/lib/roles/registry';
import type { GameView } from '@/types/game';

interface Props {
  view: GameView;
  selectable?: string[];
  selected?: string[];
  onSelect?: (id: string) => void;
}

export function PlayerList({ view, selectable, selected = [], onSelect }: Props) {
  const wolfVoteCount: Record<string, number> = {};
  for (const v of view.viewer.wolfVotes) wolfVoteCount[v.targetId] = (wolfVoteCount[v.targetId] ?? 0) + 1;

  return (
    <ul className="space-y-1.5 p-3">
      {view.players.map((p) => {
        const dead = p.status !== 'ALIVE';
        const canPick = Boolean(onSelect && selectable?.includes(p.id));
        const isSel = selected.includes(p.id);
        const cls = cn(
          'flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm',
          dead ? 'border-white/5 bg-night/40 text-mute' : 'border-white/10 bg-night/60',
          p.isYou && 'border-gold/40',
          canPick && 'cursor-pointer hover:border-gold/60',
          isSel && 'border-gold bg-gold/10',
        );
        const content = (
          <>
            <span className="flex min-w-0 items-center gap-2">
              {dead ? <Skull className="h-4 w-4 shrink-0 text-crimson-soft" aria-label="Mati" /> : <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" aria-label="Hidup" />}
              <span className={cn('truncate', dead && 'line-through')}>{p.username}{p.isYou ? ' (kamu)' : ''}</span>
              {p.isLover && <Heart className="h-3.5 w-3.5 shrink-0 text-crimson-soft" aria-label="Pasangan" />}
            </span>
            <span className="flex shrink-0 items-center gap-1.5 text-xs">
              {p.role && <span className={p.team === 'WEREWOLF' ? 'text-crimson-soft' : 'text-gold-soft'}>{ROLES[p.role].name}</span>}
              {view.game.phase === 'VOTING' && p.hasVoted && <Check className="h-3.5 w-3.5 text-emerald-300" aria-label="Sudah vote" />}
              {view.game.phase === 'VOTING' && (view.tally[p.id] ?? 0) > 0 && <span className="rounded bg-crimson/20 px-1.5 text-crimson-soft">{view.tally[p.id]}</span>}
              {wolfVoteCount[p.id] ? <span className="rounded bg-crimson/20 px-1.5 text-crimson-soft">{wolfVoteCount[p.id]}</span> : null}
            </span>
          </>
        );
        return (
          <li key={p.id}>
            {canPick ? (
              <button type="button" onClick={() => onSelect?.(p.id)} className={cls}>{content}</button>
            ) : (
              <div className={cls}>{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
