import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth/auth-form';
import { Sky } from '@/components/layout/sky';
import { Navbar } from '@/components/layout/navbar';
import { getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Daftar' };

export default async function Page() {
  const user = await getCurrentUser();
  if (user) redirect('/lobby');
  return (
    <>
      <Sky />
      <Navbar username={null} />
      <main className="mx-auto grid min-h-[calc(100dvh-3.5rem)] max-w-6xl place-items-center px-4 py-10">
        <Suspense>
          <AuthForm mode="register" />
        </Suspense>
      </main>
    </>
  );
}
