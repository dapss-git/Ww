import { NextRequest } from 'next/server';
import { ok } from '@/lib/api/response';
import { parseBody, route } from '@/lib/api/handler';
import { requireUser } from '@/lib/auth/guards';
import { profileUpdateSchema, updateProfile } from '@/lib/profile/service';

export const PATCH = route(async (req: NextRequest) => {
  const user = await requireUser();
  await updateProfile(user.id, await parseBody(req, profileUpdateSchema));
  return ok({ updated: true });
});
