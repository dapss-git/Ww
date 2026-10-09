import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok } from '@/lib/api/response';
import { parseBody, route } from '@/lib/api/handler';
import { requireOwner } from '@/lib/auth/guards';
import { deleteUser, setUserDisabled } from '@/lib/owner/service';

export const POST = route<{ id: string }>(async (req: NextRequest, { params }) => {
  const owner = await requireOwner();
  const { disabled } = await parseBody(req, z.object({ disabled: z.boolean() }));
  await setUserDisabled(owner.id, params.id, disabled);
  return ok({ disabled });
});

export const DELETE = route<{ id: string }>(async (_req: NextRequest, { params }) => {
  const owner = await requireOwner();
  await deleteUser(owner.id, params.id);
  return ok({ deleted: true });
});
