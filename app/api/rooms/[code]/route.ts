import { ok } from '@/lib/api/response';
import { route } from '@/lib/api/handler';
import { requireUser } from '@/lib/auth/guards';
import { getRoomDetail } from '@/lib/rooms/service';
import { roomCodeSchema } from '@/lib/rooms/schemas';

export const GET = route<{ code: string }>(async (_req, { params }) => {
  const user = await requireUser();
  return ok({ room: await getRoomDetail(user.id, roomCodeSchema.parse(params.code)) });
});
