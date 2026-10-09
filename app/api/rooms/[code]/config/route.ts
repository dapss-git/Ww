import { NextRequest } from 'next/server';
import { ok } from '@/lib/api/response';
import { parseBody, route } from '@/lib/api/handler';
import { requireUser } from '@/lib/auth/guards';
import { updateRoomConfig } from '@/lib/rooms/service';
import { roomCodeSchema, updateRoomSchema } from '@/lib/rooms/schemas';

export const PATCH = route<{ code: string }>(async (req: NextRequest, { params }) => {
  const user = await requireUser();
  const input = await parseBody(req, updateRoomSchema);
  await updateRoomConfig(user.id, roomCodeSchema.parse(params.code), input);
  return ok({ updated: true });
});
