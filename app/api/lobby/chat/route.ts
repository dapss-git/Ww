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

export const GET = route(async () => {
  await requireUser();
  const messages = await (prisma as any).lobbyMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 40,
  });
  return ok({ messages: messages.reverse() });
});

export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await parseBody(req, sendSchema);
  const created = await (prisma as any).lobbyMessage.create({
    data: {
      id: randomString(20, 'abcdefghijklmnopqrstuvwxyz0123456789'),
      userId: user.id,
      username: user.username,
      content: body.content,
    },
  });
  return ok({ message: created }, { status: 201 });
});
