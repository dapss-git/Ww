import { redirect } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Sky } from '@/components/layout/sky';
import { RoomClient } from '@/components/room/room-client';
import { getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Room' };

export default async function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const code = decodeURIComponent(roomId).toUpperCase();
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/room/${code}`);
  return (
    <>
      <Sky />
      <Navbar username={user.username} />
      <main className="mx-auto max-w-5xl px-4 py-8 pb-32">
        <RoomClient code={code} userId={user.id} />
      </main>
    </>
  );
}
