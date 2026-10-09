import type { RoleDef } from './types';

export const HUNTER: RoleDef = {
  id: 'HUNTER',
  name: 'Pemburu',
  team: 'VILLAGE',
  description: 'Saat mati (dibunuh atau divote), kamu bisa menembak satu pemain untuk ikut mati bersamamu.',
  priority: 70,
  visibility: 'SELF',
  nightImmune: false,
  canVote: true,
  maxPerGame: 1,
  core: false,
  abilities: [
    {
      type: 'REVENGE_KILL',
      stage: 'POST_DEATH',
      label: 'Tembak balasan',
      usesPerGame: 1,
      targetRules: { count: 1, allowSelf: false },
      blockedByProtection: false,
      blockedByImmunity: false,
    },
  ],
};

export const CUPID: RoleDef = {
  id: 'CUPID',
  name: 'Cupid',
  team: 'VILLAGE',
  description: 'Di malam pertama, pilih dua pemain sebagai Pasangan. Jika salah satu mati, pasangannya mati karena patah hati.',
  priority: 1,
  visibility: 'SELF',
  nightImmune: false,
  canVote: true,
  maxPerGame: 1,
  core: false,
  abilities: [
    {
      type: 'LINK',
      stage: 'NIGHT',
      label: 'Pasangkan',
      usesPerGame: 1,
      firstNightOnly: true,
      targetRules: { count: 2, allowSelf: true },
      blockedByProtection: false,
      blockedByImmunity: false,
    },
  ],
};

export const DOCTOR: RoleDef = {
  id: 'DOCTOR',
  name: 'Dokter',
  team: 'VILLAGE',
  description: 'Seperti Penjaga, tetapi tidak boleh melindungi target yang sama dua malam berturut-turut. Perlindungan diri bisa diatur host.',
  priority: 10,
  visibility: 'SELF',
  nightImmune: false,
  canVote: true,
  maxPerGame: 1,
  core: false,
  abilities: [
    {
      type: 'PROTECT',
      stage: 'NIGHT',
      label: 'Rawat',
      targetRules: { count: 1, allowSelf: true, selfSetting: 'doctorSelfProtect', noRepeatTarget: true },
      blockedByProtection: false,
      blockedByImmunity: false,
    },
  ],
};

export const SERIAL_KILLER: RoleDef = {
  id: 'SERIAL_KILLER',
  name: 'Pembunuh Berantai',
  team: 'SOLO',
  description: 'Berjuang sendirian. Bunuh satu pemain tiap malam dan jadilah yang terakhir hidup. Kebal terhadap terkaman serigala.',
  priority: 30,
  visibility: 'SELF',
  nightImmune: true,
  canVote: true,
  maxPerGame: 1,
  core: false,
  abilities: [
    {
      type: 'KILL',
      stage: 'NIGHT',
      label: 'Bunuh',
      targetRules: { count: 1, allowSelf: false },
      blockedByProtection: true,
      blockedByImmunity: true,
    },
  ],
};

export const ARSONIST: RoleDef = {
  id: 'ARSONIST',
  name: 'Pembakar',
  team: 'SOLO',
  description: 'Siram bensin ke satu pemain tiap malam, lalu bakar semua yang sudah disiram dalam satu malam. Menang jika jadi yang terakhir hidup.',
  priority: 35,
  visibility: 'SELF',
  nightImmune: false,
  canVote: true,
  maxPerGame: 1,
  core: false,
  abilities: [
    {
      type: 'DOUSE',
      stage: 'NIGHT',
      label: 'Siram bensin',
      exclusiveWith: ['IGNITE'],
      targetRules: { count: 1, allowSelf: false, requireUndoused: true },
      blockedByProtection: false,
      blockedByImmunity: false,
    },
    {
      type: 'IGNITE',
      stage: 'NIGHT',
      label: 'Bakar semua',
      exclusiveWith: ['DOUSE'],
      targetRules: { count: 0, allowSelf: false, requireDoused: true },
      blockedByProtection: false,
      blockedByImmunity: false,
    },
  ],
};

export const TRACKER: RoleDef = {
  id: 'TRACKER',
  name: 'Pelacak',
  team: 'VILLAGE',
  description: 'Ikuti satu pemain tiap malam untuk melihat siapa saja yang dikunjungi target malam itu (bukan role-nya).',
  priority: 55,
  visibility: 'SELF',
  nightImmune: false,
  canVote: true,
  maxPerGame: 1,
  core: false,
  abilities: [
    {
      type: 'TRACK',
      stage: 'NIGHT',
      label: 'Lacak',
      targetRules: { count: 1, allowSelf: false },
      blockedByProtection: false,
      blockedByImmunity: false,
    },
  ],
};

export const MEDIUM: RoleDef = {
  id: 'MEDIUM',
  name: 'Medium',
  team: 'VILLAGE',
  description: 'Dapat melihat role pemain yang sudah mati, setelah kematian mereka.',
  priority: 60,
  visibility: 'SELF',
  nightImmune: false,
  canVote: true,
  maxPerGame: 1,
  core: false,
  seesRoleOfDead: true,
  abilities: [],
};
