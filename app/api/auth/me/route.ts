import { ok } from '@/lib/api/response';
import { route } from '@/lib/api/handler';
import { requireUser } from '@/lib/auth/guards';
import { rotateSessionIfNeeded } from '@/lib/auth/session';

export const GET = route(async () => {
  const user = await requireUser();
  await rotateSessionIfNeeded('USER');
  return ok({ user: { id: user.id, username: user.username } });
});
