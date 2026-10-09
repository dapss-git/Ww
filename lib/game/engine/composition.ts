import { ROLE_IDS, type RoleId } from '../constants';
import { KEEP_ORDER, ROLES, isRoleId } from '@/lib/roles/registry';

export type RoleConfig = Partial<Record<RoleId, number>>;

export function defaultRoleConfig(max: number): RoleConfig {
  const config: RoleConfig = { WEREWOLF: Math.max(1, Math.floor(max / 4)) };
  if (max >= 5) config.SEER = 1;
  if (max >= 6) config.GUARDIAN = 1;
  if (max >= 7) config.WITCH = 1;
  if (max >= 9) config.HUNTER = 1;
  const used = Object.values(config).reduce((a, b) => a + (b ?? 0), 0);
  config.VILLAGER = Math.max(0, max - used);
  return config;
}

export function totalRoles(config: RoleConfig): number {
  return Object.values(config).reduce<number>((sum, n) => sum + (n ?? 0), 0);
}

/** Validasi komposisi role: total = maxPlayers, minimal 1 serigala, batas per role. */
export function validateRoleConfig(config: Record<string, unknown>, maxPlayers: number): string | null {
  let total = 0;
  for (const [key, value] of Object.entries(config)) {
    if (!isRoleId(key)) return `Role tidak dikenal: ${key}`;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return `Jumlah role ${key} tidak valid`;
    if (value > ROLES[key].maxPerGame) return `Maksimal ${ROLES[key].maxPerGame} untuk role ${ROLES[key].name}`;
    total += value;
  }
  if (total !== maxPlayers) return `Total role (${total}) harus sama dengan maksimal pemain (${maxPlayers})`;
  if (((config.WEREWOLF as number | undefined) ?? 0) < 1) return 'Minimal harus ada 1 Serigala';
  if (((config.WEREWOLF as number) ?? 0) * 2 >= maxPlayers) return 'Jumlah serigala terlalu banyak untuk jumlah pemain';
  return null;
}

export function expandRoles(config: RoleConfig): RoleId[] {
  const list: RoleId[] = [];
  for (const id of ROLE_IDS) for (let i = 0; i < (config[id] ?? 0); i++) list.push(id);
  return list;
}

/**
 * Menyesuaikan komposisi (yang dibuat untuk maxPlayers) dengan jumlah pemain sebenarnya.
 * Warga desa dikurangi dulu, lalu role tambahan dari yang paling tidak prioritas.
 */
export function fitRolesToPlayerCount(config: RoleConfig, n: number): RoleId[] | null {
  const list = expandRoles(config);
  while (list.length < n) list.push('VILLAGER');
  while (list.length > n) {
    const removeOrder = [...KEEP_ORDER].reverse();
    let removed = false;
    for (const id of removeOrder) {
      const idx = list.lastIndexOf(id);
      if (idx === -1) continue;
      if (id === 'WEREWOLF' && list.filter((r) => r === 'WEREWOLF').length <= 1) continue;
      list.splice(idx, 1);
      removed = true;
      break;
    }
    if (!removed) return null;
  }
  const wolves = list.filter((r) => r === 'WEREWOLF').length;
  if (wolves < 1 || wolves * 2 >= n) return null;
  return list;
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function assignRoles(playerIds: string[], roles: RoleId[], rng: () => number): { playerId: string; role: RoleId; seat: number }[] {
  const shuffledRoles = shuffle(roles, rng);
  const seats = shuffle(playerIds, rng);
  return seats.map((playerId, seat) => ({ playerId, role: shuffledRoles[seat], seat: seat + 1 }));
}
