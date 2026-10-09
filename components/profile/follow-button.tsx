'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { UserCheck, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/client/api';

export function FollowButton({ username, initialFollowing }: { username: string; initialFollowing: boolean }) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant={following ? 'secondary' : 'primary'}
      loading={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await api(`/api/followers/${username}`, { method: following ? 'DELETE' : 'POST' });
          setFollowing(!following);
          router.refresh();
        } finally {
          setLoading(false);
        }
      }}
    >
      {following ? <UserCheck className="h-4 w-4" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />}
      {following ? 'Mengikuti' : 'Ikuti'}
    </Button>
  );
}
