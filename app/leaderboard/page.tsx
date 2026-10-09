import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Sky } from '@/components/layout/sky';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { Trophy, Medal, Award, Flame, Coins, Crown, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const viewer = await getCurrentUser();

  // Ambil top 50 pemain berdasarkan jumlah kemenangan
  const topWinners = await prisma.matchPlayer.groupBy({
    by: ['userId'],
    where: { won: true },
    _count: { matchId: true },
    orderBy: { _count: { matchId: 'desc' } },
    take: 50,
  });

  const userIds = topWinners.map((w) => w.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, coins: true, title: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  const leaderboard = topWinners.map((w, index) => {
    const u = userMap.get(w.userId);
    const winCount = w._count.matchId;

    let computedTitle = 'Warga Biasa';
    if (winCount >= 20) computedTitle = 'Penguasa Malam Abadi';
    else if (winCount >= 10) computedTitle = 'Pemenang Sejati';
    else if (winCount >= 5) computedTitle = 'Penyintas Tangguh';
    else if (winCount >= 1) computedTitle = 'Pemburu Ulung';

    return {
      rank: index + 1,
      id: w.userId,
      username: u?.username ?? 'Anonim',
      wins: winCount,
      coins: (u?.coins ?? 100) + winCount * 50,
      title: u?.title && u.title !== 'Warga Pemula' ? u.title : computedTitle,
    };
  });

  return (
    <>
      <Sky />
      <Navbar username={viewer?.username ?? null} />
      <main className="mx-auto max-w-4xl px-4 py-8 pb-32">
        <div className="panel p-6 mb-6 text-center border-gold/40 bg-gradient-to-b from-surface via-night/80 to-surface">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/20 text-gold-soft shadow-glow">
            <Trophy className="h-8 w-8" />
          </div>
          <h1 className="font-display text-3xl text-gold-soft">Papan Peringkat Desa</h1>
          <p className="mt-1 text-sm text-mute">
            Para legenda dan pejuang yang paling sering memenangkan pertempuran Werewolf.
          </p>
        </div>

        {leaderboard.length === 0 ? (
          <div className="panel p-8 text-center text-mute">
            <p className="text-base">Belum ada pertandingan yang selesai.</p>
            <p className="text-xs mt-1">Jadilah yang pertama menang dan ukir namamu di sini!</p>
          </div>
        ) : (
          <div className="panel overflow-hidden">
            <div className="divide-y divide-white/5">
              {leaderboard.map((player) => {
                const isTop1 = player.rank === 1;
                const isTop2 = player.rank === 2;
                const isTop3 = player.rank === 3;
                const isSelf = viewer?.id === player.id;

                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-4 transition-colors ${
                      isSelf ? 'bg-gold/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="flex w-8 items-center justify-center font-display text-lg font-bold">
                        {isTop1 ? (
                          <Crown className="h-6 w-6 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                        ) : isTop2 ? (
                          <Medal className="h-5 w-5 text-slate-300" />
                        ) : isTop3 ? (
                          <Medal className="h-5 w-5 text-amber-700" />
                        ) : (
                          <span className="text-sm text-mute">#{player.rank}</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/@${player.username}`}
                            className="font-medium text-ink hover:text-gold-soft hover:underline truncate"
                          >
                            @{player.username}
                          </Link>
                          {isSelf && (
                            <span className="rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold text-gold-soft">
                              Kamu
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-soft">
                            <Sparkles className="h-3 w-3" /> {player.title}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div className="hidden sm:block">
                        <p className="text-xs text-mute flex items-center justify-end gap-1">
                          <Coins className="h-3 w-3 text-gold" /> {player.coins} Koin
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-right min-w-[75px]">
                        <span className="block font-display text-lg font-bold text-gold-soft">
                          {player.wins}
                        </span>
                        <span className="block text-[10px] text-mute uppercase tracking-wider">Menang</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
