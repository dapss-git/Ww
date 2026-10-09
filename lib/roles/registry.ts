import type { RoleId } from '@/lib/game/constants';
import { ROLE_IDS } from '@/lib/game/constants';
import { GUARDIAN, SEER, VILLAGER, WEREWOLF, WITCH } from './core';
import { ARSONIST, CUPID, DOCTOR, HUNTER, MEDIUM, SERIAL_KILLER, TRACKER } from './extra';
import type { AbilityDef, RoleDef } from './types';

/**
 * Registry role. Role baru dengan kombinasi ability yang sudah ada
 * cukup ditambahkan di sini (dan di constants/enum Prisma), tanpa mengubah GameResolutionEngine.
 */
export const ROLES: Record<RoleId, RoleDef> = {
  WEREWOLF,
  VILLAGER,
  GUARDIAN,
  WITCH,
  SEER,
  HUNTER,
  CUPID,
  DOCTOR,
  SERIAL_KILLER,
  ARSONIST,
  TRACKER,
  MEDIUM,
};

export function getRole(id: RoleId): RoleDef {
  return ROLES[id];
}

export function isRoleId(value: string): value is RoleId {
  return (ROLE_IDS as readonly string[]).includes(value);
}

export function listRoles(): RoleDef[] {
  return ROLE_IDS.map((id) => ROLES[id]);
}

export function findAbility(role: RoleId, type: string, stage: AbilityDef['stage']): AbilityDef | undefined {
  return ROLES[role].abilities.find((a) => a.type === type && a.stage === stage);
}

/** Urutan prioritas mempertahankan role saat jumlah pemain kurang dari komposisi. */
export const KEEP_ORDER: RoleId[] = [
  'WEREWOLF',
  'SEER',
  'GUARDIAN',
  'WITCH',
  'DOCTOR',
  'HUNTER',
  'TRACKER',
  'MEDIUM',
  'CUPID',
  'SERIAL_KILLER',
  'ARSONIST',
  'VILLAGER',
];
