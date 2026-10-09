import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok } from '@/lib/api/response';
import { parseBody, route } from '@/lib/api/handler';
import { requireUser } from '@/lib/auth/guards';
import { ACTION_TYPES } from '@/lib/game/constants';
import { submitAction } from '@/lib/game/service';
import { enforceRateLimit } from '@/lib/security/rate-limit';

const schema = z.object({ type: z.enum(ACTION_TYPES), targetIds: z.array(z.string().min(1)).max(2) });

export const POST = route<{ id: string }>(async (req: NextRequest, { params }) => {
  const user = await requireUser();
  await enforceRateLimit(`action:${user.id}`, 40, 60);
  const input = await parseBody(req, schema);
  await submitAction(user.id, params.id, input);
  return ok({ accepted: true });
});
