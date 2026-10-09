import { redirect } from 'next/navigation';
import { GameClient } from '@/components/game/game-client';
import { Sky } from '@/components/layout/sky';
import { getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Game' };

export default async function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/game/${gameId}`);
  return (
    <>
      <Sky />
      <GameClient gameId={gameId} userId={user.id} />
    </>
  );
}
