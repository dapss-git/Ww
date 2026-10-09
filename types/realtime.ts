/**
 * Event realtime bertipe. Payload sengaja hanya berisi sinyal publik/minimal:
 * data rahasia TIDAK pernah dikirim lewat realtime. Client mengambil ulang state
 * yang sudah difilter per-viewer dari server.
 */
export interface RealtimeEventMap {
  'room:player_joined': { roomCode: string };
  'room:player_left': { roomCode: string };
  'room:player_ready': { roomCode: string };
  'room:spectator_joined': { roomCode: string };
  'room:spectator_left': { roomCode: string };
  'room:closed': { roomCode: string };
  'game:started': { roomCode: string; gameId: string };
  'game:phase_changed': { gameId: string; phase: string; round: number };
  'game:timer_updated': { gameId: string; phaseEndsAt: number };
  'chat:message': { gameId: string; channel: 'PUBLIC' };
  'chat:private_message': { gameId: string; channel: 'WEREWOLF' | 'ROLE' | 'SPECTATOR' };
  'game:action': { gameId: string };
  'game:vote': { gameId: string };
  'game:vote_result': { gameId: string };
  'game:player_eliminated': { gameId: string };
  'game:finished': { gameId: string };
  'player:reconnected': { gameId: string };
  'lobby:updated': { at: number };
}

export type RealtimeEventName = keyof RealtimeEventMap;

export interface OutboundEvent<E extends RealtimeEventName = RealtimeEventName> {
  channel: string;
  event: E;
  payload: RealtimeEventMap[E];
}
