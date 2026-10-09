import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok } from '@/lib/api/response';
import { parseBody, parseQuery, route } from '@/lib/api/handler';
import { requireOwner } from '@/lib/auth/guards';
import { audit, searchUsers } from '@/lib/owner/service';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { usernameSchema, passwordSchema, RESERVED_USERNAMES } from '@/lib/auth/schemas';
import { AppError } from '@/lib/api/response';
import { Prisma } from '@prisma/client';

export const GET = route(async (req: NextRequest) => {
  await requireOwner();
  const { q } = parseQuery(req, z.object({ q: z.string().max(40).default('') }));
  return ok({ users: await searchUsers(q) });
});

export const POST = route(async (req: NextRequest) => {
  const owner = await requireOwner();
  const input = await parseBody(
    req,
    z.object({
      username: usernameSchema,
      password: passwordSchema,
      role: z.enum(['USER', 'OWNER']).default('USER'),
    }),
  );

  const ownerName = process.env.OWNER_USERNAME?.trim().toLowerCase();
  if (RESERVED_USERNAMES.includes(input.username) || input.username === ownerName) {
    throw new AppError('VALIDATION_ERROR', 'Username ini tidak tersedia.');
  }

  const passwordHash = await hashPassword(input.password);

  try {
    const created = await prisma.user.create({
      data: {
        username: input.username,
        passwordHash,
        role: input.role,
        bio: `Dibuat oleh Owner @${owner.username}`,
      },
      select: { id: true, username: true, role: true, createdAt: true },
    });

    await audit(owner.id, 'USER_CREATED', 'User', created.id, { username: created.username, role: created.role });
    return ok({ user: created }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new AppError('CONFLICT', 'Username sudah dipakai.');
    }
    throw e;
  }
});
