import type { ActionType, RoleId, TeamId } from '@/lib/game/constants';

export interface TargetRules {
  /** Jumlah target yang harus dipilih (0, 1, atau 2). */
  count: 0 | 1 | 2;
  allowSelf: boolean;
  /** Jika diisi, nilai allowSelf dibaca dari pengaturan game. */
  selfSetting?: 'guardianSelfProtect' | 'doctorSelfProtect';
  excludeTeams?: TeamId[];
  /** Tidak boleh memilih target yang sama dua malam berturut-turut. */
  noRepeatTarget?: boolean;
  requireUndoused?: boolean;
  /** Butuh minimal satu pemain hidup yang sudah di-douse (untuk IGNITE). */
  requireDoused?: boolean;
}

export interface AbilityDef {
  type: ActionType;
  /** NIGHT = aksi malam; POST_DEATH = aksi setelah mati (Hunter). */
  stage: 'NIGHT' | 'POST_DEATH';
  targetRules: TargetRules;
  usesPerGame?: number;
  firstNightOnly?: boolean;
  blockedByProtection: boolean;
  blockedByImmunity: boolean;
  /** Aksi dengan tally sama dikumpulkan (mis. voting serigala). */
  tally?: 'WEREWOLF_PACK';
  exclusiveWith?: ActionType[];
  label: string;
}

export interface RoleDef {
  id: RoleId;
  name: string;
  team: TeamId;
  description: string;
  /** Angka kecil diproses lebih dulu saat resolusi malam. */
  priority: number;
  abilities: AbilityDef[];
  /** SELF = hanya pemilik yang tahu; TEAM = sesama tim juga tahu. */
  visibility: 'SELF' | 'TEAM';
  nightImmune: boolean;
  canVote: boolean;
  /** Batas jumlah role ini dalam satu komposisi. */
  maxPerGame: number;
  /** Role inti selalu tersedia; role tambahan opsional. */
  core: boolean;
  /** Role ini dapat melihat role pemain yang sudah mati. */
  seesRoleOfDead?: boolean;
}
