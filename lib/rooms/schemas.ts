import { z } from 'zod';
import { GAME_MODES, MAX_PLAYERS_LIMIT, MIN_PLAYERS_LIMIT } from '@/lib/game/constants';
import { roomSettingsSchema } from '@/lib/game/settings';

export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^WOLF-[A-Z0-9]{5}$/, 'Format Room ID tidak valid (contoh: WOLF-7X9K2)');

const players = (label: string) =>
  z.number({ invalid_type_error: `${label} harus angka` }).int().min(MIN_PLAYERS_LIMIT, `${label} minimal ${MIN_PLAYERS_LIMIT}`).max(MAX_PLAYERS_LIMIT, `${label} maksimal ${MAX_PLAYERS_LIMIT}`);

export const createRoomSchema = z
  .object({
    minPlayers: players('Minimum pemain'),
    maxPlayers: players('Maksimum pemain'),
    gameMode: z.enum(GAME_MODES).default('CLASSIC'),
    visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
    allowSpectators: z.boolean().default(true),
    roleConfig: z.record(z.string(), z.number()).optional(),
    settings: roomSettingsSchema.optional(),
  })
  .refine((v) => v.minPlayers <= v.maxPlayers, { path: ['minPlayers'], message: 'Minimum pemain tidak boleh lebih besar dari maksimum' });

export const updateRoomSchema = z
  .object({
    minPlayers: players('Minimum pemain'),
    maxPlayers: players('Maksimum pemain'),
    gameMode: z.enum(GAME_MODES),
    visibility: z.enum(['PUBLIC', 'PRIVATE']),
    allowSpectators: z.boolean(),
    roleConfig: z.record(z.string(), z.number()),
    settings: roomSettingsSchema,
  })
  .refine((v) => v.minPlayers <= v.maxPlayers, { path: ['minPlayers'], message: 'Minimum pemain tidak boleh lebih besar dari maksimum' });

export const readySchema = z.object({ ready: z.boolean() });
export const kickSchema = z.object({ userId: z.string().min(1) });
