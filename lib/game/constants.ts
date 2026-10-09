export const ROLE_IDS = [
  'WEREWOLF',
  'VILLAGER',
  'GUARDIAN',
  'WITCH',
  'SEER',
  'HUNTER',
  'CUPID',
  'DOCTOR',
  'SERIAL_KILLER',
  'ARSONIST',
  'TRACKER',
  'MEDIUM',
] as const;
export type RoleId = (typeof ROLE_IDS)[number];

export const TEAM_IDS = ['VILLAGE', 'WEREWOLF', 'SOLO', 'NEUTRAL'] as const;
export type TeamId = (typeof TEAM_IDS)[number];

export const PHASE_IDS = [
  'WAITING',
  'STARTING',
  'ROLE_REVEAL',
  'DAY',
  'DISCUSSION',
  'VOTING',
  'NIGHT',
  'ROLE_ACTION',
  'RESULT',
  'FINISHED',
] as const;
export type PhaseId = (typeof PHASE_IDS)[number];

export const ACTION_TYPES = [
  'ATTACK',
  'PROTECT',
  'HEAL',
  'POISON',
  'INSPECT',
  'TRACK',
  'LINK',
  'KILL',
  'DOUSE',
  'IGNITE',
  'REVENGE_KILL',
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const CHAT_CHANNELS = ['PUBLIC', 'WEREWOLF', 'ROLE', 'SPECTATOR'] as const;
export type ChatChannelId = (typeof CHAT_CHANNELS)[number];

export const GAME_MODES = ['CLASSIC', 'MAJORITY'] as const;
export type GameMode = (typeof GAME_MODES)[number];

export type DeathReason = 'WEREWOLF_ATTACK' | 'POISON' | 'SERIAL_KILL' | 'IGNITE' | 'VOTE' | 'REVENGE' | 'HEARTBREAK';

export const MIN_PLAYERS_LIMIT = 4;
export const MAX_PLAYERS_LIMIT = 20;
