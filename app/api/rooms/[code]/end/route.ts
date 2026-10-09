import { ok } from '@/lib/api/response';
import { route } from '@/lib/api/handler';
import { requireUser } from '@/lib/auth/guards';
import { roomCodeSchema } from '@/lib/rooms/schemas';
import { prisma } from '@/lib/db/prisma';
import { AppError } from '@/lib/api/response';
import { emitAll } from '@/lib/realtime';
import { gameChannel, LOBBY_CHANNEL, roomChannel } from '@/lib/realtime/channels';

export const POST = route<{ code: string }>(async (_req, { params }) => {
  const user = await requireUser();
  const code = roomCodeSchema.parse(params.code);

  const room = await prisma.room.findUnique({
    where: { code },
    include: { game: true },
  });
  if (!room) throw new AppError('NOT_FOUND', 'Room tidak ditemukan.');
  if (room.hostId !== user.id && user.role !== 'OWNER') {
    throw new AppError('FORBIDDEN', 'Hanya Host pembuat room yang dapat mengakhiri permainan.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.room.update({
      where: { id: room.id },
      data: { status: 'FINISHED', finishedAt: new Date() },
    });
    if (room.game && room.game.phase !== 'FINISHED') {
      await tx.game.update({
        where: { id: room.game.id },
        data: { phase: 'FINISHED', endedAt: new Date(), phaseEndsAt: new Date() },
      });
    }
  });

  await emitAll([
    { channel: roomChannel(room.code), event: 'room:closed', payload: { roomCode: room.code } },
    ...(room.game ? [{ channel: gameChannel(room.game.id), event: 'game:finished' as const, payload: { gameId: room.game.id } }] : []),
    { channel: LOBBY_CHANNEL, event: 'lobby:updated', payload: { at: Date.now() } },
  ]);

  return ok({ success: true, message: 'Game berhasil diakhiri oleh Host.' });
});
