import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { AppError } from '@/lib/api/response';
import { revokeAllSessions } from '@/lib/auth/session';
import { getRealtime, emitAll } from '@/lib/realtime';
import { gameChannel, LOBBY_CHANNEL, roomChannel } from '@/lib/realtime/channels';

/** Audit log: tidak pernah menyimpan password atau token. */
export async function audit(ownerId: string, action: string, targetType?: string, targetId?: string, meta?: Record<string, unknown>) {
  await prisma.ownerAuditLog.create({
    data: { ownerId, action, targetType, targetId, meta: meta ? (meta as Prisma.InputJsonValue) : undefined },
  });
}

export async function dashboardStats() {
  const now = Date.now();
  const dbStart = now;
  const [users, online, totalRooms, activeGames, finishedMatches, wins, losses, recentGames, recentUsers, activeRooms] = await Promise.all([
    prisma.user.count({ where: { role: 'USER' } }),
    prisma.user.count({ where: { role: 'USER', lastSeenAt: { gte: new Date(now - 5 * 60_000) } } }),
    prisma.room.count(),
    prisma.game.count({ where: { phase: { not: 'FINISHED' } } }),
    prisma.match.count(),
    prisma.matchPlayer.count({ where: { won: true } }),
    prisma.matchPlayer.count({ where: { won: false } }),
    prisma.match.findMany({ orderBy: { endedAt: 'desc' }, take: 8 }),
    prisma.user.findMany({ where: { role: 'USER' }, orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, username: true, createdAt: true, disabled: true } }),
    prisma.room.findMany({
      where: { status: { in: ['WAITING', 'STARTING', 'IN_PROGRESS'] } },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: { host: { select: { username: true } }, game: { select: { id: true, phase: true, round: true } }, _count: { select: { players: true, spectators: true } } },
    }),
  ]);
  const rt = getRealtime();
  return {
    totals: { users, online, totalRooms, activeGames, finishedMatches, wins, losses },
    recentGames: recentGames.map((m) => ({ id: m.id, roomCode: m.roomCode, winnerLabel: m.winnerLabel, playerCount: m.playerCount, endedAt: m.endedAt.getTime() })),
    recentUsers: recentUsers.map((u) => ({ id: u.id, username: u.username, createdAt: u.createdAt.getTime(), disabled: u.disabled })),
    activeRooms: activeRooms.map((r) => ({
      id: r.id,
      code: r.code,
      host: r.host.username,
      status: r.status,
      visibility: r.visibility,
      players: r._count.players,
      maxPlayers: r.maxPlayers,
      spectators: r._count.spectators,
      gamePhase: r.game?.phase ?? null,
      round: r.game?.round ?? null,
    })),
    system: {
      database: { ok: true, latencyMs: Date.now() - dbStart },
      realtime: { provider: rt.name, configured: rt.configured, status: rt.configured ? 'CONNECTED' : 'POLLING_ONLY' },
    },
  };
}

export async function searchUsers(q: string) {
  const query = q.trim().toLowerCase();
  const users = await prisma.user.findMany({
    where: { role: 'USER', ...(query ? { username: { contains: query } } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 25,
    select: { id: true, username: true, disabled: true, createdAt: true, lastSeenAt: true, _count: { select: { matchPlayers: true } } },
  });
  return users.map((u) => ({
    id: u.id,
    username: u.username,
    disabled: u.disabled,
    createdAt: u.createdAt.getTime(),
    lastSeenAt: u.lastSeenAt?.getTime() ?? null,
    matches: u._count.matchPlayers,
  }));
}

export async function setUserDisabled(ownerId: string, userId: string, disabled: boolean) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('NOT_FOUND', 'Pengguna tidak ditemukan.');
  if (user.role === 'OWNER') throw new AppError('FORBIDDEN', 'Akun owner tidak bisa dinonaktifkan.');
  await prisma.user.update({ where: { id: userId }, data: { disabled } });
  if (disabled) await revokeAllSessions(userId);
  await audit(ownerId, disabled ? 'USER_DISABLED' : 'USER_ENABLED', 'User', userId, { username: user.username });
}

export async function deleteUser(ownerId: string, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('NOT_FOUND', 'Pengguna tidak ditemukan.');
  if (user.role === 'OWNER') throw new AppError('FORBIDDEN', 'Akun owner tidak bisa dihapus.');
  await revokeAllSessions(userId);
  await prisma.user.delete({ where: { id: userId } });
  await audit(ownerId, 'USER_DELETED', 'User', userId, { username: user.username });
}

export async function endRoom(ownerId: string, roomId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { game: true } });
  if (!room) throw new AppError('NOT_FOUND', 'Room tidak ditemukan.');
  await prisma.$transaction(async (tx) => {
    await tx.room.update({ where: { id: roomId }, data: { status: 'CLOSED', finishedAt: new Date() } });
    if (room.game && room.game.phase !== 'FINISHED') {
      // Game rusak diakhiri tanpa membuat Match (riwayat tidak dipalsukan).
      await tx.game.update({ where: { id: room.game.id }, data: { phase: 'FINISHED', endedAt: new Date(), phaseEndsAt: new Date() } });
    }
  });
  await audit(ownerId, 'ROOM_ENDED', 'Room', roomId, { code: room.code });
  await emitAll([
    { channel: roomChannel(room.code), event: 'room:closed', payload: { roomCode: room.code } },
    ...(room.game ? [{ channel: gameChannel(room.game.id), event: 'game:finished' as const, payload: { gameId: room.game.id } }] : []),
    { channel: LOBBY_CHANNEL, event: 'lobby:updated', payload: { at: Date.now() } },
  ]);
}

export async function deleteRoom(ownerId: string, roomId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { game: true } });
  if (!room) throw new AppError('NOT_FOUND', 'Room tidak ditemukan.');
  if (room.status === 'IN_PROGRESS' || room.status === 'STARTING') {
    throw new AppError('INVALID_PHASE', 'Akhiri room terlebih dahulu sebelum menghapusnya.');
  }
  // Riwayat Match tidak punya FK ke Room/Game, sehingga tetap tersimpan.
  await prisma.room.delete({ where: { id: roomId } });
  await audit(ownerId, 'ROOM_DELETED', 'Room', roomId, { code: room.code });
  await emitAll([{ channel: LOBBY_CHANNEL, event: 'lobby:updated', payload: { at: Date.now() } }]);
}

export async function viewRoom(roomId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      host: { select: { username: true } },
      players: { include: { user: { select: { username: true } } } },
      game: { select: { id: true, phase: true, round: true, phaseEndsAt: true } },
      _count: { select: { spectators: true } },
    },
  });
  if (!room) throw new AppError('NOT_FOUND', 'Room tidak ditemukan.');
  // Hanya info publik: tidak menyertakan role pemain.
  return {
    code: room.code,
    status: room.status,
    host: room.host.username,
    players: room.players.map((p) => p.user.username),
    spectators: room._count.spectators,
    game: room.game ? { id: room.game.id, phase: room.game.phase, round: room.game.round } : null,
  };
}

export async function listAudit() {
  const logs = await prisma.ownerAuditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 30, include: { owner: { select: { username: true } } } });
  return logs.map((l) => ({ id: l.id, owner: l.owner.username, action: l.action, targetType: l.targetType, targetId: l.targetId, createdAt: l.createdAt.getTime() }));
}

export async function deleteAllRooms(ownerId: string) {
  const rooms = await prisma.room.findMany({ select: { id: true, code: true } });
  for (const r of rooms) {
    try {
      await prisma.room.delete({ where: { id: r.id } });
    } catch {
      // ignore
    }
  }
  await audit(ownerId, 'ALL_ROOMS_DELETED', 'System');
  await emitAll([{ channel: LOBBY_CHANNEL, event: 'lobby:updated', payload: { at: Date.now() } }]);
  return { deleted: rooms.length };
}
