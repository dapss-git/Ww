import { ok } from '@/lib/api/response';
import { route } from '@/lib/api/handler';
import { requireOwner } from '@/lib/auth/guards';
import { revokeCurrentSession } from '@/lib/auth/session';
import { audit } from '@/lib/owner/service';

export const POST = route(async () => {
  const owner = await requireOwner();
  await audit(owner.id, 'OWNER_LOGOUT', 'User', owner.id);
  await revokeCurrentSession('OWNER');
  return ok({ loggedOut: true });
});
