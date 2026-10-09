'use client';

import { Minus, Plus } from 'lucide-react';
import { ROLE_IDS, type RoleId } from '@/lib/game/constants';
import { ROLES } from '@/lib/roles/registry';
import { Badge } from '@/components/ui/badge';

interface Props {
  value: Partial<Record<RoleId, number>>;
  maxPlayers: number;
  onChange: (next: Partial<Record<RoleId, number>>) => void;
  disabled?: boolean;
}

export function RoleConfigEditor({ value, maxPlayers, onChange, disabled }: Props) {
  const total = ROLE_IDS.reduce((s, id) => s + (value[id] ?? 0), 0);
  const set = (id: RoleId, n: number) => {
    const next = { ...value, [id]: Math.max(0, Math.min(ROLES[id].maxPerGame, n)) };
    // Warga desa otomatis mengisi sisa slot agar total selalu sama dengan maksimum pemain.
    if (id !== 'VILLAGER') {
      const others = ROLE_IDS.filter((r) => r !== 'VILLAGER').reduce((s, r) => s + (next[r] ?? 0), 0);
      next.VILLAGER = Math.max(0, maxPlayers - others);
    }
    onChange(next);
  };
  const valid = total === maxPlayers;

  return (
    <div className="space-y-2">
      <p className={valid ? 'text-xs text-mute' : 'text-xs text-crimson-soft'}>
        Total role: {total} dari {maxPlayers} slot {valid ? '' : '(harus sama dengan maksimum pemain)'}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {ROLE_IDS.map((id) => {
          const role = ROLES[id];
          const n = value[id] ?? 0;
          return (
            <li key={id} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-night/50 p-2.5">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  {role.name}
                  {!role.core && <Badge>Opsional</Badge>}
                </p>
                <p className="line-clamp-1 text-xs text-mute">{role.team === 'WEREWOLF' ? 'Tim serigala' : role.team === 'SOLO' ? 'Tim solo' : 'Tim desa'}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button type="button" disabled={disabled || n <= 0 || id === 'VILLAGER'} onClick={() => set(id, n - 1)} className="rounded-md border border-white/10 p-1 text-mute hover:text-ink disabled:opacity-40" aria-label={`Kurangi ${role.name}`}>
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center text-sm tabular-nums">{n}</span>
                <button type="button" disabled={disabled || n >= role.maxPerGame || id === 'VILLAGER'} onClick={() => set(id, n + 1)} className="rounded-md border border-white/10 p-1 text-mute hover:text-ink disabled:opacity-40" aria-label={`Tambah ${role.name}`}>
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-mute">Warga Desa menyesuaikan otomatis. Jika pemain kurang dari maksimum, Warga Desa dikurangi lebih dulu.</p>
    </div>
  );
}
