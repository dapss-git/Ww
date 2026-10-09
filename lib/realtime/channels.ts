export const LOBBY_CHANNEL = 'lobby';
export const roomChannel = (code: string) => `room-${code}`;
export const gameChannel = (gameId: string) => `game-${gameId}`;
/** Channel privat per-user (butuh otorisasi di /api/realtime/auth). */
export const userChannel = (userId: string) => `private-user-${userId}`;
