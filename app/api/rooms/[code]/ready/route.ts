import { NextRequest } from 'next/server';
import { ok } from '@/lib/api/response';
import { parseBody, route } from '@/lib/api/handler';
import { requireUser } from '@/lib/auth/guards';
import { setReady } from '@/lib/rooms/service';
import { readySchema, roomCodeSchema } from '@/lib/rooms/schemas';

export const POST = route<{ code: string }>(async (req: NextRequest, { params }) => {
  const user = await requireUser();
  const { ready } = await parseBody(req, readySchema);
  await setReady(user.id, roomCodeSchema.parse(params.code), ready);
  return ok({ ready });
});
