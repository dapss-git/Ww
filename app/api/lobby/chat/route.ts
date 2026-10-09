import { NextRequest } from 'next/server';
import { ok } from '@/lib/api/response';
import { parseBody, route } from '@/lib/api/handler';
import { requireUser } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { randomString } from '@/lib/security/random';

const sendSchema = z.object({
  content: z.string().trim().min(1, 'Pesan tidak boleh kosong').max(200, 'Maks 200 karakter'),
});

interface LobbyRow {
  id: string;
  userId: string;
  username: string;
  content: string;
  createdAt: Date;
}

export const GET = route(async () => {
  await requireUser();
  try {
    const messages = await prisma.$queryRaw<LobbyRow[]>`
      SELECT id, "userId", username, content, "createdAt"
      FROM "LobbyMessage"
      ORDER BY "createdAt" DESC
      LIMIT 40
    `;
    return ok({ messages: messages.reverse() });
  } catch {
    return ok({ messages: [] });
  }
});

export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await parseBody(req, sendSchema);
  const id = randomString(20, 'abcdefghijklmnopqrstuvwxyz0123456789');

  await prisma.$executeRaw`
    INSERT INTO "LobbyMessage" (id, "userId", username, content, "createdAt")
    VALUES (${id}, ${user.id}, ${user.username}, ${body.content}, NOW())
  `;

  return ok({ message: { id, userId: user.id, username: user.username, content: body.content } }, { status: 201 });
});
