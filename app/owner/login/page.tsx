import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth/auth-form';
import { Sky } from '@/components/layout/sky';
import { getCurrentOwner } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Owner', robots: { index: false, follow: false } };

export default async function OwnerLoginPage() {
  if (await getCurrentOwner()) redirect('/owner/dashboard');
  return (
    <>
      <Sky moon={false} />
      <main className="grid min-h-dvh place-items-center px-4 py-10">
        <Suspense>
          <AuthForm mode="owner" />
        </Suspense>
      </main>
    </>
  );
}
