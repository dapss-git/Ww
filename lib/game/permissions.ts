import type { ChatChannelId, PhaseId } from './constants';
import { ROLES } from '@/lib/roles/registry';
import type { RoleId } from './constants';

export interface Viewer {
  kind: 'player' | 'spectator';
  alive: boolean;
  role: RoleId | null;
  isLover: boolean;
}

const PUBLIC_CHAT_PHASES: PhaseId[] = ['DAY', 'DISCUSSION', 'VOTING'];

/** Siapa yang boleh MENGIRIM ke channel (verifikasi server-side). */
export function canSend(channel: ChatChannelId, viewer: Viewer, phase: PhaseId): boolean {
  if (phase === 'FINISHED' || phase === 'WAITING') return false;
  switch (channel) {
    case 'PUBLIC':
      return viewer.kind === 'player' && viewer.alive && PUBLIC_CHAT_PHASES.includes(phase);
    case 'WEREWOLF':
      return viewer.kind === 'player' && viewer.alive && viewer.role !== null && ROLES[viewer.role].team === 'WEREWOLF' && phase === 'NIGHT';
    case 'ROLE':
      return viewer.kind === 'player' && viewer.alive && viewer.isLover && phase === 'NIGHT';
    case 'SPECTATOR':
      return viewer.kind === 'spectator';
  }
}

/** Siapa yang boleh MEMBACA channel. Setelah game selesai semua peserta dapat membaca semua channel (kecuali SPECTATOR). */
export function canRead(channel: ChatChannelId, viewer: Viewer, phase: PhaseId): boolean {
  const finished = phase === 'FINISHED';
  switch (channel) {
    case 'PUBLIC':
      return true;
    case 'WEREWOLF':
      if (viewer.kind === 'spectator') return false;
      return finished || (viewer.role !== null && ROLES[viewer.role].team === 'WEREWOLF');
    case 'ROLE':
      if (viewer.kind === 'spectator') return false;
      return finished || viewer.isLover;
    case 'SPECTATOR':
      return viewer.kind === 'spectator';
  }
}

export function readableChannels(viewer: Viewer, phase: PhaseId): ChatChannelId[] {
  return (['PUBLIC', 'WEREWOLF', 'ROLE', 'SPECTATOR'] as const).filter((c) => canRead(c, viewer, phase));
}

export function sendableChannels(viewer: Viewer, phase: PhaseId): ChatChannelId[] {
  return (['PUBLIC', 'WEREWOLF', 'ROLE', 'SPECTATOR'] as const).filter((c) => canSend(c, viewer, phase));
}
