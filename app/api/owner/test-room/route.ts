import { prisma } from '@/lib/db/prisma';
import { ok } from '@/lib/api/response';
import { route } from '@/lib/api/handler';
import { requireOwner } from '@/lib/auth/guards';
import { createRoom } from '@/lib/rooms/service';
import { hashPassword } from '@/lib/auth/password';
import { randomString } from '@/lib/security/random';
import { createSession } from '@/lib/auth/session';

const ALPHANUM = 'abcdefghijklmnopqrstuvwxyz0123456789';

export const POST = route(async () => {
  const owner = await requireOwner();

  // Pastikan owner memiliki cookie session USER aktif agar bisa langsung join & bermain di UI
  await createSession(owner.id, 'USER', true);

  // 1. Buat room test khusus (min 4 pemain, max 6 pemain)
  const created = await createRoom(owner.id, {
    minPlayers: 4,
    maxPlayers: 6,
    gameMode: 'CLASSIC',
    visibility: 'PRIVATE',
    allowSpectators: true,
  });

  const room = await prisma.room.findUniqueOrThrow({ where: { code: created.code } });

  // 2. Buat 3 akun dummy bot untuk melengkapi room dan set bot sudah siap (ready)
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

    // Bot bergabung ke room & langsung status READY
    await prisma.roomPlayer.create({
      data: {
        roomId: room.id,
        userId: bot.id,
        ready: true,
      },
    });
  }

  // Owner masuk sebagai HOST dan TIDAK otomatis mulai
  // Tombol "Mulai Game" ada di tangan Host (Owner) di dalam room!
  return ok({
    success: true,
    message: 'Room tes berhasil dibuat! 3 Bot sudah masuk dan status SIAP. Silakan klik "Masuk ke Room" lalu tekan tombol "Mulai Game" kapan saja.',
    roomCode: room.code,
    botCount: botUsers.length,
  });
});
