import { ok } from '@/lib/api/response';
import { route } from '@/lib/api/handler';
import { requireUser } from '@/lib/auth/guards';
import { roomCodeSchema } from '@/lib/rooms/schemas';
import { startGame } from '@/lib/game/service';

export const POST = route<{ code: string }>(async (_req, { params }) => {
  const user = await requireUser();
  return ok(await startGame(user.id, roomCodeSchema.parse(params.code)));
});
