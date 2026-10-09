import { ok } from '@/lib/api/response';
import { route } from '@/lib/api/handler';
import { requireUser } from '@/lib/auth/guards';
import { joinRoom } from '@/lib/rooms/service';
import { roomCodeSchema } from '@/lib/rooms/schemas';

export const POST = route<{ code: string }>(async (_req, { params }) => {
  const user = await requireUser();
  return ok(await joinRoom(user.id, roomCodeSchema.parse(params.code)));
});
