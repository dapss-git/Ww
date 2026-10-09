import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok } from '@/lib/api/response';
import { parseQuery, route } from '@/lib/api/handler';
import { requireOwner } from '@/lib/auth/guards';
import { searchUsers } from '@/lib/owner/service';

export const GET = route(async (req: NextRequest) => {
  await requireOwner();
  const { q } = parseQuery(req, z.object({ q: z.string().max(40).default('') }));
  return ok({ users: await searchUsers(q) });
});
