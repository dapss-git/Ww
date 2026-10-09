import { describe, expect, it } from 'vitest';
import { assignRoles, defaultRoleConfig, fitRolesToPlayerCount, totalRoles, validateRoleConfig } from '@/lib/game/engine/composition';

describe('komposisi role', () => {
  it('default config selalu berjumlah maxPlayers dan valid', () => {
    for (let n = 4; n <= 20; n++) {
      const cfg = defaultRoleConfig(n);
      expect(totalRoles(cfg)).toBe(n);
      expect(validateRoleConfig(cfg as Record<string, unknown>, n)).toBeNull();
    }
  });
  it('menolak total salah, tanpa serigala, role tak dikenal', () => {
    expect(validateRoleConfig({ WEREWOLF: 1, VILLAGER: 2 }, 5)).toMatch(/Total role/);
    expect(validateRoleConfig({ VILLAGER: 5 }, 5)).toMatch(/Serigala/);
    expect(validateRoleConfig({ WEREWOLF: 1, VILLAGER: 3, NINJA: 1 }, 5)).toMatch(/tidak dikenal/);
    expect(validateRoleConfig({ WEREWOLF: 1, SEER: 2, VILLAGER: 2 }, 5)).toMatch(/Maksimal/);
  });
  it('mengurangi warga desa dulu saat pemain kurang dari maksimum', () => {
    const roles = fitRolesToPlayerCount(defaultRoleConfig(12), 8)!;
    expect(roles).toHaveLength(8);
    expect(roles.filter((r) => r === 'WEREWOLF').length).toBeGreaterThanOrEqual(1);
  });
  it('role tambahan tidak pernah ter-assign jika tidak diaktifkan', () => {
    const roles = fitRolesToPlayerCount(defaultRoleConfig(10), 10)!;
    expect(roles).not.toContain('CUPID');
    expect(roles).not.toContain('SERIAL_KILLER');
  });
  it('assignRoles memberi tiap pemain satu role dan seat unik', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const roles = fitRolesToPlayerCount(defaultRoleConfig(5), 5)!;
    const result = assignRoles(ids, roles, () => 0.42);
    expect(new Set(result.map((r) => r.playerId)).size).toBe(5);
    expect(new Set(result.map((r) => r.seat)).size).toBe(5);
    expect([...result.map((r) => r.role)].sort()).toEqual([...roles].sort());
  });
});
