import type { ActionType, ChatChannelId, PhaseId, RoleId, TeamId } from '@/lib/game/constants';

export interface PlayerView {
  id: string;
  userId: string;
  username: string;
  seat: number;
  status: 'ALIVE' | 'DEAD' | 'DISCONNECTED';
  role: RoleId | null;
  team: TeamId | null;
  isYou: boolean;
  isLover: boolean;
  hasVoted: boolean;
  deathRound: number | null;
}

export interface AvailableActionView {
  type: ActionType;
  label: string;
  stage: 'NIGHT' | 'POST_DEATH';
  targetCount: 0 | 1 | 2;
  candidates: string[];
  usesLeft: number | null;
  selected: string[];
}

export interface PrivateLogEntry {
  round: number;
  kind: 'INSPECT' | 'TRACK' | 'LOVERS' | 'NOTICE';
  targetId?: string;
  team?: TeamId;
  visited?: string[];
  text?: string;
}

export interface VoteResultView {
  round: number;
  voteRound: number;
  votes: { voterId: string; targetId: string }[];
  eliminatedId: string | null;
  outcome: 'ELIMINATED' | 'TIE_REVOTE' | 'NO_ELIMINATION';
}

export interface GameView {
  serverTime: number;
  game: {
    id: string;
    roomCode: string;
    phase: PhaseId;
    round: number;
    voteRound: number;
    phaseStartedAt: number;
    phaseEndsAt: number;
    aliveCount: number;
    deadCount: number;
    spectatorCount: number;
    hostId: string;
    winnerTeam: TeamId | null;
    winnerLabel: string | null;
    winners: string[];
    matchId: string | null;
  };
  viewer: {
    kind: 'player' | 'spectator';
    playerId: string | null;
    role: RoleId | null;
    team: TeamId | null;
    alive: boolean;
    canSend: ChatChannelId[];
    canRead: ChatChannelId[];
    canVote: boolean;
    votedFor: string | null;
    actions: AvailableActionView[];
    log: PrivateLogEntry[];
    partnerId: string | null;
    attackTargetId: string | null;
    wolfVotes: { voterId: string; targetId: string }[];
    doused: string[];
  };
  players: PlayerView[];
  tally: Record<string, number>;
  lastVoteResult: VoteResultView | null;
}

export interface ChatMessageView {
  id: string;
  channel: ChatChannelId;
  userId: string | null;
  username: string | null;
  content: string;
  system: boolean;
  createdAt: number;
}
