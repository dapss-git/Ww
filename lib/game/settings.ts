import { z } from 'zod';
import type { GameMode, PhaseId } from './constants';

export type DurationKey = 'STARTING' | 'ROLE_REVEAL' | 'DAY' | 'DISCUSSION' | 'VOTING' | 'NIGHT' | 'RESULT' | 'ROLE_ACTION';

export interface GameSettings {
  durations: Record<DurationKey, number>;
  guardianSelfProtect: boolean;
  doctorSelfProtect: boolean;
  revealRolesOnDeath: boolean;
  loversWinAlone: boolean;
  maxRounds: number;
  winMode: 'PARITY' | 'MAJORITY';
}

export const DEFAULT_DURATIONS: Record<DurationKey, number> = {
  STARTING: 5,
  ROLE_REVEAL: 10,
  DAY: 60,
  DISCUSSION: 120,
  VOTING: 30,
  NIGHT: 60,
  RESULT: 8,
  ROLE_ACTION: 20,
};

/** Pengaturan yang boleh diubah host. */
export const roomSettingsSchema = z
  .object({
    durations: z
      .object({
        ROLE_REVEAL: z.number().int().min(5).max(60).default(10),
        DAY: z.number().int().min(10).max(180).default(60),
        DISCUSSION: z.number().int().min(15).max(300).default(120),
        VOTING: z.number().int().min(10).max(120).default(30),
        NIGHT: z.number().int().min(15).max(180).default(60),
      })
      .default({}),
    guardianSelfProtect: z.boolean().default(false),
    doctorSelfProtect: z.boolean().default(true),
    revealRolesOnDeath: z.boolean().default(false),
    loversWinAlone: z.boolean().default(false),
    maxRounds: z.number().int().min(5).max(60).default(30),
  })
  .default({});

export type RoomSettingsInput = z.infer<typeof roomSettingsSchema>;

export function defaultRoomSettings(): RoomSettingsInput {
  return roomSettingsSchema.parse({});
}

export function resolveSettings(raw: unknown, gameMode: GameMode | string): GameSettings {
  const parsed = roomSettingsSchema.safeParse(raw ?? {});
  const base = parsed.success ? parsed.data : defaultRoomSettings();
  return {
    durations: { ...DEFAULT_DURATIONS, ...base.durations },
    guardianSelfProtect: base.guardianSelfProtect,
    doctorSelfProtect: base.doctorSelfProtect,
    revealRolesOnDeath: base.revealRolesOnDeath,
    loversWinAlone: base.loversWinAlone,
    maxRounds: base.maxRounds,
    winMode: gameMode === 'MAJORITY' ? 'MAJORITY' : 'PARITY',
  };
}

export function phaseDuration(settings: GameSettings, phase: PhaseId): number {
  const key = phase as DurationKey;
  return settings.durations[key] ?? 10;
}
