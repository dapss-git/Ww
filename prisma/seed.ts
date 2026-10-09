import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = (process.env.OWNER_USERNAME ?? 'dafa').trim().toLowerCase();
  const password = process.env.OWNER_PASSWORD ?? 'owner';

  if (process.env.NODE_ENV === 'production' && (password === 'owner' || password.length < 12)) {
    throw new Error('Jangan gunakan credential development untuk production. Set OWNER_PASSWORD yang kuat (>= 12 karakter).');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { username },
    update: { passwordHash, role: 'OWNER', disabled: false },
    create: { username, passwordHash, role: 'OWNER', bio: 'Owner' },
  });
  console.log(`Owner "${username}" siap. (password di-hash dengan bcrypt)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
