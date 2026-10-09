import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok } from '@/lib/api/response';
import { parseBody, route } from '@/lib/api/handler';
import { requireUser } from '@/lib/auth/guards';
import { submitVote } from '@/lib/game/service';
import { enforceRateLimit } from '@/lib/security/rate-limit';

const schema = z.object({ targetId: z.string().min(1) });

export const POST = route<{ id: string }>(async (req: NextRequest, { params }) => {
  const user = await requireUser();
  await enforceRateLimit(`vote:${user.id}`, 20, 60);
  const { targetId } = await parseBody(req, schema);
  await submitVote(user.id, params.id, targetId);
  return ok({ voted: true });
});
