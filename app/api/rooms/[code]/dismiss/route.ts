import { ok } from '@/lib/api/response';
import { route } from '@/lib/api/handler';
import { requireUser } from '@/lib/auth/guards';
import { roomCodeSchema } from '@/lib/rooms/schemas';
import { prisma } from '@/lib/db/prisma';
import { AppError } from '@/lib/api/response';
import { emitAll } from '@/lib/realtime';
import { LOBBY_CHANNEL, roomChannel } from '@/lib/realtime/channels';

export const POST = route<{ code: string }>(async (_req, { params }) => {
  const user = await requireUser();
  const code = roomCodeSchema.parse(params.code);

  const room = await prisma.room.findUnique({
    where: { code },
  });
  if (!room) throw new AppError('NOT_FOUND', 'Room tidak ditemukan.');
  if (room.hostId !== user.id && user.role !== 'OWNER') {
    throw new AppError('FORBIDDEN', 'Hanya Host yang bisa membubarkan room ini.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.roomPlayer.deleteMany({ where: { roomId: room.id } });
    await tx.roomSpectator.deleteMany({ where: { roomId: room.id } });
    await tx.room.update({
      where: { id: room.id },
      data: { status: 'CLOSED', finishedAt: new Date() },
    });
  });

  await emitAll([
    { channel: roomChannel(code), event: 'room:closed', payload: { roomCode: code } },
    { channel: LOBBY_CHANNEL, event: 'lobby:updated', payload: { at: Date.now() } },
  ]);

  return ok({ success: true, message: 'Room berhasil dibubarkan oleh Host.' });
});
