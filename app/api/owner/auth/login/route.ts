import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { AppError, ok } from '@/lib/api/response';
import { parseBody, route } from '@/lib/api/handler';
import { dummyVerify, verifyPassword } from '@/lib/auth/password';
import { loginSchema } from '@/lib/auth/schemas';
import { createSession } from '@/lib/auth/session';
import { audit } from '@/lib/owner/service';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const POST = route(
  async (req: NextRequest) => {
    const input = await parseBody(req, loginSchema);
    await enforceRateLimit(`owner:login:${input.username}`, 5, 900);
    const user = await prisma.user.findUnique({ where: { username: input.username } });
    if (!user || user.role !== 'OWNER' || user.disabled) {
      await dummyVerify(input.password);
      throw new AppError('UNAUTHORIZED', 'Kredensial owner salah.');
    }
    if (!(await verifyPassword(input.password, user.passwordHash))) throw new AppError('UNAUTHORIZED', 'Kredensial owner salah.');
    
    // Buat sesi OWNER untuk dashboard & buat sesi USER agar owner bisa bermain & masuk room
    await createSession(user.id, 'OWNER', input.remember, req.headers.get('user-agent'));
    await createSession(user.id, 'USER', input.remember, req.headers.get('user-agent'));
    
    await audit(user.id, 'OWNER_LOGIN', 'User', user.id);
    return ok({ owner: { username: user.username } });
  },
  { rateLimit: { name: 'owner-login', limit: 15, windowSec: 900 } },
);
