import { ROLES, findAbility } from '@/lib/roles/registry';
import type { AbilityDef } from '@/lib/roles/types';
import type { ActionType } from '../constants';
import type { EngineAction, EnginePlayer, EngineState } from './types';

export type ValidationResult = { ok: true } | { ok: false; reason: string };

export interface ValidationContext {
  players: EnginePlayer[];
  state: EngineState;
  stage: AbilityDef['stage'];
  /** Untuk stage POST_DEATH: id pemain yang sedang menunggu aksi balas dendam. */
  pendingRevenge?: string[];
}

const fail = (reason: string): ValidationResult => ({ ok: false, reason });

export function usesLeftFor(player: EnginePlayer, ability: AbilityDef): number | null {
  if (ability.usesPerGame === undefined) return null;
  return player.usesLeft[ability.type] ?? ability.usesPerGame;
}

function allowSelf(ability: AbilityDef, state: EngineState): boolean {
  const rules = ability.targetRules;
  return rules.selfSetting ? state.settings[rules.selfSetting] : rules.allowSelf;
}

/** Mengembalikan alasan penolakan, atau null jika target valid. */
export function checkTarget(
  ctx: ValidationContext,
  actor: EnginePlayer,
  ability: AbilityDef,
  targetId: string,
): string | null {
  const target = ctx.players.find((p) => p.id === targetId);
  if (!target) return 'Target tidak ditemukan';
  if (!target.alive) return 'Target sudah mati';
  const rules = ability.targetRules;
  if (target.id === actor.id && !allowSelf(ability, ctx.state)) return 'Tidak boleh menargetkan diri sendiri';
  if (rules.excludeTeams?.includes(target.team)) return 'Target tidak valid untuk kemampuan ini';
  if (rules.noRepeatTarget && actor.lastTargets[ability.type] === target.id) {
    return 'Tidak boleh memilih target yang sama dua malam berturut-turut';
  }
  if (rules.requireUndoused && ctx.state.doused.includes(target.id)) return 'Target sudah disiram';
  return null;
}

export function abilityAvailable(ctx: ValidationContext, actor: EnginePlayer, ability: AbilityDef): string | null {
  if (ability.stage !== ctx.stage) return 'Kemampuan tidak bisa dipakai di fase ini';
  if (ctx.stage === 'NIGHT' && !actor.alive) return 'Pemain sudah mati';
  if (ctx.stage === 'POST_DEATH') {
    if (actor.alive) return 'Pemain masih hidup';
    if (!ctx.pendingRevenge?.includes(actor.id)) return 'Tidak ada aksi yang menunggu';
  }
  const left = usesLeftFor(actor, ability);
  if (left !== null && left <= 0) return 'Kemampuan sudah habis dipakai';
  if (ability.firstNightOnly && ctx.state.round !== 1) return 'Hanya bisa dipakai di malam pertama';
  if (ability.targetRules.requireDoused) {
    const anyDoused = ctx.state.doused.some((id) => ctx.players.find((p) => p.id === id)?.alive);
    if (!anyDoused) return 'Belum ada target yang disiram';
  }
  return null;
}

export function validateAction(ctx: ValidationContext, action: EngineAction): ValidationResult {
  const actor = ctx.players.find((p) => p.id === action.actorId);
  if (!actor) return fail('Pemain tidak ditemukan');
  const ability = findAbility(actor.role, action.type, ctx.stage);
  if (!ability) return fail('Role ini tidak punya kemampuan tersebut');
  const unavailable = abilityAvailable(ctx, actor, ability);
  if (unavailable) return fail(unavailable);

  const ids = [action.targetId, action.target2Id].filter((v): v is string => typeof v === 'string' && v.length > 0);
  if (ids.length !== ability.targetRules.count) {
    return fail(`Kemampuan ini membutuhkan ${ability.targetRules.count} target`);
  }
  if (new Set(ids).size !== ids.length) return fail('Target harus berbeda');
  for (const id of ids) {
    const problem = checkTarget(ctx, actor, ability, id);
    if (problem) return fail(problem);
  }
  return { ok: true };
}

export interface AvailableAbility {
  ability: AbilityDef;
  candidates: string[];
  usesLeft: number | null;
}

/** Daftar kemampuan yang bisa dipakai pemain saat ini beserta kandidat targetnya. */
export function listAvailableAbilities(ctx: ValidationContext, playerId: string): AvailableAbility[] {
  const actor = ctx.players.find((p) => p.id === playerId);
  if (!actor) return [];
  const result: AvailableAbility[] = [];
  for (const ability of ROLES[actor.role].abilities) {
    if (abilityAvailable(ctx, actor, ability)) continue;
    const candidates =
      ability.targetRules.count === 0
        ? []
        : ctx.players.filter((p) => checkTarget(ctx, actor, ability, p.id) === null).map((p) => p.id);
    if (ability.targetRules.count > 0 && candidates.length < ability.targetRules.count) continue;
    result.push({ ability, candidates, usesLeft: usesLeftFor(actor, ability) });
  }
  return result;
}

export function isActionType(value: string): value is ActionType {
  return [
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
  ].includes(value);
}
