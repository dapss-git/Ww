import type { RoleId, TeamId } from '@/lib/game/constants';
import type { EnginePlayer, EngineState } from '@/lib/game/engine/types';
import { resolveSettings } from '@/lib/game/settings';
import { ROLES } from '@/lib/roles/registry';

export function player(id: string, role: RoleId, alive = true): EnginePlayer {
  const def = ROLES[role];
  const usesLeft: Record<string, number> = {};
  for (const a of def.abilities) if (a.usesPerGame !== undefined) usesLeft[a.type] = a.usesPerGame;
  return { id, role, team: def.team as TeamId, alive, usesLeft, lastTargets: {} };
}

export function state(overrides: Partial<EngineState> = {}): EngineState {
  return { round: 2, lovers: null, doused: [], settings: resolveSettings({}, 'CLASSIC'), ...overrides };
}
