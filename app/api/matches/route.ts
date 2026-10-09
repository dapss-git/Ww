import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok } from '@/lib/api/response';
import { parseQuery, route } from '@/lib/api/handler';
import { getMatch, recentMatches } from '@/lib/profile/service';

const schema = z.object({ id: z.string().optional(), limit: z.coerce.number().int().min(1).max(30).default(10) });

export const GET = route(async (req: NextRequest) => {
  const { id, limit } = parseQuery(req, schema);
  if (id) return ok({ match: await getMatch(id) });
  return ok({ matches: await recentMatches(limit) });
});
