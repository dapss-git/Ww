import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok } from '@/lib/api/response';
import { parseBody, parseQuery, route } from '@/lib/api/handler';
import { requireUser } from '@/lib/auth/guards';
import { CHAT_CHANNELS } from '@/lib/game/constants';
import { sendChat } from '@/lib/game/service';
import { getChat } from '@/lib/game/view';
import { enforceRateLimit } from '@/lib/security/rate-limit';

const querySchema = z.object({ gameId: z.string().min(1), after: z.coerce.number().int().positive().optional() });
const bodySchema = z.object({ gameId: z.string().min(1), channel: z.enum(CHAT_CHANNELS), content: z.string().min(1, 'Pesan tidak boleh kosong').max(600) });

export const GET = route(async (req: NextRequest) => {
  const user = await requireUser();
  const { gameId, after } = parseQuery(req, querySchema);
  return ok({ messages: await getChat(user.id, gameId, after) });
});

export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  await enforceRateLimit(`chat:${user.id}`, 8, 10);
  const { gameId, channel, content } = await parseBody(req, bodySchema);
  return ok(await sendChat(user.id, gameId, channel, content), { status: 201 });
});
