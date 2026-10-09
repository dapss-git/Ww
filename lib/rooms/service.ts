import { Prisma } from '@prisma/client';
import { prisma, type Tx } from '@/lib/db/prisma';
import { AppError } from '@/lib/api/response';
import { randomString } from '@/lib/security/random';
import { defaultRoleConfig, validateRoleConfig, type RoleConfig } from '@/lib/game/engine/composition';
import { defaultRoomSettings } from '@/lib/game/settings';
import { computeRoomAccess, type RoomStatusId } from './rules';
import { emitAll } from '@/lib/realtime';
import { LOBBY_CHANNEL, roomChannel } from '@/lib/realtime/channels';
import type { OutboundEvent } from '@/types/realtime';
import type { LobbyRoom, RoomDetail } from '@/types/room';
import type { z } from 'zod';
import type { createRoomSchema, updateRoomSchema } from './schemas';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ACTIVE: RoomStatusId[] = ['WAITING', 'STARTING', 'IN_PROGRESS'];
const FINISHED_VISIBLE_MS = 30 * 60_000;

export async function lockRoom(tx: Tx, roomId: string) {
  await tx.$queryRaw`SELECT id FROM "Room" WHERE id = ${roomId} FOR UPDATE`;
}

const lobbyPing = (): OutboundEvent => ({ channel: LOBBY_CHANNEL, event: 'lobby:updated', payload: { at: Date.now() } });

async function findOtherActiveRoom(userId: string, exceptRoomId?: string) {
  return prisma.roomPlayer.findFirst({
    where: { userId, room: { status: { in: ACTIVE }, ...(exceptRoomId ? { id: { not: exceptRoomId } } : {}) } },
    include: { room: { select: { code: true, status: true, game: { select: { id: true } } } } },
  });
}

async function assertNotInAnotherRoom(userId: string, exceptRoomId?: string) {
  const other = await findOtherActiveRoom(userId, exceptRoomId);
  if (other) {
    throw new AppError('ALREADY_JOINED', `Kamu masih berada di room ${other.room.code}.`, {
      roomCode: other.room.code,
      gameId: other.room.game?.id ?? null,
    });
  }
}

async function getRoomByCode(code: string) {
  const room = await prisma.room.findUnique({ where: { code } });
  if (!room) throw new AppError('NOT_FOUND', 'Room tidak ditemukan.');
  return room;
}

function assertOpen(status: RoomStatusId) {
  if (status === 'CLOSED') throw new AppError('ROOM_CLOSED', 'Room sudah ditutup.');
  if (status === 'FINISHED') throw new AppError('ROOM_FINISHED', 'Game di room ini sudah selesai.');
}

function resolveRoleConfig(input: Record<string, number> | undefined, max: number): RoleConfig {
  const config = (input ?? defaultRoleConfig(max)) as Record<string, number>;
  const problem = validateRoleConfig(config, max);
  if (problem) throw new AppError('VALIDATION_ERROR', problem);
  return config as RoleConfig;
}

export async function createRoom(userId: string, input: z.infer<typeof createRoomSchema>) {
  await assertNotInAnotherRoom(userId);
  const roleConfig = resolveRoleConfig(input.roleConfig, input.maxPlayers);
  const settings = input.settings ?? defaultRoomSettings();

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = `WOLF-${randomString(5, CODE_ALPHABET)}`;
    try {
      const room = await prisma.$transaction(async (tx) => {
        await tx.roomSpectator.deleteMany({ where: { userId } });
        const created = await tx.room.create({
          data: {
            code,
            hostId: userId,
            minPlayers: input.minPlayers,
            maxPlayers: input.maxPlayers,
            gameMode: input.gameMode,
            visibility: input.visibility,
            allowSpectators: input.allowSpectators,
            roleConfig: roleConfig as Prisma.InputJsonValue,
            settings: settings as unknown as Prisma.InputJsonValue,
          },
        });
        await tx.roomPlayer.create({ data: { roomId: created.id, userId, ready: true } });
        return created;
      });
      await emitAll([lobbyPing()]);
      return { code: room.code };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
      throw e;
    }
  }
  throw new AppError('CONFLICT', 'Gagal membuat Room ID unik, coba lagi.');
}

export async function joinRoom(userId: string, code: string) {
  const preview = await getRoomByCode(code);
  await assertNotInAnotherRoom(userId, preview.id);
  const events = await prisma.$transaction(async (tx) => {
    await lockRoom(tx, preview.id);
    const room = await tx.room.findUniqueOrThrow({ where: { id: preview.id }, include: { _count: { select: { players: true } } } });
    const existing = await tx.roomPlayer.findUnique({ where: { roomId_userId: { roomId: room.id, userId } } });
    if (existing) throw new AppError('ALREADY_JOINED', 'Kamu sudah berada di room ini.', { roomCode: room.code });
    assertOpen(room.status);
    if (room.status !== 'WAITING') throw new AppError('INVALID_PHASE', 'Game sudah dimulai. Kamu hanya bisa menonton (spectate).');
    if (room._count.players >= room.maxPlayers) throw new AppError('ROOM_FULL', 'Room sudah penuh. Kamu bisa menonton (spectate).');
    await tx.roomSpectator.deleteMany({ where: { userId } });
    await tx.roomPlayer.create({ data: { roomId: room.id, userId } });
    return [
      { channel: roomChannel(room.code), event: 'room:player_joined', payload: { roomCode: room.code } },
      lobbyPing(),
    ] as OutboundEvent[];
  });
  await emitAll(events);
  return { code };
}

export async function leaveRoom(userId: string, code: string) {
  const preview = await getRoomByCode(code);
  const events = await prisma.$transaction(async (tx) => {
    await lockRoom(tx, preview.id);
    const room = await tx.room.findUniqueOrThrow({ where: { id: preview.id } });
    const out: OutboundEvent[] = [];
    const spectator = await tx.roomSpectator.findUnique({ where: { roomId_userId: { roomId: room.id, userId } } });
    if (spectator) {
      await tx.roomSpectator.delete({ where: { id: spectator.id } });
      out.push({ channel: roomChannel(room.code), event: 'room:spectator_left', payload: { roomCode: room.code } });
      return out;
    }
    const player = await tx.roomPlayer.findUnique({ where: { roomId_userId: { roomId: room.id, userId } } });
    if (!player) throw new AppError('NOT_FOUND', 'Kamu tidak berada di room ini.');
    if (room.status !== 'WAITING') throw new AppError('INVALID_PHASE', 'Tidak bisa keluar saat game berlangsung.');
    await tx.roomPlayer.delete({ where: { id: player.id } });
    const remaining = await tx.roomPlayer.findMany({ where: { roomId: room.id }, orderBy: { joinedAt: 'asc' } });
    if (remaining.length === 0) {
      await tx.room.update({ where: { id: room.id }, data: { status: 'CLOSED', finishedAt: new Date() } });
      out.push({ channel: roomChannel(room.code), event: 'room:closed', payload: { roomCode: room.code } });
    } else {
      if (room.hostId === userId) {
        await tx.room.update({ where: { id: room.id }, data: { hostId: remaining[0].userId } });
        await tx.roomPlayer.update({ where: { id: remaining[0].id }, data: { ready: true } });
      }
      out.push({ channel: roomChannel(room.code), event: 'room:player_left', payload: { roomCode: room.code } });
    }
    out.push(lobbyPing());
    return out;
  });
  await emitAll(events);
}

export async function setReady(userId: string, code: string, ready: boolean) {
  const room = await getRoomByCode(code);
  assertOpen(room.status as RoomStatusId);
  if (room.status !== 'WAITING') throw new AppError('INVALID_PHASE', 'Status ready hanya bisa diubah saat menunggu.');
  const result = await prisma.roomPlayer.updateMany({ where: { roomId: room.id, userId }, data: { ready: room.hostId === userId ? true : ready } });
  if (result.count === 0) throw new AppError('NOT_FOUND', 'Kamu tidak berada di room ini.');
  await emitAll([{ channel: roomChannel(room.code), event: 'room:player_ready', payload: { roomCode: room.code } }]);
}

export async function kickPlayer(hostId: string, code: string, targetUserId: string) {
  const preview = await getRoomByCode(code);
  if (preview.hostId !== hostId) throw new AppError('FORBIDDEN', 'Hanya host yang bisa mengeluarkan pemain.');
  if (targetUserId === hostId) throw new AppError('VALIDATION_ERROR', 'Host tidak bisa mengeluarkan dirinya sendiri.');
  await prisma.$transaction(async (tx) => {
    await lockRoom(tx, preview.id);
    const room = await tx.room.findUniqueOrThrow({ where: { id: preview.id } });
    if (room.status !== 'WAITING') throw new AppError('INVALID_PHASE', 'Tidak bisa kick saat game berlangsung.');
    const res = await tx.roomPlayer.deleteMany({ where: { roomId: room.id, userId: targetUserId } });
    if (res.count === 0) throw new AppError('NOT_FOUND', 'Pemain tidak ada di room ini.');
  });
  await emitAll([
    { channel: roomChannel(code), event: 'room:player_left', payload: { roomCode: code } },
    lobbyPing(),
  ]);
}

export async function updateRoomConfig(hostId: string, code: string, input: z.infer<typeof updateRoomSchema>) {
  const preview = await getRoomByCode(code);
  if (preview.hostId !== hostId) throw new AppError('FORBIDDEN', 'Hanya host yang bisa mengubah konfigurasi.');
  const roleConfig = resolveRoleConfig(input.roleConfig, input.maxPlayers);
  await prisma.$transaction(async (tx) => {
    await lockRoom(tx, preview.id);
    const room = await tx.room.findUniqueOrThrow({ where: { id: preview.id }, include: { _count: { select: { players: true } } } });
    assertOpen(room.status);
    if (room.status !== 'WAITING' || room.hasStarted) {
      throw new AppError('INVALID_PHASE', 'Konfigurasi hanya bisa diubah saat room menunggu dan belum pernah dimulai.');
    }
    if (input.maxPlayers < room._count.players) {
      throw new AppError('VALIDATION_ERROR', `Maksimum pemain tidak boleh kurang dari jumlah pemain saat ini (${room._count.players}).`);
    }
    await tx.room.update({
      where: { id: room.id },
      data: {
        minPlayers: input.minPlayers,
        maxPlayers: input.maxPlayers,
        gameMode: input.gameMode,
        visibility: input.visibility,
        allowSpectators: input.allowSpectators,
        roleConfig: roleConfig as Prisma.InputJsonValue,
        settings: input.settings as unknown as Prisma.InputJsonValue,
      },
    });
  });
  await emitAll([
    { channel: roomChannel(code), event: 'room:player_ready', payload: { roomCode: code } },
    lobbyPing(),
  ]);
}

export async function spectateRoom(userId: string, code: string) {
  const preview = await getRoomByCode(code);
  const events = await prisma.$transaction(async (tx) => {
    await lockRoom(tx, preview.id);
    const room = await tx.room.findUniqueOrThrow({ where: { id: preview.id }, include: { _count: { select: { players: true } } } });
    assertOpen(room.status);
    if (!room.allowSpectators) throw new AppError('FORBIDDEN', 'Room ini tidak mengizinkan spectator.');
    const isPlayer = await tx.roomPlayer.findUnique({ where: { roomId_userId: { roomId: room.id, userId } } });
    if (isPlayer) throw new AppError('ALREADY_JOINED', 'Kamu sudah menjadi pemain di room ini.');
    const access = computeRoomAccess({
      status: room.status,
      playerCount: room._count.players,
      maxPlayers: room.maxPlayers,
      allowSpectators: room.allowSpectators,
      isPlayer: false,
      isSpectator: false,
    });
    if (!access.canSpectate) throw new AppError('INVALID_PHASE', 'Room masih bisa dimasuki sebagai pemain.');
    await tx.roomSpectator.deleteMany({ where: { userId, roomId: { not: room.id } } });
    await tx.roomSpectator.upsert({
      where: { roomId_userId: { roomId: room.id, userId } },
      update: {},
      create: { roomId: room.id, userId },
    });
    return [
      { channel: roomChannel(room.code), event: 'room:spectator_joined', payload: { roomCode: room.code } },
      lobbyPing(),
    ] as OutboundEvent[];
  });
  await emitAll(events);
}

export async function listPublicRooms(userId: string): Promise<LobbyRoom[]> {
  const since = new Date(Date.now() - FINISHED_VISIBLE_MS);
  const rooms = await prisma.room.findMany({
    where: {
      visibility: 'PUBLIC',
      OR: [{ status: { in: ACTIVE } }, { status: 'FINISHED', finishedAt: { gte: since } }],
    },
    orderBy: { createdAt: 'desc' },
    take: 60,
    include: {
      host: { select: { username: true } },
      game: { select: { id: true } },
      players: { select: { userId: true } },
      _count: { select: { spectators: true } },
    },
  });
  const finishedGameIds = rooms.filter((r) => r.status === 'FINISHED' && r.game).map((r) => r.game!.id);
  const matches = finishedGameIds.length
    ? await prisma.match.findMany({ where: { gameId: { in: finishedGameIds } }, select: { id: true, gameId: true } })
    : [];
  const matchByGame = new Map(matches.map((m) => [m.gameId, m.id]));
  return rooms.map((r) => {
    const isPlayer = r.players.some((p) => p.userId === userId);
    const access = computeRoomAccess({
      status: r.status,
      playerCount: r.players.length,
      maxPlayers: r.maxPlayers,
      allowSpectators: r.allowSpectators,
      isPlayer,
      isSpectator: false,
    });
    return {
      code: r.code,
      host: r.host.username,
      gameMode: r.gameMode,
      playerCount: r.players.length,
      maxPlayers: r.maxPlayers,
      spectatorCount: r._count.spectators,
      status: r.status,
      action: access.action,
      gameId: r.game?.id ?? null,
      matchId: r.game ? (matchByGame.get(r.game.id) ?? null) : null,
    };
  });
}

export async function getRoomDetail(userId: string, code: string): Promise<RoomDetail> {
  const room = await prisma.room.findUnique({
    where: { code },
    include: {
      host: { select: { id: true, username: true } },
      game: { select: { id: true } },
      players: { orderBy: { joinedAt: 'asc' }, include: { user: { select: { username: true } } } },
      spectators: { select: { userId: true } },
    },
  });
  if (!room) throw new AppError('NOT_FOUND', 'Room tidak ditemukan.');
  const me = room.players.find((p) => p.userId === userId);
  const isSpectator = room.spectators.some((s) => s.userId === userId);
  const access = computeRoomAccess({
    status: room.status,
    playerCount: room.players.length,
    maxPlayers: room.maxPlayers,
    allowSpectators: room.allowSpectators,
    isPlayer: Boolean(me),
    isSpectator,
  });
  const match = room.game ? await prisma.match.findUnique({ where: { gameId: room.game.id }, select: { id: true } }) : null;
  return {
    code: room.code,
    status: room.status,
    visibility: room.visibility,
    gameMode: room.gameMode,
    minPlayers: room.minPlayers,
    maxPlayers: room.maxPlayers,
    allowSpectators: room.allowSpectators,
    hasStarted: room.hasStarted,
    roleConfig: room.roleConfig as RoomDetail['roleConfig'],
    settings: room.settings as Record<string, unknown>,
    host: room.host,
    players: room.players.map((p) => ({ userId: p.userId, username: p.user.username, ready: p.ready, isHost: p.userId === room.hostId })),
    spectatorCount: room.spectators.length,
    gameId: room.game?.id ?? null,
    matchId: match?.id ?? null,
    viewer: {
      role: room.hostId === userId ? 'host' : me ? 'player' : isSpectator ? 'spectator' : 'none',
      canJoin: access.canJoin,
      canSpectate: access.canSpectate,
      ready: me?.ready ?? false,
    },
  };
}
