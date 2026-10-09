import { ok } from '@/lib/api/response';
import { route } from '@/lib/api/handler';
import { revokeCurrentSession } from '@/lib/auth/session';

export const POST = route(async () => {
  await revokeCurrentSession('USER');
  return ok({ loggedOut: true });
});
