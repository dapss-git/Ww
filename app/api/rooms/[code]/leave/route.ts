import { ok } from '@/lib/api/response';
import { route } from '@/lib/api/handler';
import { requireUser } from '@/lib/auth/guards';
import { leaveRoom } from '@/lib/rooms/service';
import { roomCodeSchema } from '@/lib/rooms/schemas';

export const POST = route<{ code: string }>(async (_req, { params }) => {
  const user = await requireUser();
  await leaveRoom(user.id, roomCodeSchema.parse(params.code));
  return ok({ left: true });
});
