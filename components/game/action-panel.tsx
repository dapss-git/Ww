'use client';

import { useState } from 'react';
import { Check, Eye, Heart, Search, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, ApiClientError } from '@/lib/client/api';
import { TEAM_LABEL } from '@/lib/game/labels';
import { ROLES } from '@/lib/roles/registry';
import type { AvailableActionView, GameView, PrivateLogEntry } from '@/types/game';
import { cn } from '@/lib/utils';

interface Props {
  view: GameView;
  onDone: () => void;
}

function nameOf(view: GameView, id: string | undefined) {
  return view.players.find((p) => p.id === id)?.username ?? '???';
}

function LogLine({ view, entry }: { view: GameView; entry: PrivateLogEntry }) {
  if (entry.kind === 'INSPECT') {
    return <li>Malam {entry.round}: <b>{nameOf(view, entry.targetId)}</b> berada di tim <b>{entry.team ? TEAM_LABEL[entry.team] : '?'}</b>.</li>;
  }
  if (entry.kind === 'TRACK') {
    const visited = entry.visited ?? [];
    return <li>Malam {entry.round}: <b>{nameOf(view, entry.targetId)}</b> {visited.length ? `mengunjungi ${visited.map((v) => nameOf(view, v)).join(', ')}` : 'tidak mengunjungi siapa pun'}.</li>;
  }
  return <li>Malam {entry.round}: {entry.text}</li>;
}

export function ActionPanel({ view, onDone }: Props) {
  const { viewer, game } = view;
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function submit(action: AvailableActionView, targetIds: string[]) {
    setBusy(action.type);
    setError(null);
    try {
      await api(`/api/games/${game.id}/action`, { method: 'POST', json: { type: action.type, targetIds } });
      onDone();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : 'Aksi gagal.');
    } finally {
      setBusy(null);
    }
  }

  async function vote(targetId: string) {
    setBusy(`vote-${targetId}`);
    setError(null);
    try {
      await api(`/api/games/${game.id}/vote`, { method: 'POST', json: { targetId } });
      onDone();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : 'Vote gagal.');
    } finally {
      setBusy(null);
    }
  }

  const togglePick = (action: AvailableActionView, id: string) => {
    setPicked((prev) => {
      const current = prev[action.type] ?? action.selected;
      const next = current.includes(id) ? current.filter((x) => x !== id) : action.targetCount === 1 ? [id] : [...current, id].slice(-action.targetCount);
      return { ...prev, [action.type]: next };
    });
  };

  if (viewer.kind === 'spectator') {
    return (
      <div className="panel flex items-center gap-2 p-4 text-sm text-mute">
        <Eye className="h-4 w-4 shrink-0 text-gold" aria-hidden /> Kamu menonton. Hanya informasi publik yang terlihat.
      </div>
    );
  }

  const role = viewer.role ? ROLES[viewer.role] : null;

  return (
    <div className="space-y-3">
      {game.phase === 'VOTING' && viewer.alive && (
        <section className="panel space-y-2 p-4">
          <h3 className="flex items-center gap-2 font-display text-lg text-crimson-soft"><Target className="h-4 w-4" aria-hidden /> Vote untuk digantung{game.voteRound === 2 ? ' (voting ulang)' : ''}</h3>
          {viewer.votedFor ? (
            <p className="flex items-center gap-2 text-sm text-emerald-300"><Check className="h-4 w-4" aria-hidden /> Kamu memilih {nameOf(view, viewer.votedFor)}.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {view.players.filter((p) => p.status === 'ALIVE' && !p.isYou).map((p) => (
                <Button key={p.id} variant="secondary" size="sm" loading={busy === `vote-${p.id}`} disabled={!viewer.canVote} onClick={() => vote(p.id)}>{p.username}</Button>
              ))}
            </div>
          )}
        </section>
      )}

      {viewer.actions.map((action) => {
        const selected = picked[action.type] ?? action.selected.filter((s) => s !== '*');
        const done = action.selected.length > 0;
        return (
          <section key={action.type} className="panel space-y-2 p-4">
            <h3 className="flex flex-wrap items-center gap-2 font-display text-lg text-gold-soft">
              {action.label}
              {action.usesLeft !== null && <span className="text-xs text-mute">sisa {action.usesLeft}x</span>}
              {done && <span className="flex items-center gap-1 text-xs text-emerald-300"><Check className="h-3.5 w-3.5" aria-hidden />Terkirim</span>}
            </h3>
            {action.targetCount === 0 ? (
              <Button loading={busy === action.type} variant="danger" onClick={() => submit(action, [])}>{action.label}</Button>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {action.candidates.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => togglePick(action, id)}
                      className={cn('rounded-lg border px-3 py-1.5 text-sm', selected.includes(id) ? 'border-gold bg-gold/15 text-gold-soft' : 'border-white/10 bg-night/60 text-ink hover:border-gold/50')}
                    >
                      {nameOf(view, id)}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" loading={busy === action.type} disabled={selected.length !== action.targetCount} onClick={() => submit(action, selected)}>Konfirmasi</Button>
                  {done && <Button size="sm" variant="ghost" onClick={() => submit(action, [])}>Batalkan</Button>}
                </div>
              </>
            )}
          </section>
        );
      })}

      {viewer.attackTargetId && (
        <p className="panel flex items-center gap-2 p-3 text-sm"><Search className="h-4 w-4 text-crimson-soft" aria-hidden /> Malam ini serigala mengincar <b>{nameOf(view, viewer.attackTargetId)}</b>.</p>
      )}
      {viewer.doused.length > 0 && <p className="panel p-3 text-sm">Sudah disiram: {viewer.doused.map((d) => nameOf(view, d)).join(', ')}.</p>}
      {viewer.partnerId && (
        <p className="panel flex items-center gap-2 p-3 text-sm"><Heart className="h-4 w-4 text-crimson-soft" aria-hidden /> Pasanganmu adalah <b>{nameOf(view, viewer.partnerId)}</b>.</p>
      )}
      {viewer.log.length > 0 && (
        <section className="panel space-y-1.5 p-4 text-sm">
          <h3 className="font-display text-base text-gold-soft">Catatan rahasia</h3>
          <ul className="list-inside list-disc space-y-1 text-mute">{viewer.log.map((e, i) => <LogLine key={i} view={view} entry={e} />)}</ul>
        </section>
      )}
      {!viewer.alive && game.phase !== 'FINISHED' && <p className="panel p-3 text-sm text-mute">Kamu sudah mati. Kamu masih bisa menonton, tapi tidak bisa beraksi, voting, atau chat.</p>}
      {role && viewer.alive && viewer.actions.length === 0 && game.phase === 'NIGHT' && <p className="panel p-3 text-sm text-mute">Tidak ada kemampuan malam untuk {role.name}. Tunggu fajar.</p>}
      {error && <p role="alert" className="rounded-lg border border-crimson/50 bg-crimson/10 px-3 py-2 text-sm text-crimson-soft">{error}</p>}
    </div>
  );
}
