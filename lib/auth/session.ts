import { cache } from 'react';
import { cookies } from 'next/headers';
import type { SessionKind } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { generateToken, hashToken } from '@/lib/security/tokens';
import { isProd } from '@/lib/env';

export const USER_COOKIE = 'ww_session';
export const OWNER_COOKIE = 'ww_owner';

const DAY = 86_400_000;
const TTL: Record<SessionKind, { normal: number; remember: number }> = {
  USER: { normal: DAY, remember: 30 * DAY },
  OWNER: { normal: 4 * 3600_000, remember: 8 * 3600_000 },
};
const ROTATE_AFTER_MS = DAY;

function cookieName(kind: SessionKind) {
  return kind === 'OWNER' ? OWNER_COOKIE : USER_COOKIE;
}

export async function createSession(userId: string, kind: SessionKind, remember: boolean, userAgent?: string | null) {
  const token = generateToken();
  const ttl = remember ? TTL[kind].remember : TTL[kind].normal;
  const expiresAt = new Date(Date.now() + ttl);
  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, kind, expiresAt, userAgent: userAgent?.slice(0, 200) ?? null },
  });
  const jar = await cookies();
  jar.set(cookieName(kind), token, {
    httpOnly: true,
    secure: isProd(),
    sameSite: kind === 'OWNER' ? 'strict' : 'lax',
    path: '/',
    expires: expiresAt,
  });
  return { expiresAt };
}

export async function revokeCurrentSession(kind: SessionKind) {
  const jar = await cookies();
  const token = jar.get(cookieName(kind))?.value;
  if (token) {
    await prisma.session.updateMany({ where: { tokenHash: hashToken(token), revokedAt: null }, data: { revokedAt: new Date() } });
  }
  jar.set(cookieName(kind), '', { httpOnly: true, secure: isProd(), sameSite: 'lax', path: '/', maxAge: 0 });
}

export async function revokeAllSessions(userId: string) {
  await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export interface SessionUser {
  id: string;
  username: string;
  role: 'USER' | 'OWNER';
  sessionId: string;
  sessionCreatedAt: Date;
  sessionExpiresAt: Date;
}

async function loadSession(kind: SessionKind): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(cookieName(kind))?.value;
  if (!token) return null;
  const now = new Date();
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, username: true, role: true, disabled: true, lastSeenAt: true } } },
  });
  if (!session || session.revokedAt || session.expiresAt <= now || session.kind !== kind) return null;
  const { user } = session;
  if (user.disabled) return null;
  if (kind === 'OWNER' && user.role !== 'OWNER') return null;
  if (kind === 'USER' && user.role !== 'USER' && user.role !== 'OWNER') return null;
  if (!user.lastSeenAt || now.getTime() - user.lastSeenAt.getTime() > 60_000) {
    void prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: now } }).catch(() => undefined);
  }
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    sessionId: session.id,
    sessionCreatedAt: session.createdAt,
    sessionExpiresAt: session.expiresAt,
  };
}

export const getCurrentUser = cache(() => loadSession('USER'));
export const getCurrentOwner = cache(() => loadSession('OWNER'));

/** Rotasi token sesi. Hanya boleh dipanggil dari Route Handler / Server Action (menulis cookie). */
export async function rotateSessionIfNeeded(kind: SessionKind): Promise<void> {
  const current = kind === 'OWNER' ? await getCurrentOwner() : await getCurrentUser();
  if (!current) return;
  if (Date.now() - current.sessionCreatedAt.getTime() < ROTATE_AFTER_MS) return;
  const remaining = current.sessionExpiresAt.getTime() - Date.now();
  const token = generateToken();
  const expiresAt = new Date(Date.now() + remaining);
  await prisma.$transaction([
    prisma.session.create({ data: { tokenHash: hashToken(token), userId: current.id, kind, expiresAt } }),
    prisma.session.update({ where: { id: current.sessionId }, data: { revokedAt: new Date() } }),
  ]);
  const jar = await cookies();
  jar.set(cookieName(kind), token, {
    httpOnly: true,
    secure: isProd(),
    sameSite: kind === 'OWNER' ? 'strict' : 'lax',
    path: '/',
    expires: expiresAt,
  });
}
