import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { AppError, ok } from '@/lib/api/response';
import { parseBody, route } from '@/lib/api/handler';
import { dummyVerify, verifyPassword } from '@/lib/auth/password';
import { loginSchema } from '@/lib/auth/schemas';
import { createSession } from '@/lib/auth/session';
import { enforceRateLimit } from '@/lib/security/rate-limit';

const INVALID = 'Username atau password salah.';

export const POST = route(
  async (req: NextRequest) => {
    const input = await parseBody(req, loginSchema);
    await enforceRateLimit(`login:user:${input.username}`, 8, 900);
    const user = await prisma.user.findUnique({ where: { username: input.username } });
    if (!user || user.role !== 'USER') {
      await dummyVerify(input.password);
      throw new AppError('UNAUTHORIZED', INVALID);
    }
    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) throw new AppError('UNAUTHORIZED', INVALID);
    if (user.disabled) throw new AppError('FORBIDDEN', 'Akun ini dinonaktifkan.');
    await createSession(user.id, 'USER', input.remember, req.headers.get('user-agent'));
    return ok({ user: { id: user.id, username: user.username } });
  },
  { rateLimit: { name: 'login', limit: 25, windowSec: 900 } },
);
