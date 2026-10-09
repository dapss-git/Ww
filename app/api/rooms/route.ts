import { NextRequest } from 'next/server';
import { ok } from '@/lib/api/response';
import { parseBody, route } from '@/lib/api/handler';
import { requireUser } from '@/lib/auth/guards';
import { createRoom, listPublicRooms } from '@/lib/rooms/service';
import { createRoomSchema } from '@/lib/rooms/schemas';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const GET = route(async () => {
  const user = await requireUser();
  return ok({ rooms: await listPublicRooms(user.id) });
});

export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  await enforceRateLimit(`room:create:${user.id}`, 10, 600);
  const input = await parseBody(req, createRoomSchema);
  return ok(await createRoom(user.id, input), { status: 201 });
});
