import { prisma } from '@/lib/db/prisma';
import { AppError } from '@/lib/api/response';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/** Rate limit berbasis PostgreSQL (atomik) sehingga bekerja di serverless / multi-instance. */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, now() + (${windowSec}::int * interval '1 second'))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" <= now() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= now() THEN now() + (${windowSec}::int * interval '1 second') ELSE "RateLimit"."resetAt" END
    RETURNING "count", "resetAt"`;
  const row = rows[0];
  const count = Number(row.count);
  if (Math.random() < 0.01) {
    void prisma.rateLimit.deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 3600_000) } } }).catch(() => undefined);
  }
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSec: Math.max(1, Math.ceil((new Date(row.resetAt).getTime() - Date.now()) / 1000)),
  };
}

export async function enforceRateLimit(key: string, limit: number, windowSec: number): Promise<void> {
  const result = await rateLimit(key, limit, windowSec);
  if (!result.allowed) {
    throw new AppError('RATE_LIMITED', `Terlalu banyak permintaan. Coba lagi dalam ${result.retryAfterSec} detik.`, {
      retryAfterSec: result.retryAfterSec,
    });
  }
}
