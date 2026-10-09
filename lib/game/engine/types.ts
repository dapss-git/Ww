import type { ActionType, DeathReason, RoleId, TeamId } from '../constants';
import type { GameSettings } from '../settings';

export interface EnginePlayer {
  id: string;
  role: RoleId;
  team: TeamId;
  alive: boolean;
  usesLeft: Record<string, number>;
  lastTargets: Record<string, string | null>;
}

export interface EngineAction {
  actorId: string;
  type: ActionType;
  targetId: string | null;
  target2Id: string | null;
}

export interface EngineState {
  round: number;
  lovers: [string, string] | null;
  doused: string[];
  settings: GameSettings;
}

export interface Death {
  playerId: string;
  reason: DeathReason;
  killerId?: string;
}

export interface Inspection {
  actorId: string;
  kind: 'INSPECT' | 'TRACK';
  targetId: string;
  team?: TeamId;
  visited?: string[];
}

export interface WinResult {
  over: boolean;
  team?: TeamId;
  label?: 'VILLAGE' | 'WEREWOLF' | 'SOLO' | 'LOVERS' | 'DRAW';
  winners: string[];
}

export interface DeathResolution {
  deaths: Death[];
  pendingRevenge: string[];
  players: EnginePlayer[];
}

export interface NightResolution extends DeathResolution {
  inspections: Inspection[];
  saved: { playerId: string; by: 'PROTECT' | 'HEAL' }[];
  attackTargetId: string | null;
  consumed: { actorId: string; type: ActionType }[];
  lastTargets: { actorId: string; type: ActionType; targetId: string }[];
  lovers: [string, string] | null;
  doused: string[];
  newlyDoused: string[];
  win: WinResult;
}
