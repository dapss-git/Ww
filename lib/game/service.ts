import { Prisma, type GamePlayer } from '@prisma/client';
import { prisma, type Tx } from '@/lib/db/prisma';
import { AppError } from '@/lib/api/response';
import { emitAll } from '@/lib/realtime';
import { gameChannel, LOBBY_CHANNEL, roomChannel, userChannel } from '@/lib/realtime/channels';
import { secureRandom } from '@/lib/security/random';
import { sanitizeText } from '@/lib/security/sanitize';
import { ROLES } from '@/lib/roles/registry';
import type { OutboundEvent } from '@/types/realtime';
import type { PrivateLogEntry, VoteResultView } from '@/types/game';
import type { ActionType, ChatChannelId, PhaseId, RoleId, TeamId } from './constants';
import { assignRoles, fitRolesToPlayerCount, type RoleConfig } from './engine/composition';
import { GameResolutionEngine } from './engine/resolution';
import type { Death, EngineAction, EnginePlayer, EngineState, WinResult } from './engine/types';
import { validateAction, type ValidationContext } from './engine/validate';
import { canSend, type Viewer } from './permissions';
import { phaseDuration, resolveSettings, type GameSettings } from './settings';
import { lockRoom } from '@/lib/rooms/service';

/* ------------------------------------------------------------------ */
/* Tipe state tersimpan                                                */
/* ------------------------------------------------------------------ */

export interface StoredGameState {
  lovers: [string, string] | null;
  doused: string[];
  revenge: { pending: string[]; after: 'DAY' | 'RESULT' } | null;
  lastVoteResult: VoteResultView | null;
  winner: { label: string; team: TeamId; winners: string[] } | null;
  settings: GameSettings;
}

export interface PlayerMemory {
  log: PrivateLogEntry[];
  lastTargets: Record<string, string | null>;
}

type GamePlayerRow = GamePlayer;

interface Work {
  row: GamePlayerRow;
  usesLeft: Record<string, number>;
  memory: PlayerMemory;
  alive: boolean;
  deathReason: string | null;
  deathRound: number | null;
  dirty: boolean;
}

const MAX_CHAIN = 6;

/* ------------------------------------------------------------------ */
/* Helper                                                              */
/* ------------------------------------------------------------------ */

function toWork(rows: GamePlayerRow[]): Map<string, Work> {
  return new Map(
    rows.map((row) => [
      row.id,
      {
        row,
        usesLeft: { ...((row.usesLeft ?? {}) as Record<string, number>) },
        memory: { log: [], lastTargets: {}, ...((row.memory ?? {}) as Partial<PlayerMemory>) } as PlayerMemory,
        alive: row.status === 'ALIVE',
        deathReason: row.deathReason,
        deathRound: row.deathRound,
        dirty: false,
      },
    ]),
  );
}

function toEngine(work: Map<string, Work>): EnginePlayer[] {
  return [...work.values()].map((w) => ({
    id: w.row.id,
    role: w.row.role as RoleId,
    team: w.row.team as TeamId,
    alive: w.alive,
    usesLeft: w.usesLeft,
    lastTargets: w.memory.lastTargets,
  }));
}

async function flush(tx: Tx, work: Map<string, Work>) {
  for (const w of work.values()) {
    if (!w.dirty) continue;
    await tx.gamePlayer.update({
      where: { id: w.row.id },
      data: {
        status: w.alive ? 'ALIVE' : 'DEAD',
        usesLeft: w.usesLeft as Prisma.InputJsonValue,
        memory: w.memory as unknown as Prisma.InputJsonValue,
        deathReason: w.deathReason,
        deathRound: w.deathRound,
      },
    });
    w.dirty = false;
  }
}

function applyDeaths(work: Map<string, Work>, deaths: Death[], round: number) {
  for (const d of deaths) {
    const w = work.get(d.playerId);
    if (!w) continue;
    w.alive = false;
    w.deathReason = d.reason;
    w.deathRound = round;
    w.dirty = true;
  }
}

function consume(work: Map<string, Work>, items: { actorId: string; type: ActionType }[]) {
  for (const c of items) {
    const w = work.get(c.actorId);
    if (!w) continue;
    const def = ROLES[w.row.role as RoleId].abilities.find((a) => a.type === c.type);
    const left = w.usesLeft[c.type] ?? def?.usesPerGame ?? 1;
    w.usesLeft[c.type] = Math.max(0, left - 1);
    w.dirty = true;
  }
}

function addLog(work: Map<string, Work>, playerId: string, entry: PrivateLogEntry) {
  const w = work.get(playerId);
  if (!w) return;
  w.memory.log.push(entry);
  w.dirty = true;
}

async function systemMessage(tx: Tx, gameId: string, content: string) {
  await tx.chatMessage.create({ data: { gameId, channel: 'PUBLIC', content, system: true } });
}

function names(work: Map<string, Work>, usernames: Map<string, string>, ids: string[]): string {
  return ids.map((id) => usernames.get(work.get(id)?.row.userId ?? '') ?? 'Seseorang').join(', ');
}

async function usernameMap(tx: Tx, rows: GamePlayerRow[]): Promise<Map<string, string>> {
  const users = await tx.user.findMany({ where: { id: { in: rows.map((r) => r.userId) } }, select: { id: true, username: true } });
  return new Map(users.map((u) => [u.id, u.username]));
}

function phaseEvent(gameId: string, phase: PhaseId, round: number, endsAt: Date): OutboundEvent[] {
  return [
    { channel: gameChannel(gameId), event: 'game:phase_changed', payload: { gameId, phase, round } },
    { channel: gameChannel(gameId), event: 'game:timer_updated', payload: { gameId, phaseEndsAt: endsAt.getTime() } },
  ];
}

/* ------------------------------------------------------------------ */
/* Memulai game                                                        */
/* ------------------------------------------------------------------ */

export async function startGame(hostId: string, code: string): Promise<{ gameId: string }> {
  const preview = await prisma.room.findUnique({ where: { code } });
  if (!preview) throw new AppError('NOT_FOUND', 'Room tidak ditemukan.');
  if (preview.hostId !== hostId) throw new AppError('FORBIDDEN', 'Hanya host yang bisa memulai game.');

  const { gameId, events } = await prisma.$transaction(async (tx) => {
    await lockRoom(tx, preview.id);
    const room = await tx.room.findUniqueOrThrow({ where: { id: preview.id }, include: { players: true } });
    if (room.status === 'CLOSED') throw new AppError('ROOM_CLOSED', 'Room sudah ditutup.');
    if (room.status === 'FINISHED') throw new AppError('ROOM_FINISHED', 'Game sudah selesai.');
    if (room.status !== 'WAITING') throw new AppError('INVALID_PHASE', 'Game sudah dimulai.');
    const n = room.players.length;
    if (n < room.minPlayers) throw new AppError('VALIDATION_ERROR', `Butuh minimal ${room.minPlayers} pemain (sekarang ${n}).`);
    if (n > room.maxPlayers) throw new AppError('VALIDATION_ERROR', `Pemain melebihi batas maksimal ${room.maxPlayers}.`);
    if (room.players.some((p) => !p.ready && p.userId !== room.hostId)) {
      throw new AppError('VALIDATION_ERROR', 'Semua pemain harus ready sebelum game dimulai.');
    }
    const roles = fitRolesToPlayerCount(room.roleConfig as RoleConfig, n);
    if (!roles) throw new AppError('VALIDATION_ERROR', 'Komposisi role tidak valid untuk jumlah pemain ini. Ubah konfigurasi role.');

    const settings = resolveSettings(room.settings, room.gameMode);
    const assignment = assignRoles(room.players.map((p) => p.userId), roles, secureRandom);
    const now = new Date();
    const state: StoredGameState = { lovers: null, doused: [], revenge: null, lastVoteResult: null, winner: null, settings };

    const game = await tx.game.create({
      data: {
        roomId: room.id,
        phase: 'STARTING',
        round: 0,
        phaseStartedAt: now,
        phaseEndsAt: new Date(now.getTime() + settings.durations.STARTING * 1000),
        state: state as unknown as Prisma.InputJsonValue,
      },
    });
    await tx.gamePlayer.createMany({
      data: assignment.map((a) => {
        const def = ROLES[a.role];
        const usesLeft: Record<string, number> = {};
        for (const ability of def.abilities) if (ability.usesPerGame !== undefined) usesLeft[ability.type] = ability.usesPerGame;
        return {
          gameId: game.id,
          userId: a.playerId,
          role: a.role,
          team: def.team,
          seat: a.seat,
          usesLeft: usesLeft as Prisma.InputJsonValue,
          memory: { log: [], lastTargets: {} } as unknown as Prisma.InputJsonValue,
        };
      }),
    });
    await tx.room.update({ where: { id: room.id }, data: { status: 'STARTING', hasStarted: true } });
    await systemMessage(tx, game.id, `Permainan dimulai dengan ${n} pemain. Desa akan segera terlelap...`);

    const events: OutboundEvent[] = [
      { channel: roomChannel(room.code), event: 'game:started', payload: { roomCode: room.code, gameId: game.id } },
      { channel: LOBBY_CHANNEL, event: 'lobby:updated', payload: { at: Date.now() } },
    ];
    return { gameId: game.id, events };
  });
  await emitAll(events);
  return { gameId };
}

/* ------------------------------------------------------------------ */
/* Transisi fase (server-authoritative, lazy + lock optimistik)         */
/* ------------------------------------------------------------------ */

type GameWithRows = Prisma.GameGetPayload<{ include: { players: true; room: true } }>;

async function moveTo(tx: Tx, game: GameWithRows, phase: PhaseId, settings: GameSettings, now: Date, extra: Prisma.GameUpdateInput = {}) {
  const endsAt = new Date(now.getTime() + phaseDuration(settings, phase) * 1000);
  await tx.game.update({ where: { id: game.id }, data: { phase, phaseStartedAt: now, phaseEndsAt: endsAt, ...extra } });
  return endsAt;
}

async function finishGame(
  tx: Tx,
  game: GameWithRows,
  win: WinResult,
  work: Map<string, Work>,
  state: StoredGameState,
  round: number,
  now: Date,
): Promise<OutboundEvent[]> {
  state.winner = { label: win.label ?? 'DRAW', team: win.team ?? 'NEUTRAL', winners: win.winners };
  state.revenge = null;
  await flush(tx, work);
  await tx.game.update({
    where: { id: game.id },
    data: { phase: 'FINISHED', winnerTeam: win.team ?? 'NEUTRAL', endedAt: now, phaseStartedAt: now, phaseEndsAt: now, state: state as unknown as Prisma.InputJsonValue },
  });
  await tx.room.update({ where: { id: game.roomId }, data: { status: 'FINISHED', finishedAt: now } });
  await tx.match.create({
    data: {
      gameId: game.id,
      roomCode: game.room.code,
      gameMode: game.room.gameMode,
      winnerTeam: win.team ?? 'NEUTRAL',
      winnerLabel: win.label ?? 'DRAW',
      playerCount: work.size,
      rounds: round,
      startedAt: game.startedAt,
      endedAt: now,
      players: {
        create: [...work.values()].map((w) => ({
          userId: w.row.userId,
          role: w.row.role,
          team: w.row.team,
          won: win.winners.includes(w.row.id),
          survived: w.alive,
        })),
      },
    },
  });
  const label: Record<string, string> = {
    VILLAGE: 'Desa menang! Semua ancaman telah disingkirkan.',
    WEREWOLF: 'Serigala menang! Desa jatuh ke tangan mereka.',
    SOLO: 'Pemain solo menjadi yang terakhir bertahan.',
    LOVERS: 'Sepasang kekasih menang bersama.',
    DRAW: 'Permainan berakhir seri.',
  };
  await systemMessage(tx, game.id, label[win.label ?? 'DRAW']);
  return [
    { channel: gameChannel(game.id), event: 'game:finished', payload: { gameId: game.id } },
    { channel: roomChannel(game.room.code), event: 'game:finished', payload: { gameId: game.id } },
    { channel: LOBBY_CHANNEL, event: 'lobby:updated', payload: { at: Date.now() } },
  ];
}

async function startNight(tx: Tx, game: GameWithRows, state: StoredGameState, round: number, now: Date): Promise<OutboundEvent[]> {
  const endsAt = await moveTo(tx, game, 'NIGHT', state.settings, now, { round, voteRound: 1, state: state as unknown as Prisma.InputJsonValue });
  await systemMessage(tx, game.id, `Malam ke-${round} tiba. Desa terlelap, semua kemampuan malam bisa digunakan.`);
  return phaseEvent(game.id, 'NIGHT', round, endsAt);
}

async function transition(tx: Tx, gameId: string, now: Date): Promise<OutboundEvent[] | null> {
  const game = await tx.game.findUnique({ where: { id: gameId }, include: { players: true, room: true } });
  if (!game || game.phase === 'FINISHED' || game.phaseEndsAt > now) return null;
  const claim = await tx.game.updateMany({ where: { id: gameId, phaseVersion: game.phaseVersion }, data: { phaseVersion: { increment: 1 } } });
  if (claim.count === 0) return null;

  const state = game.state as unknown as StoredGameState;
  const settings = state.settings;
  const round = game.round;

  switch (game.phase) {
    case 'STARTING': {
      await tx.room.update({ where: { id: game.roomId }, data: { status: 'IN_PROGRESS' } });
      const endsAt = await moveTo(tx, game, 'ROLE_REVEAL', settings, now);
      return [...phaseEvent(game.id, 'ROLE_REVEAL', round, endsAt), { channel: LOBBY_CHANNEL, event: 'lobby:updated', payload: { at: Date.now() } }];
    }
    case 'ROLE_REVEAL':
      return startNight(tx, game, state, 1, now);
    case 'RESULT':
      return startNight(tx, game, state, round + 1, now);
    case 'DAY': {
      const endsAt = await moveTo(tx, game, 'DISCUSSION', settings, now);
      return phaseEvent(game.id, 'DISCUSSION', round, endsAt);
    }
    case 'DISCUSSION': {
      const endsAt = await moveTo(tx, game, 'VOTING', settings, now, { voteRound: 1 });
      await systemMessage(tx, game.id, 'Waktu voting! Pilih pemain yang akan digantung.');
      return phaseEvent(game.id, 'VOTING', round, endsAt);
    }
    case 'NIGHT':
      return resolveNightPhase(tx, game, state, now);
    case 'VOTING':
      return resolveVotingPhase(tx, game, state, now);
    case 'ROLE_ACTION':
      return resolveRevengePhase(tx, game, state, now);
    default:
      return null;
  }
}

async function resolveNightPhase(tx: Tx, game: GameWithRows, state: StoredGameState, now: Date): Promise<OutboundEvent[]> {
  const work = toWork(game.players);
  const usernames = await usernameMap(tx, game.players);
  const rows = await tx.gameAction.findMany({ where: { gameId: game.id, round: game.round, type: { not: 'REVENGE_KILL' } }, orderBy: { createdAt: 'asc' } });
  const actions: EngineAction[] = rows.map((r) => ({ actorId: r.actorId, type: r.type as ActionType, targetId: r.targetId, target2Id: r.target2Id }));
  const engineState: EngineState = { round: game.round, lovers: state.lovers, doused: state.doused, settings: state.settings };

  const result = GameResolutionEngine.resolveNight({ players: toEngine(work), actions, state: engineState });

  consume(work, result.consumed);
  for (const lt of result.lastTargets) {
    const w = work.get(lt.actorId);
    if (w) {
      w.memory.lastTargets[lt.type] = lt.targetId;
      w.dirty = true;
    }
  }
  // Doctor tanpa aksi malam ini: reset agar aturan "berturut-turut" benar.
  for (const w of work.values()) {
    const def = ROLES[w.row.role as RoleId];
    for (const ability of def.abilities) {
      if (!ability.targetRules.noRepeatTarget || !w.alive) continue;
      if (!result.lastTargets.some((l) => l.actorId === w.row.id && l.type === ability.type) && w.memory.lastTargets[ability.type]) {
        w.memory.lastTargets[ability.type] = null;
        w.dirty = true;
      }
    }
  }
  for (const ins of result.inspections) {
    addLog(work, ins.actorId, { round: game.round, kind: ins.kind, targetId: ins.targetId, team: ins.team, visited: ins.visited });
  }
  if (result.lovers && !state.lovers) {
    const [a, b] = result.lovers;
    const other = (id: string) => usernames.get(work.get(id === a ? b : a)?.row.userId ?? '') ?? 'seseorang';
    addLog(work, a, { round: game.round, kind: 'LOVERS', targetId: b, text: `Kamu jatuh cinta dengan ${other(a)}.` });
    addLog(work, b, { round: game.round, kind: 'LOVERS', targetId: a, text: `Kamu jatuh cinta dengan ${other(b)}.` });
    for (const w of work.values()) {
      if (w.row.role === 'CUPID') addLog(work, w.row.id, { round: game.round, kind: 'NOTICE', text: `Kamu memasangkan ${other(a)} dan ${usernames.get(work.get(a)?.row.userId ?? '')}.` });
    }
  }
  state.lovers = result.lovers;
  state.doused = result.doused;
  applyDeaths(work, result.deaths, game.round);

  const deadIds = result.deaths.map((d) => d.playerId);
  await systemMessage(
    tx,
    game.id,
    deadIds.length === 0 ? 'Fajar menyingsing. Malam ini tenang, tidak ada korban.' : `Fajar menyingsing. Korban malam ini: ${names(work, usernames, deadIds)}.`,
  );

  const events: OutboundEvent[] = [];
  if (deadIds.length > 0) events.push({ channel: gameChannel(game.id), event: 'game:player_eliminated', payload: { gameId: game.id } });

  if (result.pendingRevenge.length > 0) {
    state.revenge = { pending: result.pendingRevenge, after: 'DAY' };
    await flush(tx, work);
    const endsAt = await moveTo(tx, game, 'ROLE_ACTION', state.settings, now, { state: state as unknown as Prisma.InputJsonValue });
    await systemMessage(tx, game.id, `${names(work, usernames, result.pendingRevenge)} punya satu tembakan terakhir...`);
    return [...events, ...phaseEvent(game.id, 'ROLE_ACTION', game.round, endsAt)];
  }
  if (result.win.over) return [...events, ...(await finishGame(tx, game, result.win, work, state, game.round, now))];

  await flush(tx, work);
  const endsAt = await moveTo(tx, game, 'DAY', state.settings, now, { state: state as unknown as Prisma.InputJsonValue });
  return [...events, ...phaseEvent(game.id, 'DAY', game.round, endsAt)];
}

async function resolveVotingPhase(tx: Tx, game: GameWithRows, state: StoredGameState, now: Date): Promise<OutboundEvent[]> {
  const work = toWork(game.players);
  const usernames = await usernameMap(tx, game.players);
  const votes = await tx.vote.findMany({ where: { gameId: game.id, round: game.round, voteRound: game.voteRound } });
  const voteList = votes.map((v) => ({ voterId: v.voterId, targetId: v.targetId }));
  const tally = GameResolutionEngine.tallyVotes(voteList);
  const events: OutboundEvent[] = [{ channel: gameChannel(game.id), event: 'game:vote_result', payload: { gameId: game.id } }];

  // Seri: REVOTE sekali; jika tetap seri -> NO_ELIMINATION.
  if (tally.leaders.length > 1 && game.voteRound === 1) {
    state.lastVoteResult = { round: game.round, voteRound: 1, votes: voteList, eliminatedId: null, outcome: 'TIE_REVOTE' };
    const endsAt = await moveTo(tx, game, 'VOTING', state.settings, now, { voteRound: 2, state: state as unknown as Prisma.InputJsonValue });
    await systemMessage(tx, game.id, `Hasil voting seri antara ${names(work, usernames, tally.leaders)}. Voting ulang!`);
    return [...events, ...phaseEvent(game.id, 'VOTING', game.round, endsAt)];
  }

  if (tally.leaders.length !== 1) {
    state.lastVoteResult = { round: game.round, voteRound: game.voteRound, votes: voteList, eliminatedId: null, outcome: 'NO_ELIMINATION' };
    await systemMessage(tx, game.id, tally.maxVotes === 0 ? 'Tidak ada yang memberi suara. Tidak ada yang digantung.' : 'Voting tetap seri. Tidak ada yang digantung hari ini.');
    const endsAt = await moveTo(tx, game, 'RESULT', state.settings, now, { state: state as unknown as Prisma.InputJsonValue });
    return [...events, ...phaseEvent(game.id, 'RESULT', game.round, endsAt)];
  }

  const eliminatedId = tally.leaders[0];
  state.lastVoteResult = { round: game.round, voteRound: game.voteRound, votes: voteList, eliminatedId, outcome: 'ELIMINATED' };
  const resolved = GameResolutionEngine.resolveDeaths(toEngine(work), [{ playerId: eliminatedId, reason: 'VOTE' }], { lovers: state.lovers });
  applyDeaths(work, resolved.deaths, game.round);
  await systemMessage(tx, game.id, `Warga memutuskan menggantung ${names(work, usernames, [eliminatedId])}.`);
  if (resolved.deaths.length > 1) {
    await systemMessage(tx, game.id, `Karena patah hati, ${names(work, usernames, resolved.deaths.slice(1).map((d) => d.playerId))} ikut meninggal.`);
  }
  events.push({ channel: gameChannel(game.id), event: 'game:player_eliminated', payload: { gameId: game.id } });

  if (resolved.pendingRevenge.length > 0) {
    state.revenge = { pending: resolved.pendingRevenge, after: 'RESULT' };
    await flush(tx, work);
    const endsAt = await moveTo(tx, game, 'ROLE_ACTION', state.settings, now, { state: state as unknown as Prisma.InputJsonValue });
    await systemMessage(tx, game.id, `${names(work, usernames, resolved.pendingRevenge)} punya satu tembakan terakhir...`);
    return [...events, ...phaseEvent(game.id, 'ROLE_ACTION', game.round, endsAt)];
  }
  const win = GameResolutionEngine.checkWin(toEngine(work), { lovers: state.lovers, settings: state.settings, round: game.round });
  if (win.over) return [...events, ...(await finishGame(tx, game, win, work, state, game.round, now))];

  await flush(tx, work);
  const endsAt = await moveTo(tx, game, 'RESULT', state.settings, now, { state: state as unknown as Prisma.InputJsonValue });
  return [...events, ...phaseEvent(game.id, 'RESULT', game.round, endsAt)];
}

async function resolveRevengePhase(tx: Tx, game: GameWithRows, state: StoredGameState, now: Date): Promise<OutboundEvent[]> {
  const work = toWork(game.players);
  const usernames = await usernameMap(tx, game.players);
  const pending = state.revenge?.pending ?? [];
  const after = state.revenge?.after ?? 'DAY';
  const rows = await tx.gameAction.findMany({ where: { gameId: game.id, round: game.round, type: 'REVENGE_KILL', actorId: { in: pending } } });
  const actions: EngineAction[] = rows.map((r) => ({ actorId: r.actorId, type: 'REVENGE_KILL', targetId: r.targetId, target2Id: r.target2Id }));
  const engineState: EngineState = { round: game.round, lovers: state.lovers, doused: state.doused, settings: state.settings };

  const result = GameResolutionEngine.resolveRevenge({ players: toEngine(work), actions, pending, state: engineState });
  consume(work, result.consumed);
  applyDeaths(work, result.deaths, game.round);
  const events: OutboundEvent[] = [];
  if (result.deaths.length > 0) {
    await systemMessage(tx, game.id, `Tembakan terakhir mengenai ${names(work, usernames, result.deaths.map((d) => d.playerId))}.`);
    events.push({ channel: gameChannel(game.id), event: 'game:player_eliminated', payload: { gameId: game.id } });
  } else {
    await systemMessage(tx, game.id, 'Tembakan terakhir tidak mengenai siapa pun.');
  }

  if (result.pendingRevenge.length > 0) {
    state.revenge = { pending: result.pendingRevenge, after };
    await flush(tx, work);
    const endsAt = await moveTo(tx, game, 'ROLE_ACTION', state.settings, now, { state: state as unknown as Prisma.InputJsonValue });
    return [...events, ...phaseEvent(game.id, 'ROLE_ACTION', game.round, endsAt)];
  }
  state.revenge = null;
  if (result.win.over) return [...events, ...(await finishGame(tx, game, result.win, work, state, game.round, now))];

  await flush(tx, work);
  const endsAt = await moveTo(tx, game, after, state.settings, now, { state: state as unknown as Prisma.InputJsonValue });
  return [...events, ...phaseEvent(game.id, after, game.round, endsAt)];
}

/** Memajukan fase yang sudah jatuh tempo (aman dipanggil berulang / konkuren). */
export async function advanceGameIfDue(gameId: string, now: Date = new Date()): Promise<boolean> {
  let advanced = false;
  for (let i = 0; i < MAX_CHAIN; i++) {
    const events = await prisma.$transaction((tx) => transition(tx, gameId, now), { timeout: 15_000, maxWait: 5_000 });
    if (!events) break;
    advanced = true;
    await emitAll(events);
  }
  return advanced;
}

export async function advanceAllDueGames(): Promise<number> {
  const due = await prisma.game.findMany({ where: { phase: { not: 'FINISHED' }, phaseEndsAt: { lte: new Date() } }, select: { id: true }, take: 100 });
  let count = 0;
  for (const g of due) if (await advanceGameIfDue(g.id)) count++;
  return count;
}

/* ------------------------------------------------------------------ */
/* Aksi, vote, chat                                                    */
/* ------------------------------------------------------------------ */

async function loadParticipant(gameId: string, userId: string) {
  const game = await prisma.game.findUnique({ where: { id: gameId }, include: { players: true, room: { select: { code: true, id: true } } } });
  if (!game) throw new AppError('NOT_FOUND', 'Game tidak ditemukan.');
  const me = game.players.find((p) => p.userId === userId) ?? null;
  return { game, me };
}

export async function submitAction(userId: string, gameId: string, input: { type: ActionType; targetIds: string[] }) {
  await advanceGameIfDue(gameId);
  const { game, me } = await loadParticipant(gameId, userId);
  if (!me) throw new AppError('FORBIDDEN', 'Kamu bukan pemain di game ini.');
  const state = game.state as unknown as StoredGameState;
  const work = toWork(game.players);
  const stage: 'NIGHT' | 'POST_DEATH' | null = game.phase === 'NIGHT' ? 'NIGHT' : game.phase === 'ROLE_ACTION' ? 'POST_DEATH' : null;
  if (!stage) throw new AppError('INVALID_PHASE', 'Aksi tidak bisa dilakukan pada fase ini.');
  if (stage === 'NIGHT' && me.status !== 'ALIVE') throw new AppError('FORBIDDEN', 'Pemain yang sudah mati tidak bisa beraksi.');

  const ctx: ValidationContext = {
    players: toEngine(work),
    state: { round: game.round, lovers: state.lovers, doused: state.doused, settings: state.settings },
    stage,
    pendingRevenge: state.revenge?.pending,
  };
  const ability = ROLES[me.role as RoleId].abilities.find((a) => a.type === input.type && a.stage === stage);
  if (!ability) throw new AppError('FORBIDDEN', 'Role kamu tidak punya kemampuan tersebut.');

  const where = { gameId_round_actorId_type: { gameId, round: game.round, actorId: me.id, type: input.type } };
  if (input.targetIds.length === 0 && ability.targetRules.count > 0) {
    await prisma.gameAction.deleteMany({ where: { gameId, round: game.round, actorId: me.id, type: input.type } });
  } else {
    const action: EngineAction = { actorId: me.id, type: input.type, targetId: input.targetIds[0] ?? null, target2Id: input.targetIds[1] ?? null };
    const check = validateAction(ctx, action);
    if (!check.ok) throw new AppError('VALIDATION_ERROR', check.reason);
    await prisma.$transaction(async (tx) => {
      if (ability.exclusiveWith?.length) {
        await tx.gameAction.deleteMany({ where: { gameId, round: game.round, actorId: me.id, type: { in: ability.exclusiveWith } } });
      }
      await tx.gameAction.upsert({
        where,
        update: { targetId: action.targetId, target2Id: action.target2Id },
        create: { gameId, round: game.round, actorId: me.id, type: input.type, targetId: action.targetId, target2Id: action.target2Id },
      });
    });
  }

  await emitAll([{ channel: userChannel(userId), event: 'game:action', payload: { gameId } }]);

  // Revenge: majukan segera bila semua hunter sudah memilih.
  if (stage === 'POST_DEATH' && state.revenge) {
    const done = await prisma.gameAction.count({ where: { gameId, round: game.round, type: 'REVENGE_KILL', actorId: { in: state.revenge.pending } } });
    if (done >= state.revenge.pending.length) {
      await prisma.game.update({ where: { id: gameId }, data: { phaseEndsAt: new Date() } });
      await advanceGameIfDue(gameId);
    }
  }
}

export async function submitVote(userId: string, gameId: string, targetPlayerId: string) {
  await advanceGameIfDue(gameId);
  const { game, me } = await loadParticipant(gameId, userId);
  if (!me) throw new AppError('FORBIDDEN', 'Hanya pemain yang bisa voting (spectator tidak bisa).');
  if (game.phase !== 'VOTING') throw new AppError('INVALID_PHASE', 'Voting hanya bisa dilakukan saat fase voting.');
  if (me.status !== 'ALIVE') throw new AppError('FORBIDDEN', 'Pemain yang sudah mati tidak bisa voting.');
  if (!ROLES[me.role as RoleId].canVote) throw new AppError('FORBIDDEN', 'Kamu tidak punya hak suara.');
  const target = game.players.find((p) => p.id === targetPlayerId);
  if (!target) throw new AppError('VALIDATION_ERROR', 'Target tidak ada di game ini.');
  if (target.status !== 'ALIVE') throw new AppError('VALIDATION_ERROR', 'Target sudah mati.');
  try {
    await prisma.vote.create({ data: { gameId, round: game.round, voteRound: game.voteRound, voterId: me.id, targetId: target.id } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new AppError('CONFLICT', 'Kamu sudah memberikan suara.');
    throw e;
  }
  await emitAll([{ channel: gameChannel(gameId), event: 'game:vote', payload: { gameId } }]);

  const aliveVoters = game.players.filter((p) => p.status === 'ALIVE' && ROLES[p.role as RoleId].canVote).length;
  const cast = await prisma.vote.count({ where: { gameId, round: game.round, voteRound: game.voteRound } });
  if (cast >= aliveVoters) {
    await prisma.game.updateMany({ where: { id: gameId, phase: 'VOTING', voteRound: game.voteRound }, data: { phaseEndsAt: new Date() } });
    await advanceGameIfDue(gameId);
  }
}

export async function toViewer(gameId: string, userId: string): Promise<{ viewer: Viewer; game: GameWithRows; meId: string | null }> {
  const game = await prisma.game.findUnique({ where: { id: gameId }, include: { players: true, room: true } });
  if (!game) throw new AppError('NOT_FOUND', 'Game tidak ditemukan.');
  const me = game.players.find((p) => p.userId === userId);
  if (me) {
    const state = game.state as unknown as StoredGameState;
    const isLover = Boolean(state.lovers?.includes(me.id));
    return { viewer: { kind: 'player', alive: me.status === 'ALIVE', role: me.role as RoleId, isLover }, game, meId: me.id };
  }
  const spectator = await prisma.roomSpectator.findUnique({ where: { roomId_userId: { roomId: game.roomId, userId } } });
  if (!spectator) throw new AppError('FORBIDDEN', 'Kamu bukan peserta atau penonton game ini.');
  return { viewer: { kind: 'spectator', alive: false, role: null, isLover: false }, game, meId: null };
}

export async function sendChat(userId: string, gameId: string, channel: ChatChannelId, rawContent: string) {
  await advanceGameIfDue(gameId);
  const { viewer, game, meId } = await toViewer(gameId, userId);
  const content = sanitizeText(rawContent, 300);
  if (content.length === 0) throw new AppError('VALIDATION_ERROR', 'Pesan tidak boleh kosong.');
  if (!canSend(channel, viewer, game.phase as PhaseId)) {
    throw new AppError('FORBIDDEN', 'Kamu tidak boleh mengirim pesan di channel ini pada fase ini.');
  }
  const state = game.state as unknown as StoredGameState;
  const message = await prisma.chatMessage.create({
    data: { gameId, userId, channel, content, audienceKey: channel === 'ROLE' ? 'LOVERS' : null },
  });

  // Event hanya sinyal. Channel privat dikirim per-user ke audiens yang berhak.
  const events: OutboundEvent[] = [];
  if (channel === 'PUBLIC') {
    events.push({ channel: gameChannel(gameId), event: 'chat:message', payload: { gameId, channel: 'PUBLIC' } });
  } else {
    let audience: string[] = [];
    if (channel === 'WEREWOLF') audience = game.players.filter((p) => ROLES[p.role as RoleId].team === 'WEREWOLF').map((p) => p.userId);
    if (channel === 'ROLE') audience = game.players.filter((p) => state.lovers?.includes(p.id)).map((p) => p.userId);
    if (channel === 'SPECTATOR') {
      const specs = await prisma.roomSpectator.findMany({ where: { roomId: game.roomId }, select: { userId: true } });
      audience = specs.map((s) => s.userId);
    }
    for (const uid of audience) {
      events.push({ channel: userChannel(uid), event: 'chat:private_message', payload: { gameId, channel } });
    }
  }
  void meId;
  await emitAll(events);
  return { id: message.id };
}
