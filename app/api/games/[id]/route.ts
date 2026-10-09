import { ok } from '@/lib/api/response';
import { route } from '@/lib/api/handler';
import { requireUser } from '@/lib/auth/guards';
import { getGameView } from '@/lib/game/view';

export const GET = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireUser();
  return ok({ view: await getGameView(user.id, params.id) });
});
