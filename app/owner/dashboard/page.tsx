import { redirect } from 'next/navigation';
import { OwnerDashboard } from '@/components/owner/owner-dashboard';
import { Sky } from '@/components/layout/sky';
import { getCurrentOwner, getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard', robots: { index: false, follow: false } };

export default async function OwnerDashboardPage() {
  const owner = await getCurrentOwner();
  if (!owner) {
    // User biasa: 403 (ditangani middleware); tanpa sesi apa pun: ke halaman login owner.
    const user = await getCurrentUser();
    if (user) {
      return (
        <div className="grid min-h-dvh place-items-center px-4 text-center">
          <div><h1 className="font-display text-3xl text-crimson-soft">403 FORBIDDEN</h1><p className="mt-2 text-sm text-mute">You do not have permission to perform this action.</p></div>
        </div>
      );
    }
    redirect('/owner/login');
  }
  return (
    <>
      <Sky moon={false} />
      <OwnerDashboard ownerName={owner.username} />
    </>
  );
}
