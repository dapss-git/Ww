import { NextRequest } from 'next/server';
import { ok } from '@/lib/api/response';
import { parseBody, route } from '@/lib/api/handler';
import { requireUser } from '@/lib/auth/guards';
import { kickPlayer } from '@/lib/rooms/service';
import { kickSchema, roomCodeSchema } from '@/lib/rooms/schemas';

export const POST = route<{ code: string }>(async (req: NextRequest, { params }) => {
  const user = await requireUser();
  const { userId } = await parseBody(req, kickSchema);
  await kickPlayer(user.id, roomCodeSchema.parse(params.code), userId);
  return ok({ kicked: true });
});
