'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/client/api';

export function LogoutButton({ endpoint = '/api/auth/logout', redirectTo = '/' }: { endpoint?: string; redirectTo?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await api(endpoint, { method: 'POST' });
        } finally {
          router.push(redirectTo);
          router.refresh();
        }
      }}
    >
      <LogOut className="h-4 w-4" aria-hidden /> Keluar
    </Button>
  );
}
