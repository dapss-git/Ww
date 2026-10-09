import bcrypt from 'bcryptjs';

const COST = 12;
let dummyHash: string | null = null;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Dipakai saat user tidak ditemukan agar waktu respons login tidak membocorkan keberadaan akun. */
export async function dummyVerify(password: string): Promise<void> {
  dummyHash ??= await bcrypt.hash('dummy-password-for-timing', COST);
  await bcrypt.compare(password, dummyHash);
}
