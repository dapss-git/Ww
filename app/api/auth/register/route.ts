import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { AppError, ok } from '@/lib/api/response';
import { parseBody, route } from '@/lib/api/handler';
import { hashPassword } from '@/lib/auth/password';
import { RESERVED_USERNAMES, registerSchema } from '@/lib/auth/schemas';
import { createSession } from '@/lib/auth/session';

export const POST = route(
  async (req: NextRequest) => {
    const input = await parseBody(req, registerSchema);
    const ownerName = process.env.OWNER_USERNAME?.trim().toLowerCase();
    if (RESERVED_USERNAMES.includes(input.username) || input.username === ownerName) {
      throw new AppError('VALIDATION_ERROR', 'Username ini tidak tersedia.');
    }
    const passwordHash = await hashPassword(input.password);
    try {
      const user = await prisma.user.create({ data: { username: input.username, passwordHash }, select: { id: true, username: true } });
      await createSession(user.id, 'USER', false, req.headers.get('user-agent'));
      return ok({ user }, { status: 201 });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new AppError('CONFLICT', 'Username sudah dipakai.');
      }
      throw e;
    }
  },
  { rateLimit: { name: 'register', limit: 6, windowSec: 3600 } },
);
