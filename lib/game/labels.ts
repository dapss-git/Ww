import type { PhaseId, TeamId } from './constants';

export const PHASE_LABEL: Record<PhaseId, string> = {
  WAITING: 'Menunggu',
  STARTING: 'Bersiap',
  ROLE_REVEAL: 'Pembagian Role',
  DAY: 'Pagi Hari',
  DISCUSSION: 'Diskusi',
  VOTING: 'Voting',
  NIGHT: 'Malam',
  ROLE_ACTION: 'Aksi Terakhir',
  RESULT: 'Hasil',
  FINISHED: 'Selesai',
};

export const TEAM_LABEL: Record<TeamId, string> = {
  VILLAGE: 'Desa',
  WEREWOLF: 'Serigala',
  SOLO: 'Solo',
  NEUTRAL: 'Netral',
};

export const WIN_LABEL: Record<string, string> = {
  VILLAGE: 'Desa menang',
  WEREWOLF: 'Serigala menang',
  SOLO: 'Pemain solo menang',
  LOVERS: 'Sepasang kekasih menang',
  DRAW: 'Seri',
};

export const ROOM_STATUS_LABEL: Record<string, string> = {
  WAITING: 'Menunggu',
  STARTING: 'Memulai',
  IN_PROGRESS: 'Berlangsung',
  FINISHED: 'Selesai',
  CLOSED: 'Ditutup',
};

export const MODE_LABEL: Record<string, string> = {
  CLASSIC: 'Klasik (paritas)',
  MAJORITY: 'Mayoritas',
};
