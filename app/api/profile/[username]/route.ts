import { ok } from '@/lib/api/response';
import { route } from '@/lib/api/handler';
import { getCurrentUser } from '@/lib/auth/session';
import { getProfile } from '@/lib/profile/service';

export const GET = route<{ username: string }>(async (_req, { params }) => {
  const viewer = await getCurrentUser();
  return ok({ profile: await getProfile(decodeURIComponent(params.username).replace(/^@/, ''), viewer?.id ?? null) });
});
