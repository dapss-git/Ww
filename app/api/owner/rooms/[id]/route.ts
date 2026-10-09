import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok } from '@/lib/api/response';
import { parseBody, route } from '@/lib/api/handler';
import { requireOwner } from '@/lib/auth/guards';
import { deleteRoom, endRoom, viewRoom } from '@/lib/owner/service';

export const GET = route<{ id: string }>(async (_req, { params }) => {
  await requireOwner();
  return ok({ room: await viewRoom(params.id) });
});

export const POST = route<{ id: string }>(async (req: NextRequest, { params }) => {
  const owner = await requireOwner();
  await parseBody(req, z.object({ action: z.literal('end') }));
  await endRoom(owner.id, params.id);
  return ok({ ended: true });
});

export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const owner = await requireOwner();
  await deleteRoom(owner.id, params.id);
  return ok({ deleted: true });
});
