import { AppError } from '@/lib/api/response';
import { getCurrentOwner, getCurrentUser, type SessionUser } from './session';

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError('UNAUTHORIZED', 'Silakan login terlebih dahulu.');
  return user;
}

/** Owner: autentikasi terpisah, wajib role OWNER. User biasa -> 403. */
export async function requireOwner(): Promise<SessionUser> {
  const owner = await getCurrentOwner();
  if (owner && owner.role === 'OWNER') return owner;
  const user = await getCurrentUser();
  if (user) throw new AppError('FORBIDDEN', 'You do not have permission to perform this action.');
  throw new AppError('UNAUTHORIZED', 'Silakan login sebagai owner.');
}
