import { redirect } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Sky } from '@/components/layout/sky';
import { LobbyClient } from '@/components/lobby/lobby-client';
import { getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Lobby' };

export default async function LobbyPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/lobby');
  return (
    <>
      <Sky />
      <Navbar username={user.username} />
      <main className="mx-auto max-w-6xl px-4 py-8 pb-32">
        <LobbyClient username={user.username} />
      </main>
    </>
  );
}
