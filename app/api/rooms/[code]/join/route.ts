import { NextRequest } from 'next/server';
import { ok } from '@/lib/api/response';
import { parseBody, route } from '@/lib/api/handler';
import { requireUser } from '@/lib/auth/guards';
import { joinRoom } from '@/lib/rooms/service';
import { roomCodeSchema, joinRoomSchema } from '@/lib/rooms/schemas';

export const POST = route<{ code: string }>(async (req: NextRequest, { params }) => {
  const user = await requireUser();
  const code = roomCodeSchema.parse(params.code);
  let key: string | undefined;
  try {
    const body = await parseBody(req, joinRoomSchema);
    key = body.key;
  } catch {
    // Body optional bila tanpa key
  }
  return ok(await joinRoom(user.id, code, key));
});
