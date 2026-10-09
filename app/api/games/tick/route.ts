import { NextRequest } from 'next/server';
import { AppError, ok } from '@/lib/api/response';
import { route } from '@/lib/api/handler';
import { advanceAllDueGames } from '@/lib/game/service';
import { env } from '@/lib/env';

/** Dipanggil oleh cron (Authorization: Bearer CRON_SECRET) untuk memajukan fase yang jatuh tempo. */
async function handle(req: NextRequest) {
  const secret = env().CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    throw new AppError('UNAUTHORIZED', 'Tidak diizinkan.');
  }
  return ok({ advanced: await advanceAllDueGames() });
}

export const GET = route(handle);
export const POST = route(handle);
