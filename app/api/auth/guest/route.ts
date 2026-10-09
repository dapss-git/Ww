import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { ok } from '@/lib/api/response';
import { parseBody, route } from '@/lib/api/handler';
import { hashPassword } from '@/lib/auth/password';
import { RESERVED_USERNAMES } from '@/lib/auth/schemas';
import { createSession } from '@/lib/auth/session';
import { z } from 'zod';
import { randomString } from '@/lib/security/random';

const ALPHANUM = 'abcdefghijklmnopqrstuvwxyz0123456789';

const guestSchema = z.object({
  nickname: z
    .string({ required_error: 'Nama panggilan wajib diisi' })
    .trim()
    .min(2, 'Nama minimal 2 karakter')
    .max(20, 'Nama maksimal 20 karakter')
    .regex(/^[a-zA-Z0-9_ ]+$/, 'Nama hanya boleh huruf, angka, spasi, dan underscore'),
});

export const POST = route(
  async (req: NextRequest) => {
    const input = await parseBody(req, guestSchema);
    const baseSlug = input.nickname.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 14) || 'tamu';
    const randomSuffix = randomString(4, ALPHANUM).toLowerCase();
    let guestUsername = `${baseSlug}_${randomSuffix}`;
    
    if (RESERVED_USERNAMES.includes(guestUsername)) {
      guestUsername = `tamu_${randomString(6, ALPHANUM).toLowerCase()}`;
    }

    const randomSecret = randomString(32, ALPHANUM);
    const passwordHash = await hashPassword(randomSecret);

    try {
      const user = await prisma.user.create({
        data: {
          username: guestUsername,
          passwordHash,
          bio: `Tamu: ${input.nickname}`,
        },
        select: { id: true, username: true },
      });

      await createSession(user.id, 'USER', false, req.headers.get('user-agent'));
      return ok({ user, isGuest: true, nickname: input.nickname }, { status: 201 });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const fallbackUsername = `tamu_${randomString(8, ALPHANUM).toLowerCase()}`;
        const user = await prisma.user.create({
          data: {
            username: fallbackUsername,
            passwordHash,
            bio: `Tamu: ${input.nickname}`,
          },
          select: { id: true, username: true },
        });
        await createSession(user.id, 'USER', false, req.headers.get('user-agent'));
        return ok({ user, isGuest: true, nickname: input.nickname }, { status: 201 });
      }
      throw e;
    }
  },
  { rateLimit: { name: 'guest-login', limit: 20, windowSec: 3600 } },
);
