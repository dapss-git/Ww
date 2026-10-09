import { ok } from '@/lib/api/response';
import { route } from '@/lib/api/handler';
import { requireOwner } from '@/lib/auth/guards';
import { dashboardStats, listAudit } from '@/lib/owner/service';

export const GET = route(async () => {
  await requireOwner();
  const [stats, audit] = await Promise.all([dashboardStats(), listAudit()]);
  return ok({ ...stats, audit });
});
