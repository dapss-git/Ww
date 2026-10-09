import { createHmac, randomBytes } from 'crypto';
import { env } from '@/lib/env';

export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Hash token sesi dengan HMAC(AUTH_SECRET); database hanya menyimpan hash. */
export function hashToken(token: string): string {
  return createHmac('sha256', env().AUTH_SECRET).update(token).digest('hex');
}
