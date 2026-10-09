import { prisma } from '@/lib/db/prisma';
import { AppError } from '@/lib/api/response';
import { sanitizeMultiline } from '@/lib/security/sanitize';
import { z } from 'zod';

export const profileUpdateSchema = z.object({
  bio: z.string().max(280, 'Bio maksimal 280 karakter').optional(),
  avatarUrl: z.union([z.string().url().max(300).startsWith('https://', 'URL harus https'), z.literal('')]).optional(),
  bannerUrl: z.union([z.string().url().max(300).startsWith('https://', 'URL harus https'), z.literal('')]).optional(),
});

export interface ProfileData {
  id: string;
  username: string;
  bio: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  createdAt: number;
  followers: number;
  following: number;
  isSelf: boolean;
  isFollowing: boolean;
  stats: {
    totalGames: number;
    wins: number;
    losses: number;
    winRate: number;
    mostPlayedRole: string | null;
    mostWonRole: string | null;
  };
  history: {
    matchId: string;
    roomCode: string;
    role: string;
    team: string;
    won: boolean;
    winnerTeam: string;
    winnerLabel: string;
    playerCount: number;
    startedAt: number;
    endedAt: number;
  }[];
}

/** Statistik dihitung di database (count/groupBy), bukan di browser. */
export async function getProfile(username: string, viewerId: string | null): Promise<ProfileData> {
  const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
  if (!user) throw new AppError('NOT_FOUND', 'Pengguna tidak ditemukan.');

  const [followers, following, total, wins, played, won, history, follow] = await Promise.all([
    prisma.follow.count({ where: { followingId: user.id } }),
    prisma.follow.count({ where: { followerId: user.id } }),
    prisma.matchPlayer.count({ where: { userId: user.id } }),
    prisma.matchPlayer.count({ where: { userId: user.id, won: true } }),
    prisma.matchPlayer.groupBy({ by: ['role'], where: { userId: user.id }, _count: { _all: true }, orderBy: { _count: { role: 'desc' } }, take: 1 }),
    prisma.matchPlayer.groupBy({ by: ['role'], where: { userId: user.id, won: true }, _count: { _all: true }, orderBy: { _count: { role: 'desc' } }, take: 1 }),
    prisma.matchPlayer.findMany({ where: { userId: user.id }, orderBy: { match: { endedAt: 'desc' } }, take: 20, include: { match: true } }),
    viewerId ? prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: user.id } } }) : Promise.resolve(null),
  ]);

  return {
    id: user.id,
    username: user.username,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    bannerUrl: user.bannerUrl,
    createdAt: user.createdAt.getTime(),
    followers,
    following,
    isSelf: viewerId === user.id,
    isFollowing: Boolean(follow),
    stats: {
      totalGames: total,
      wins,
      losses: total - wins,
      winRate: total === 0 ? 0 : Math.round((wins / total) * 1000) / 10,
      mostPlayedRole: played[0]?.role ?? null,
      mostWonRole: won[0]?.role ?? null,
    },
    history: history.map((h) => ({
      matchId: h.matchId,
      roomCode: h.match.roomCode,
      role: h.role,
      team: h.team,
      won: h.won,
      winnerTeam: h.match.winnerTeam,
      winnerLabel: h.match.winnerLabel,
      playerCount: h.match.playerCount,
      startedAt: h.match.startedAt.getTime(),
      endedAt: h.match.endedAt.getTime(),
    })),
  };
}

export async function updateProfile(userId: string, input: z.infer<typeof profileUpdateSchema>) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.bio !== undefined ? { bio: sanitizeMultiline(input.bio, 280) } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl || null } : {}),
      ...(input.bannerUrl !== undefined ? { bannerUrl: input.bannerUrl || null } : {}),
    },
  });
}

export async function follow(followerId: string, username: string) {
  const target = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
  if (!target || target.role === 'OWNER' || target.disabled) throw new AppError('NOT_FOUND', 'Pengguna tidak ditemukan.');
  if (target.id === followerId) throw new AppError('VALIDATION_ERROR', 'Kamu tidak bisa mengikuti diri sendiri.');
  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId, followingId: target.id } },
    update: {},
    create: { followerId, followingId: target.id },
  });
}

export async function unfollow(followerId: string, username: string) {
  const target = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
  if (!target) throw new AppError('NOT_FOUND', 'Pengguna tidak ditemukan.');
  await prisma.follow.deleteMany({ where: { followerId, followingId: target.id } });
}

export async function listFollows(username: string, type: 'followers' | 'following') {
  const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
  if (!user) throw new AppError('NOT_FOUND', 'Pengguna tidak ditemukan.');
  const rows = await prisma.follow.findMany({
    where: type === 'followers' ? { followingId: user.id } : { followerId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { follower: { select: { username: true } }, following: { select: { username: true } } },
  });
  return rows.map((r) => (type === 'followers' ? r.follower.username : r.following.username));
}

export async function recentMatches(limit = 10) {
  const matches = await prisma.match.findMany({ orderBy: { endedAt: 'desc' }, take: limit });
  return matches.map((m) => ({
    id: m.id,
    roomCode: m.roomCode,
    winnerLabel: m.winnerLabel,
    winnerTeam: m.winnerTeam,
    playerCount: m.playerCount,
    rounds: m.rounds,
    endedAt: m.endedAt.getTime(),
  }));
}

export async function getMatch(matchId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId }, include: { players: { include: { user: { select: { username: true } } } } } });
  if (!match) throw new AppError('NOT_FOUND', 'Match tidak ditemukan.');
  return {
    id: match.id,
    roomCode: match.roomCode,
    gameMode: match.gameMode,
    winnerTeam: match.winnerTeam,
    winnerLabel: match.winnerLabel,
    playerCount: match.playerCount,
    rounds: match.rounds,
    startedAt: match.startedAt.getTime(),
    endedAt: match.endedAt.getTime(),
    players: match.players.map((p) => ({ username: p.user.username, role: p.role, team: p.team, won: p.won, survived: p.survived })),
  };
}

export async function landingStats() {
  const [users, matches, rooms, online] = await Promise.all([
    prisma.user.count({ where: { role: 'USER' } }),
    prisma.match.count(),
    prisma.room.count({ where: { status: { in: ['WAITING', 'STARTING', 'IN_PROGRESS'] }, visibility: 'PUBLIC' } }),
    prisma.user.count({ where: { role: 'USER', lastSeenAt: { gte: new Date(Date.now() - 5 * 60_000) } } }),
  ]);
  return { users, matches, rooms, online };
}
