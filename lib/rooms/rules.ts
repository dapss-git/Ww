export type RoomStatusId = 'WAITING' | 'STARTING' | 'IN_PROGRESS' | 'FINISHED' | 'CLOSED';
export type RoomAction = 'JOIN' | 'SPECTATE' | 'RETURN' | 'FINISHED' | 'CLOSED';

export interface RoomAccessInput {
  status: RoomStatusId;
  playerCount: number;
  maxPlayers: number;
  allowSpectators: boolean;
  isPlayer: boolean;
  isSpectator: boolean;
}

export interface RoomAccess {
  canJoin: boolean;
  canSpectate: boolean;
  action: RoomAction;
}

/**
 * Aturan join/spectate (sumber kebenaran tunggal; dipakai API dan lobby).
 * - WAITING & belum penuh -> JOIN
 * - WAITING & penuh -> SPECTATE
 * - STARTING / IN_PROGRESS -> SPECTATE saja
 * - FINISHED -> hanya hasil match
 * - CLOSED -> tidak bisa apa-apa
 */
export function computeRoomAccess(i: RoomAccessInput): RoomAccess {
  if (i.status === 'CLOSED') return { canJoin: false, canSpectate: false, action: 'CLOSED' };
  if (i.status === 'FINISHED') return { canJoin: false, canSpectate: false, action: 'FINISHED' };
  if (i.isPlayer) return { canJoin: false, canSpectate: false, action: 'RETURN' };
  if (i.status === 'WAITING') {
    if (i.playerCount < i.maxPlayers) return { canJoin: true, canSpectate: false, action: 'JOIN' };
    return { canJoin: false, canSpectate: i.allowSpectators, action: i.allowSpectators ? 'SPECTATE' : 'CLOSED' };
  }
  return { canJoin: false, canSpectate: i.allowSpectators, action: i.allowSpectators ? 'SPECTATE' : 'CLOSED' };
}
