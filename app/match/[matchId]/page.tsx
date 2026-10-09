import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Sky } from '@/components/layout/sky';
import { Badge } from '@/components/ui/badge';
import { AppError } from '@/lib/api/response';
import { getCurrentUser } from '@/lib/auth/session';
import { TEAM_LABEL, WIN_LABEL } from '@/lib/game/labels';
import { getMatch } from '@/lib/profile/service';
import { ROLES } from '@/lib/roles/registry';
import type { RoleId, TeamId } from '@/lib/game/constants';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Hasil pertandingan' };

export default async function MatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const user = await getCurrentUser();
  let match;
  try {
    match = await getMatch(matchId);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }
  return (
    <>
      <Sky />
      <Navbar username={user?.username ?? null} />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-3xl text-gold-soft">{WIN_LABEL[match.winnerLabel] ?? match.winnerLabel}</h1>
        <p className="mt-1 text-sm text-mute">{match.roomCode} | {match.playerCount} pemain | {match.rounds} ronde | {formatDateTime(match.endedAt)}</p>
        <ul className="mt-6 space-y-2">
          {match.players.map((p) => (
            <li key={p.username} className="panel flex flex-wrap items-center justify-between gap-2 p-3">
              <Link href={`/@${p.username}`} className="font-medium hover:text-gold-soft">@{p.username}</Link>
              <span className="flex flex-wrap items-center gap-1.5">
                <Badge tone={p.team === 'WEREWOLF' ? 'crimson' : 'gold'}>{ROLES[p.role as RoleId].name}</Badge>
                <Badge>{TEAM_LABEL[p.team as TeamId]}</Badge>
                <Badge tone={p.won ? 'green' : 'neutral'}>{p.won ? 'Menang' : 'Kalah'}</Badge>
                {!p.survived && <Badge tone="crimson">Mati</Badge>}
              </span>
            </li>
          ))}
        </ul>
        <Link href="/lobby" className="mt-8 inline-block text-sm text-gold-soft hover:underline">Kembali ke lobby</Link>
      </main>
    </>
  );
}
