import { ROLES, findAbility } from '@/lib/roles/registry';
import type { AbilityDef } from '@/lib/roles/types';
import type { ActionType, DeathReason, TeamId } from '../constants';
import type { GameSettings } from '../settings';
import type {
  Death,
  DeathResolution,
  EngineAction,
  EnginePlayer,
  EngineState,
  Inspection,
  NightResolution,
  WinResult,
} from './types';
import { validateAction, type ValidationContext } from './validate';

interface Kill {
  targetId: string;
  reason: DeathReason;
  killerId?: string;
  ability: AbilityDef;
  priority: number;
}

const clonePlayers = (players: EnginePlayer[]): EnginePlayer[] =>
  players.map((p) => ({ ...p, usesLeft: { ...p.usesLeft }, lastTargets: { ...p.lastTargets } }));

/**
 * GameResolutionEngine: deterministik, murni (tanpa React/UI/realtime/database).
 * Pipeline malam:
 * COLLECT -> LOCK -> VALIDATE -> RESOLVE CONFLICTS -> APPLY EFFECTS -> DEATH RESOLUTION -> WIN CHECK
 */
export class GameResolutionEngine {
  static resolveNight(input: { players: EnginePlayer[]; actions: EngineAction[]; state: EngineState }): NightResolution {
    // 1. COLLECT
    const collected = [...input.actions];

    // 2. LOCK: snapshot beku, aksi baru tidak memengaruhi resolusi.
    const players = clonePlayers(input.players);
    const state: EngineState = { ...input.state, lovers: input.state.lovers, doused: [...input.state.doused] };
    const ctx: ValidationContext = { players, state, stage: 'NIGHT' };
    const byId = new Map(players.map((p) => [p.id, p]));

    // 3. VALIDATE (aksi terakhir per aktor+tipe yang menang)
    const latest = new Map<string, EngineAction>();
    for (const action of collected) {
      if (validateAction(ctx, action).ok) latest.set(`${action.actorId}|${action.type}`, action);
    }
    const valid = [...latest.values()];
    const priorityOf = (a: EngineAction) => ROLES[byId.get(a.actorId)!.role].priority;
    const ordered = [...valid].sort((a, b) => priorityOf(a) - priorityOf(b) || a.actorId.localeCompare(b.actorId));

    // 4. RESOLVE CONFLICTS
    const protectedIds = new Set<string>();
    const healedIds = new Set<string>();
    const kills: Kill[] = [];
    const attackVotes: EngineAction[] = [];

    for (const action of ordered) {
      const actor = byId.get(action.actorId)!;
      const ability = findAbility(actor.role, action.type, 'NIGHT')!;
      if (action.type === 'PROTECT' && action.targetId) protectedIds.add(action.targetId);
      if (action.type === 'HEAL' && action.targetId) healedIds.add(action.targetId);
      if (action.type === 'POISON' && action.targetId) {
        kills.push({ targetId: action.targetId, reason: 'POISON', killerId: actor.id, ability, priority: ROLES[actor.role].priority });
      }
      if (action.type === 'KILL' && action.targetId) {
        kills.push({ targetId: action.targetId, reason: 'SERIAL_KILL', killerId: actor.id, ability, priority: ROLES[actor.role].priority });
      }
      if (action.type === 'IGNITE') {
        for (const id of state.doused) {
          kills.push({ targetId: id, reason: 'IGNITE', killerId: actor.id, ability, priority: ROLES[actor.role].priority });
        }
      }
    }

    // Tally serangan serigala: suara terbanyak; seri dipecahkan oleh aksi yang masuk paling awal.
    for (const action of valid) {
      const actor = byId.get(action.actorId)!;
      const ability = findAbility(actor.role, action.type, 'NIGHT')!;
      if (ability.tally === 'WEREWOLF_PACK' && action.targetId) attackVotes.push(action);
    }
    let attackTargetId: string | null = null;
    if (attackVotes.length > 0) {
      const counts = new Map<string, number>();
      for (const v of attackVotes) counts.set(v.targetId!, (counts.get(v.targetId!) ?? 0) + 1);
      let best = 0;
      for (const [target, count] of counts) {
        if (count > best) {
          best = count;
          attackTargetId = target;
        }
      }
      const firstVoter = byId.get(attackVotes[0].actorId)!;
      kills.push({
        targetId: attackTargetId!,
        reason: 'WEREWOLF_ATTACK',
        killerId: firstVoter.id,
        ability: findAbility(firstVoter.role, 'ATTACK', 'NIGHT')!,
        priority: ROLES[firstVoter.role].priority,
      });
    }
    kills.sort((a, b) => a.priority - b.priority);

    // 5. APPLY EFFECTS
    let lovers = state.lovers;
    const newlyDoused: string[] = [];
    const consumed: NightResolution['consumed'] = [];
    const lastTargets: NightResolution['lastTargets'] = [];
    const inspections: Inspection[] = [];

    for (const action of ordered) {
      const actor = byId.get(action.actorId)!;
      const ability = findAbility(actor.role, action.type, 'NIGHT')!;
      if (ability.usesPerGame !== undefined) consumed.push({ actorId: actor.id, type: action.type });
      if (ability.targetRules.noRepeatTarget && action.targetId) {
        lastTargets.push({ actorId: actor.id, type: action.type, targetId: action.targetId });
      }
      if (action.type === 'LINK' && action.targetId && action.target2Id) lovers = [action.targetId, action.target2Id];
      if (action.type === 'DOUSE' && action.targetId) newlyDoused.push(action.targetId);
      if (action.type === 'INSPECT' && action.targetId) {
        inspections.push({ actorId: actor.id, kind: 'INSPECT', targetId: action.targetId, team: byId.get(action.targetId)!.team });
      }
      if (action.type === 'TRACK' && action.targetId) {
        const visited = new Set<string>();
        for (const other of valid) {
          if (other.actorId !== action.targetId) continue;
          for (const id of [other.targetId, other.target2Id]) if (id) visited.add(id);
        }
        inspections.push({ actorId: actor.id, kind: 'TRACK', targetId: action.targetId, visited: [...visited] });
      }
    }
    const doused = [...state.doused, ...newlyDoused];

    const saved: NightResolution['saved'] = [];
    const primary: Death[] = [];
    for (const kill of kills) {
      const target = byId.get(kill.targetId);
      if (!target || !target.alive) continue;
      if (kill.ability.blockedByProtection && protectedIds.has(target.id)) {
        saved.push({ playerId: target.id, by: 'PROTECT' });
        continue;
      }
      if (kill.ability.blockedByImmunity && ROLES[target.role].nightImmune) continue;
      if (kill.reason === 'WEREWOLF_ATTACK' && healedIds.has(target.id)) {
        saved.push({ playerId: target.id, by: 'HEAL' });
        continue;
      }
      primary.push({ playerId: target.id, reason: kill.reason, killerId: kill.killerId });
    }

    // 6. DEATH RESOLUTION (lovers chain diproses setelah semua kill utama)
    const resolved = GameResolutionEngine.resolveDeaths(players, primary, { lovers });

    // 7. WIN CHECK (ditunda jika masih ada revenge kill)
    const win =
      resolved.pendingRevenge.length > 0
        ? { over: false, winners: [] as string[] }
        : GameResolutionEngine.checkWin(resolved.players, { lovers, settings: state.settings, round: state.round });

    return { ...resolved, inspections, saved, attackTargetId, consumed, lastTargets, lovers, doused, newlyDoused, win };
  }

  static resolveDeaths(
    players: EnginePlayer[],
    primary: Death[],
    state: { lovers: [string, string] | null },
  ): DeathResolution {
    const alive = new Map(players.map((p) => [p.id, p.alive]));
    const deaths: Death[] = [];
    const add = (death: Death) => {
      if (!alive.get(death.playerId)) return;
      alive.set(death.playerId, false);
      deaths.push(death);
    };
    for (const death of primary) add(death);

    if (state.lovers) {
      const [a, b] = state.lovers;
      let changed = true;
      while (changed) {
        changed = false;
        if (alive.get(a) === false && alive.get(b)) {
          add({ playerId: b, reason: 'HEARTBREAK' });
          changed = true;
        } else if (alive.get(b) === false && alive.get(a)) {
          add({ playerId: a, reason: 'HEARTBREAK' });
          changed = true;
        }
      }
    }

    const byId = new Map(players.map((p) => [p.id, p]));
    const pendingRevenge = deaths
      .filter((d) => {
        const p = byId.get(d.playerId);
        if (!p) return false;
        const ability = findAbility(p.role, 'REVENGE_KILL', 'POST_DEATH');
        if (!ability) return false;
        return (p.usesLeft[ability.type] ?? ability.usesPerGame ?? 1) > 0;
      })
      .map((d) => d.playerId);

    return { deaths, pendingRevenge, players: players.map((p) => ({ ...p, alive: alive.get(p.id) ?? p.alive })) };
  }

  static resolveRevenge(input: {
    players: EnginePlayer[];
    actions: EngineAction[];
    pending: string[];
    state: EngineState;
  }): DeathResolution & { consumed: { actorId: string; type: ActionType }[]; win: WinResult } {
    const ctx: ValidationContext = { players: input.players, state: input.state, stage: 'POST_DEATH', pendingRevenge: input.pending };
    const primary: Death[] = [];
    const consumed: { actorId: string; type: ActionType }[] = [];
    for (const hunterId of input.pending) {
      consumed.push({ actorId: hunterId, type: 'REVENGE_KILL' });
      const action = [...input.actions].reverse().find((a) => a.actorId === hunterId && a.type === 'REVENGE_KILL');
      if (action && validateAction(ctx, action).ok && action.targetId) {
        primary.push({ playerId: action.targetId, reason: 'REVENGE', killerId: hunterId });
      }
    }
    const resolved = GameResolutionEngine.resolveDeaths(input.players, primary, { lovers: input.state.lovers });
    const win =
      resolved.pendingRevenge.length > 0
        ? { over: false, winners: [] as string[] }
        : GameResolutionEngine.checkWin(resolved.players, {
            lovers: input.state.lovers,
            settings: input.state.settings,
            round: input.state.round,
          });
    return { ...resolved, consumed, win };
  }

  static tallyVotes(votes: { voterId: string; targetId: string }[]): {
    counts: Record<string, number>;
    leaders: string[];
    maxVotes: number;
  } {
    const counts: Record<string, number> = {};
    for (const v of votes) counts[v.targetId] = (counts[v.targetId] ?? 0) + 1;
    const maxVotes = Math.max(0, ...Object.values(counts));
    const leaders = maxVotes === 0 ? [] : Object.keys(counts).filter((id) => counts[id] === maxVotes).sort();
    return { counts, leaders, maxVotes };
  }

  static checkWin(
    players: EnginePlayer[],
    state: { lovers: [string, string] | null; settings: GameSettings; round: number },
  ): WinResult {
    const alive = players.filter((p) => p.alive);
    if (alive.length === 0) return { over: true, team: 'NEUTRAL', label: 'DRAW', winners: [] };

    const wolves = alive.filter((p) => p.team === 'WEREWOLF').length;
    const solos = alive.filter((p) => p.team === 'SOLO');
    const others = alive.length - wolves;
    const teamWinners = (team: TeamId) => players.filter((p) => p.team === team).map((p) => p.id);

    if (state.lovers && state.settings.loversWinAlone && alive.length === 2) {
      const [a, b] = state.lovers;
      const ids = alive.map((p) => p.id);
      if (ids.includes(a) && ids.includes(b) && alive[0].team !== alive[1].team) {
        return { over: true, team: 'NEUTRAL', label: 'LOVERS', winners: [a, b] };
      }
    }
    if (wolves === 0 && solos.length === 0) {
      return { over: true, team: 'VILLAGE', label: 'VILLAGE', winners: teamWinners('VILLAGE') };
    }
    if (solos.length > 0 && alive.length === 1) {
      return { over: true, team: 'SOLO', label: 'SOLO', winners: [solos[0].id] };
    }
    if (solos.length === 0 && wolves > 0) {
      const wolfWin = state.settings.winMode === 'MAJORITY' ? wolves > others : wolves >= others;
      if (wolfWin) return { over: true, team: 'WEREWOLF', label: 'WEREWOLF', winners: teamWinners('WEREWOLF') };
    }
    if (state.round >= state.settings.maxRounds) return { over: true, team: 'NEUTRAL', label: 'DRAW', winners: [] };
    return { over: false, winners: [] };
  }
}
