import type { RoomAction, RoomStatusId } from '@/lib/rooms/rules';
import type { RoleId } from '@/lib/game/constants';

export interface LobbyRoom {
  code: string;
  host: string;
  gameMode: string;
  playerCount: number;
  maxPlayers: number;
  spectatorCount: number;
  status: RoomStatusId;
  action: RoomAction;
  gameId: string | null;
  matchId: string | null;
}

export interface RoomPlayerView {
  userId: string;
  username: string;
  ready: boolean;
  isHost: boolean;
}

export interface RoomDetail {
  code: string;
  status: RoomStatusId;
  visibility: 'PUBLIC' | 'PRIVATE';
  gameMode: string;
  minPlayers: number;
  maxPlayers: number;
  allowSpectators: boolean;
  hasStarted: boolean;
  roleConfig: Partial<Record<RoleId, number>>;
  settings: Record<string, unknown>;
  host: { id: string; username: string };
  players: RoomPlayerView[];
  spectatorCount: number;
  gameId: string | null;
  matchId: string | null;
  viewer: { role: 'host' | 'player' | 'spectator' | 'none'; canJoin: boolean; canSpectate: boolean; ready: boolean };
}
