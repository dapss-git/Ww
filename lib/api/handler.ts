import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import { AppError, fail } from './response';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export function getIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

/** Perlindungan CSRF: cookie SameSite + verifikasi Origin untuk request yang mengubah data. */
function assertSameOrigin(req: NextRequest) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (origin) {
    let originHost = '';
    try {
      originHost = new URL(origin).host;
    } catch {
      throw new AppError('FORBIDDEN', 'Origin tidak valid.');
    }
    if (originHost !== host) throw new AppError('FORBIDDEN', 'Permintaan lintas-origin ditolak.');
    return;
  }
  if (req.headers.get('sec-fetch-site') === 'cross-site') {
    throw new AppError('FORBIDDEN', 'Permintaan lintas-origin ditolak.');
  }
}

export async function parseBody<S extends ZodTypeAny>(req: NextRequest, schema: S): Promise<z.infer<S>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON tidak valid.');
  }
  return schema.parse(json);
}

export function parseQuery<S extends ZodTypeAny>(req: NextRequest, schema: S): z.infer<S> {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
}

export interface RouteOptions {
  /** Rate limit per IP untuk route ini. */
  rateLimit?: { name: string; limit: number; windowSec: number };
}

type Params = Record<string, string>;
type Handler<P extends Params> = (req: NextRequest, ctx: { params: P }) => Promise<NextResponse>;

export function route<P extends Params = Params>(handler: Handler<P>, options: RouteOptions = {}) {
  return async (req: NextRequest, ctx: { params: Promise<P> }): Promise<NextResponse> => {
    try {
      assertSameOrigin(req);
      if (options.rateLimit) {
        const { name, limit, windowSec } = options.rateLimit;
        await enforceRateLimit(`ip:${name}:${getIp(req)}`, limit, windowSec);
      }
      const params = ctx?.params ? await ctx.params : ({} as P);
      return await handler(req, { params });
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    const headers: Record<string, string> = {};
    if (error.code === 'RATE_LIMITED' && typeof error.details?.retryAfterSec === 'number') {
      headers['Retry-After'] = String(error.details.retryAfterSec);
    }
    return fail(error.code, error.message, error.details, headers);
  }
  if (error instanceof ZodError) {
    return fail('VALIDATION_ERROR', error.issues[0]?.message ?? 'Data tidak valid.', {
      issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return fail('CONFLICT', 'Data sudah ada.');
    if (error.code === 'P2025') return fail('NOT_FOUND', 'Data tidak ditemukan.');
  }
  // Jangan bocorkan stack trace / detail internal ke client.
  console.error('[api] unhandled error:', error instanceof Error ? error.message : error);
  return fail('INTERNAL_ERROR', 'Terjadi kesalahan pada server.');
}
