import { ok } from '@/lib/api/response';
import { route } from '@/lib/api/handler';
import { requireOwner } from '@/lib/auth/guards';
import { deleteAllRooms } from '@/lib/owner/service';

export const POST = route(async () => {
  const owner = await requireOwner();
  return ok(await deleteAllRooms(owner.id));
});
