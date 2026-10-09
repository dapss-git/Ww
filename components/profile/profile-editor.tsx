'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api, ApiClientError } from '@/lib/client/api';

export function ProfileEditor(props: { bio: string; avatarUrl: string; bannerUrl: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bio, setBio] = useState(props.bio);
  const [avatarUrl, setAvatar] = useState(props.avatarUrl);
  const [bannerUrl, setBanner] = useState(props.bannerUrl);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) {
    return <div className="mt-4"><Button variant="secondary" size="sm" onClick={() => setOpen(true)}>Ubah profil</Button></div>;
  }

  async function save() {
    setLoading(true);
    setMsg(null);
    try {
      await api('/api/profile/me', { method: 'PATCH', json: { bio, avatarUrl, bannerUrl } });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof ApiClientError ? e.message : 'Gagal menyimpan.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel mt-4 space-y-3 p-4">
      <label className="block space-y-1 text-sm text-mute">Bio (maks 280 karakter)
        <textarea className="input min-h-20" maxLength={280} value={bio} onChange={(e) => setBio(e.target.value)} />
      </label>
      <label className="block space-y-1 text-sm text-mute">URL avatar (https)
        <input className="input" value={avatarUrl} onChange={(e) => setAvatar(e.target.value)} placeholder="https://..." />
      </label>
      <label className="block space-y-1 text-sm text-mute">URL banner (https)
        <input className="input" value={bannerUrl} onChange={(e) => setBanner(e.target.value)} placeholder="https://..." />
      </label>
      {msg && <p role="alert" className="text-sm text-crimson-soft">{msg}</p>}
      <div className="flex gap-2"><Button loading={loading} onClick={save}>Simpan</Button><Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button></div>
    </section>
  );
}
