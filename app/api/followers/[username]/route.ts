import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok } from '@/lib/api/response';
import { parseQuery, route } from '@/lib/api/handler';
import { requireUser } from '@/lib/auth/guards';
import { follow, listFollows, unfollow } from '@/lib/profile/service';

export const GET = route<{ username: string }>(async (req: NextRequest, { params }) => {
  const { type } = parseQuery(req, z.object({ type: z.enum(['followers', 'following']).default('followers') }));
  return ok({ users: await listFollows(params.username, type) });
});

export const POST = route<{ username: string }>(async (_req, { params }) => {
  const user = await requireUser();
  await follow(user.id, params.username);
  return ok({ following: true });
});

export const DELETE = route<{ username: string }>(async (_req, { params }) => {
  const user = await requireUser();
  await unfollow(user.id, params.username);
  return ok({ following: false });
});
