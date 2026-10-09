import { prisma } from '@/lib/db/prisma';
import { ROLES } from '@/lib/roles/registry';
import type { ChatChannelId, PhaseId, RoleId, TeamId } from './constants';
import { GameResolutionEngine } from './engine/resolution';
import type { EnginePlayer } from './engine/types';
import { listAvailableAbilities, type ValidationContext } from './engine/validate';
import { readableChannels, sendableChannels, type Viewer } from './permissions';
import { advanceGameIfDue, toViewer, type PlayerMemory, type StoredGameState } from './service';
import type { AvailableActionView, ChatMessageView, GameView, PlayerView, PrivateLogEntry } from '@/types/game';

/**
 * Membangun state game yang SUDAH DIFILTER per-viewer.
 * Role/tim pemain lain hanya disertakan bila viewer berhak mengetahuinya.
 * Spectator hanya mendapat informasi publik.
 */
export async function getGameView(userId: string, gameId: string): Promise<GameView> {
  await advanceGameIfDue(gameId);
  const { viewer, game, meId } = await toViewer(gameId, userId);
  const state = game.state as unknown as StoredGameState;
  const phase = game.phase as PhaseId;
  const finished = phase === 'FINISHED';
  const settings = state.settings;
  const me = meId ? game.players.find((p) => p.id === meId)! : null;
  const myRole = me ? ROLES[me.role as RoleId] : null;

  const users = await prisma.user.findMany({ where: { id: { in: game.players.map((p) => p.userId) } }, select: { id: true, username: true } });
  const usernames = new Map(users.map((u) => [u.id, u.username]));

  const votes = await prisma.vote.findMany({ where: { gameId, round: game.round, voteRound: game.voteRound } });
  const votedIds = new Set(votes.map((v) => v.voterId));
  const tally: Record<string, number> = {};
  for (const v of votes) tally[v.targetId] = (tally[v.targetId] ?? 0) + 1;

  const partnerId =
    me && state.lovers?.includes(me.id) ? (state.lovers.find((id) => id !== me.id) ?? null) : null;

  const canSeeRole = (target: (typeof game.players)[number]): boolean => {
    if (finished) return true;
    if (me && target.id === me.id) return true;
    const dead = target.status !== 'ALIVE';
    if (dead && settings.revealRolesOnDeath) return true;
    if (!me || !myRole) return false;
    if (myRole.visibility === 'TEAM' && ROLES[target.role as RoleId].visibility === 'TEAM' && target.team === me.team) return true;
    if (myRole.seesRoleOfDead && me.status === 'ALIVE' && dead) return true;
    return false;
  };

  const players: PlayerView[] = [...game.players]
    .sort((a, b) => a.seat - b.seat)
    .map((p) => {
      const visible = canSeeRole(p);
      return {
        id: p.id,
        userId: p.userId,
        username: usernames.get(p.userId) ?? '???',
        seat: p.seat,
        status: p.status === 'ALIVE' ? 'ALIVE' : p.status === 'DISCONNECTED' ? 'DISCONNECTED' : 'DEAD',
        role: visible ? (p.role as RoleId) : null,
        team: visible ? (p.team as TeamId) : null,
        isYou: p.id === meId,
        isLover: Boolean(me && (p.id === me.id || p.id === partnerId) && partnerId),
        hasVoted: votedIds.has(p.id),
        deathRound: p.deathRound,
      };
    });

  const enginePlayers: EnginePlayer[] = game.players.map((p) => ({
    id: p.id,
    role: p.role as RoleId,
    team: p.team as TeamId,
    alive: p.status === 'ALIVE',
    usesLeft: (p.usesLeft ?? {}) as Record<string, number>,
    lastTargets: ((p.memory ?? {}) as Partial<PlayerMemory>).lastTargets ?? {},
  }));

  // Aksi yang tersedia (hanya untuk pemain)
  const actions: AvailableActionView[] = [];
  if (me && !finished && (phase === 'NIGHT' || phase === 'ROLE_ACTION')) {
    const stage = phase === 'NIGHT' ? 'NIGHT' : 'POST_DEATH';
    const ctx: ValidationContext = {
      players: enginePlayers,
      state: { round: game.round, lovers: state.lovers, doused: state.doused, settings },
      stage,
      pendingRevenge: state.revenge?.pending,
    };
    const mine = await prisma.gameAction.findMany({ where: { gameId, round: game.round, actorId: me.id } });
    for (const a of listAvailableAbilities(ctx, me.id)) {
      const existing = mine.find((m) => m.type === a.ability.type);
      actions.push({
        type: a.ability.type,
        label: a.ability.label,
        stage: a.ability.stage,
        targetCount: a.ability.targetRules.count,
        candidates: a.candidates,
        usesLeft: a.usesLeft,
        selected: existing ? [existing.targetId, existing.target2Id].filter((v): v is string => Boolean(v)) : a.ability.targetRules.count === 0 ? [] : [],
      });
    }
    // Aksi tanpa target dianggap "dipilih" bila sudah dikirim
    for (const act of actions) {
      if (act.targetCount === 0 && mine.some((m) => m.type === act.type)) act.selected = ['*'];
    }
  }

  // Info rahasia khusus peran (tidak pernah dikirim ke pemain lain/spectator)
  let attackTargetId: string | null = null;
  let wolfVotes: { voterId: string; targetId: string }[] = [];
  if (me && myRole && phase === 'NIGHT') {
    const nightActions = await prisma.gameAction.findMany({ where: { gameId, round: game.round, type: 'ATTACK' }, orderBy: { createdAt: 'asc' } });
    if (myRole.team === 'WEREWOLF') {
      wolfVotes = nightActions.filter((a) => a.targetId).map((a) => ({ voterId: a.actorId, targetId: a.targetId! }));
    }
    if (me.role === 'WITCH' && me.status === 'ALIVE') {
      const t = GameResolutionEngine.tallyVotes(nightActions.filter((a) => a.targetId).map((a) => ({ voterId: a.actorId, targetId: a.targetId! })));
      attackTargetId = t.leaders[0] ?? null;
    }
  }

  const memory = me ? (me.memory as unknown as PlayerMemory) : null;
  const log: PrivateLogEntry[] = memory?.log ?? [];
  const isDoused = me?.role === 'ARSONIST' ? state.doused : [];

  const spectatorCount = await prisma.roomSpectator.count({ where: { roomId: game.roomId } });
  const match = finished ? await prisma.match.findUnique({ where: { gameId }, select: { id: true } }) : null;
  const alive = game.players.filter((p) => p.status === 'ALIVE').length;

  const v: Viewer = viewer;
  return {
    serverTime: Date.now(),
    game: {
      id: game.id,
      roomCode: game.room.code,
      phase,
      round: game.round,
      voteRound: game.voteRound,
      phaseStartedAt: game.phaseStartedAt.getTime(),
      phaseEndsAt: game.phaseEndsAt.getTime(),
      aliveCount: alive,
      deadCount: game.players.length - alive,
      spectatorCount,
      hostId: game.room.hostId,
      winnerTeam: (game.winnerTeam as TeamId | null) ?? null,
      winnerLabel: state.winner?.label ?? null,
      winners: finished ? (state.winner?.winners ?? []) : [],
      matchId: match?.id ?? null,
    },
    viewer: {
      kind: v.kind,
      playerId: meId,
      role: me ? (me.role as RoleId) : null,
      team: me ? (me.team as TeamId) : null,
      alive: v.alive,
      canSend: sendableChannels(v, phase),
      canRead: readableChannels(v, phase),
      canVote: Boolean(me && v.alive && phase === 'VOTING' && myRole?.canVote && !votedIds.has(me.id)),
      votedFor: me ? (votes.find((x) => x.voterId === me.id)?.targetId ?? null) : null,
      actions,
      log,
      partnerId,
      attackTargetId,
      wolfVotes,
      doused: isDoused,
    },
    players,
    // Tally publik selama voting; detail siapa-memilih-siapa baru terbuka setelah hasil keluar.
    tally: phase === 'VOTING' ? tally : {},
    lastVoteResult: phase === 'VOTING' && state.lastVoteResult?.round !== game.round ? null : (state.lastVoteResult ?? null),
  };
}

export async function getChat(userId: string, gameId: string, after?: number): Promise<ChatMessageView[]> {
  const { viewer, game, meId } = await toViewer(gameId, userId);
  const state = game.state as unknown as StoredGameState;
  const phase = game.phase as PhaseId;
  const channels = readableChannels(viewer, phase);
  const isLoverReader = Boolean(meId && state.lovers?.includes(meId));

  const rows = await prisma.chatMessage.findMany({
    where: {
      gameId,
      channel: { in: channels },
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
      ...(channels.includes('ROLE') && !isLoverReader && phase !== 'FINISHED' ? { NOT: { channel: 'ROLE' } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 120,
    include: { user: { select: { username: true } } },
  });
  return rows.reverse().map((m) => ({
    id: m.id,
    channel: m.channel as ChatChannelId,
    userId: m.userId,
    username: m.user?.username ?? null,
    content: m.content,
    system: m.system,
    createdAt: m.createdAt.getTime(),
  }));
}
