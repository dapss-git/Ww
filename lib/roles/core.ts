import type { RoleDef } from './types';

export const WEREWOLF: RoleDef = {
  id: 'WEREWOLF',
  name: 'Serigala',
  team: 'WEREWOLF',
  description: 'Setiap malam, bersama sesama serigala, pilih satu warga untuk diterkam. Samarkan dirimu di siang hari.',
  priority: 30,
  visibility: 'TEAM',
  nightImmune: false,
  canVote: true,
  maxPerGame: 20,
  core: true,
  abilities: [
    {
      type: 'ATTACK',
      stage: 'NIGHT',
      label: 'Terkam',
      targetRules: { count: 1, allowSelf: false, excludeTeams: ['WEREWOLF'] },
      blockedByProtection: true,
      blockedByImmunity: true,
      tally: 'WEREWOLF_PACK',
    },
  ],
};

export const VILLAGER: RoleDef = {
  id: 'VILLAGER',
  name: 'Warga Desa',
  team: 'VILLAGE',
  description: 'Tidak punya kemampuan malam. Gunakan diskusi dan voting untuk menyingkirkan serigala.',
  priority: 100,
  visibility: 'SELF',
  nightImmune: false,
  canVote: true,
  maxPerGame: 20,
  core: true,
  abilities: [],
};

export const GUARDIAN: RoleDef = {
  id: 'GUARDIAN',
  name: 'Penjaga',
  team: 'VILLAGE',
  description: 'Lindungi satu pemain tiap malam dari terkaman serigala. Tidak bisa melindungi diri sendiri (default).',
  priority: 10,
  visibility: 'SELF',
  nightImmune: false,
  canVote: true,
  maxPerGame: 2,
  core: true,
  abilities: [
    {
      type: 'PROTECT',
      stage: 'NIGHT',
      label: 'Lindungi',
      targetRules: { count: 1, allowSelf: false, selfSetting: 'guardianSelfProtect' },
      blockedByProtection: false,
      blockedByImmunity: false,
    },
  ],
};

export const WITCH: RoleDef = {
  id: 'WITCH',
  name: 'Penyihir',
  team: 'VILLAGE',
  description: 'Punya satu ramuan penyembuh dan satu ramuan racun, masing-masing sekali per game. Racun tidak bisa dihalangi Penjaga.',
  priority: 40,
  visibility: 'SELF',
  nightImmune: false,
  canVote: true,
  maxPerGame: 1,
  core: true,
  abilities: [
    {
      type: 'HEAL',
      stage: 'NIGHT',
      label: 'Ramuan penyembuh',
      usesPerGame: 1,
      targetRules: { count: 1, allowSelf: true },
      blockedByProtection: false,
      blockedByImmunity: false,
    },
    {
      type: 'POISON',
      stage: 'NIGHT',
      label: 'Ramuan racun',
      usesPerGame: 1,
      targetRules: { count: 1, allowSelf: false },
      blockedByProtection: false,
      blockedByImmunity: false,
    },
  ],
};

export const SEER: RoleDef = {
  id: 'SEER',
  name: 'Peramal',
  team: 'VILLAGE',
  description: 'Setiap malam, selidiki satu pemain untuk mengetahui timnya. Hasilnya hanya kamu yang tahu.',
  priority: 50,
  visibility: 'SELF',
  nightImmune: false,
  canVote: true,
  maxPerGame: 1,
  core: true,
  abilities: [
    {
      type: 'INSPECT',
      stage: 'NIGHT',
      label: 'Selidiki',
      targetRules: { count: 1, allowSelf: false },
      blockedByProtection: false,
      blockedByImmunity: false,
    },
  ],
};
