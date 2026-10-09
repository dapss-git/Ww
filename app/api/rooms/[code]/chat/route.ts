import { NextRequest } from 'next/server';
import { ok } from '@/lib/api/response';
import { parseBody, route } from '@/lib/api/handler';
import { requireUser } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { roomCodeSchema } from '@/lib/rooms/schemas';
import { z } from 'zod';
import { randomString } from '@/lib/security/random';

const sendSchema = z.object({
  content: z.string().trim().min(1, 'Pesan tidak boleh kosong').max(200, 'Maks 200 karakter'),
});

interface RoomChatRow {
  id: string;
  roomCode: string;
  userId: string;
  username: string;
  content: string;
  createdAt: Date;
}

export const GET = route<{ code: string }>(async (_req, { params }) => {
  await requireUser();
  const code = roomCodeSchema.parse(params.code);
  try {
    const messages = await prisma.$queryRaw<RoomChatRow[]>`
      SELECT id, "roomCode", "userId", username, content, "createdAt"
      FROM "RoomChatMessage"
      WHERE "roomCode" = ${code}
      ORDER BY "createdAt" DESC
      LIMIT 40
    `;
    return ok({ messages: messages.reverse() });
  } catch {
    return ok({ messages: [] });
  }
});

export const POST = route<{ code: string }>(async (req: NextRequest, { params }) => {
  const user = await requireUser();
  const code = roomCodeSchema.parse(params.code);
  const body = await parseBody(req, sendSchema);
  const id = randomString(20, 'abcdefghijklmnopqrstuvwxyz0123456789');

  await prisma.$executeRaw`
    INSERT INTO "RoomChatMessage" (id, "roomCode", "userId", username, content, "createdAt")
    VALUES (${id}, ${code}, ${user.id}, ${user.username}, ${body.content}, NOW())
  `;

  return ok({ message: { id, roomCode: code, userId: user.id, username: user.username, content: body.content } }, { status: 201 });
});
