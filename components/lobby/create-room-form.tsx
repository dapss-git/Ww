'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api, ApiClientError } from '@/lib/client/api';
import { Globe, Lock, Shield, Moon, Check } from 'lucide-react';

export function CreateRoomForm() {
  const router = useRouter();
  const [minPlayers, setMin] = useState(5);
  const [maxPlayers, setMax] = useState(10);
  const [gameMode, setMode] = useState('CLASSIC');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [allowSpectators, setSpectators] = useState(true);
  const [roomKey, setRoomKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { code } = await api<{ code: string }>('/api/rooms', {
        method: 'POST',
        json: { minPlayers, maxPlayers, gameMode, visibility, allowSpectators, roomKey: visibility === 'PRIVATE' ? roomKey : undefined },
      });
      router.push(`/room/${code}`);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'ALREADY_JOINED' && typeof err.details?.roomCode === 'string') {
        router.push(`/room/${err.details.roomCode}`);
        return;
      }
      setError(err instanceof ApiClientError ? err.message : 'Gagal membuat room.');
    } finally {
      setLoading(false);
    }
  }

  const parseNum = (v: string, fallback: number) => {
    const n = parseInt(v, 10);
    return isNaN(n) ? fallback : n;
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Mode Game Cards */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-ink flex items-center gap-1.5">
          <Moon className="h-4 w-4 text-gold-soft" /> Pilihan Mode Game
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode('CLASSIC')}
            className={`relative flex flex-col p-3.5 rounded-xl border text-left transition-all ${
              gameMode === 'CLASSIC'
                ? 'border-gold bg-gradient-to-br from-gold/15 to-surface shadow-glow text-ink'
                : 'border-white/10 bg-night/50 hover:border-white/20 text-mute'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-display font-semibold text-gold-soft text-base flex items-center gap-1.5">
                Mode Klasik
              </span>
              {gameMode === 'CLASSIC' && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold text-night text-xs"><Check className="h-3 w-3 stroke-[3]" /></span>}
            </div>
            <p className="text-xs leading-relaxed text-mute">Serigala menang saat jumlah serigala seimbang dengan warga desa.</p>
          </button>

          <button
            type="button"
            onClick={() => setMode('MAJORITY')}
            className={`relative flex flex-col p-3.5 rounded-xl border text-left transition-all ${
              gameMode === 'MAJORITY'
                ? 'border-crimson bg-gradient-to-br from-crimson/15 to-surface shadow-crimson text-ink'
                : 'border-white/10 bg-night/50 hover:border-white/20 text-mute'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-display font-semibold text-crimson-soft text-base flex items-center gap-1.5">
                Mode Mayoritas
              </span>
              {gameMode === 'MAJORITY' && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-crimson text-white text-xs"><Check className="h-3 w-3 stroke-[3]" /></span>}
            </div>
            <p className="text-xs leading-relaxed text-mute">Serigala harus melampaui jumlah warga untuk menguasai desa sepenuhnya.</p>
          </button>
        </div>
      </div>

      {/* Visibilitas Cards */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-ink flex items-center gap-1.5">
          <Shield className="h-4 w-4 text-purple-soft" /> Visibilitas Room
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setVisibility('PUBLIC')}
            className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
              visibility === 'PUBLIC'
                ? 'border-emerald-500/60 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)] text-ink'
                : 'border-white/10 bg-night/50 hover:border-white/20 text-mute'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Globe className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-300">Publik</p>
                <p className="text-xs text-mute">Terdaftar di lobby publik</p>
              </div>
            </div>
            {visibility === 'PUBLIC' && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-night text-xs"><Check className="h-3 w-3 stroke-[3]" /></span>}
          </button>

          <button
            type="button"
            onClick={() => setVisibility('PRIVATE')}
            className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
              visibility === 'PRIVATE'
                ? 'border-purple/60 bg-purple/15 shadow-[0_0_20px_rgba(122,85,179,0.2)] text-ink'
                : 'border-white/10 bg-night/50 hover:border-white/20 text-mute'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-purple/20 text-purple-soft">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-soft">Privat</p>
                <p className="text-xs text-mute">Hanya via Room ID / Kode</p>
              </div>
            </div>
            {visibility === 'PRIVATE' && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple text-white text-xs"><Check className="h-3 w-3 stroke-[3]" /></span>}
          </button>
        </div>
      </div>

      {/* Kunci Room bila Privat */}
      {visibility === 'PRIVATE' && (
        <div className="space-y-1.5 rounded-xl border border-purple/30 bg-purple/10 p-3">
          <label htmlFor="roomKey" className="text-sm font-medium text-purple-soft flex items-center gap-1.5">
            <Lock className="h-4 w-4" /> Kunci / Password Masuk Room (Opsional)
          </label>
          <input
            id="roomKey"
            type="text"
            className="input"
            placeholder="Contoh: rahasia123 (kosongkan jika tanpa kunci)"
            value={roomKey}
            onChange={(e) => setRoomKey(e.target.value)}
            maxLength={30}
          />
          <p className="text-xs text-mute">Pemain lain di lobby harus memasukkan kunci ini agar bisa bergabung.</p>
        </div>
      )}

      {/* Pengaturan Pemain dengan Tombol Stepper (- / +) yang Nyaman di HP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5 rounded-xl border border-white/10 bg-night/40 p-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-ink">Minimum Pemain</label>
            <span className="text-xs text-mute">Min: 4</span>
          </div>
          <div className="flex items-center justify-between gap-3 mt-1">
            <button
              type="button"
              onClick={() => {
                if (minPlayers > 4) {
                  setMin(minPlayers - 1);
                }
              }}
              className="h-10 w-12 rounded-lg border border-white/15 bg-white/10 text-xl font-bold text-ink hover:bg-white/20 active:scale-95 transition-all select-none"
            >
              -
            </button>
            <span className="font-display text-2xl font-bold text-gold-soft tabular-nums">
              {minPlayers}
            </span>
            <button
              type="button"
              onClick={() => {
                if (minPlayers < 20) {
                  const next = minPlayers + 1;
                  setMin(next);
                  if (next > maxPlayers) setMax(next);
                }
              }}
              className="h-10 w-12 rounded-lg border border-white/15 bg-white/10 text-xl font-bold text-ink hover:bg-white/20 active:scale-95 transition-all select-none"
            >
              +
            </button>
          </div>
        </div>

        <div className="space-y-1.5 rounded-xl border border-white/10 bg-night/40 p-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-ink">Maksimum Pemain</label>
            <span className="text-xs text-mute">Maks: 20</span>
          </div>
          <div className="flex items-center justify-between gap-3 mt-1">
            <button
              type="button"
              onClick={() => {
                if (maxPlayers > minPlayers) {
                  setMax(maxPlayers - 1);
                }
              }}
              className="h-10 w-12 rounded-lg border border-white/15 bg-white/10 text-xl font-bold text-ink hover:bg-white/20 active:scale-95 transition-all select-none"
            >
              -
            </button>
            <span className="font-display text-2xl font-bold text-gold-soft tabular-nums">
              {maxPlayers}
            </span>
            <button
              type="button"
              onClick={() => {
                if (maxPlayers < 20) {
                  setMax(maxPlayers + 1);
                }
              }}
              className="h-10 w-12 rounded-lg border border-white/15 bg-white/10 text-xl font-bold text-ink hover:bg-white/20 active:scale-95 transition-all select-none"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-mute cursor-pointer select-none">
        <input type="checkbox" checked={allowSpectators} onChange={(e) => setSpectators(e.target.checked)} className="h-4 w-4 accent-[#C9A45C]" />
        Izinkan penonton (spectator) masuk saat game berlangsung
      </label>

      {error && <p role="alert" className="rounded-lg border border-crimson/50 bg-crimson/10 px-3 py-2 text-sm text-crimson-soft">{error}</p>}
      <Button type="submit" loading={loading} className="w-full">Buat Room Sekarang</Button>
    </form>
  );
}
