import { prisma } from '@/lib/db/prisma';
import { ok } from '@/lib/api/response';
import { route } from '@/lib/api/handler';
import { requireOwner } from '@/lib/auth/guards';
import { createRoom } from '@/lib/rooms/service';
import { startGame } from '@/lib/game/service';
import { hashPassword } from '@/lib/auth/password';
import { randomString } from '@/lib/security/random';
import { createSession } from '@/lib/auth/session';

const ALPHANUM = 'abcdefghijklmnopqrstuvwxyz0123456789';

export const POST = route(async () => {
  const owner = await requireOwner();

  // Pastikan owner juga memiliki cookie session USER aktif agar bisa langsung join & bermain di UI
  await createSession(owner.id, 'USER', true);

  // 1. Buat room test khusus
  const created = await createRoom(owner.id, {
    minPlayers: 4,
    maxPlayers: 6,
    gameMode: 'CLASSIC',
    visibility: 'PRIVATE',
    allowSpectators: true,
  });

  const room = await prisma.room.findUniqueOrThrow({ where: { code: created.code } });

  // 2. Buat 3 akun dummy bot untuk melengkapi room
  const botNames = ['Bot_Alpha', 'Bot_Bravo', 'Bot_Charlie'];
  const botUsers = [];
  const dummyPass = await hashPassword('BotPassword123!');

  for (const name of botNames) {
    const uname = `${name.toLowerCase()}_${randomString(3, ALPHANUM).toLowerCase()}`;
    const bot = await prisma.user.create({
      data: {
        username: uname,
        passwordHash: dummyPass,
        bio: 'Bot testing otomatis',
      },
    });
    botUsers.push(bot);

    // Join room & set ready
    await prisma.roomPlayer.create({
      data: {
        roomId: room.id,
        userId: bot.id,
        ready: true,
      },
    });
  }

  // Set owner ready
  await prisma.roomPlayer.update({
    where: { roomId_userId: { roomId: room.id, userId: owner.id } },
    data: { ready: true },
  });

  // 3. Mulai game
  const game = await startGame(owner.id, room.id);

  return ok({
    success: true,
    message: 'Test mode aktif! Room & Bot berhasil dimulai. Kamu sekarang masuk sebagai host.',
    roomCode: room.code,
    gameId: game.gameId,
    botCount: botUsers.length,
  });
});
