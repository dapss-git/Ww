import { describe, expect, it } from 'vitest';
import { computeRoomAccess } from '@/lib/rooms/rules';
import { canRead, canSend, readableChannels, type Viewer } from '@/lib/game/permissions';
import { sanitizeText } from '@/lib/security/sanitize';
import { loginSchema, registerSchema } from '@/lib/auth/schemas';

const room = { playerCount: 3, maxPlayers: 6, allowSpectators: true, isPlayer: false, isSpectator: false };

describe('aturan join/spectate room', () => {
  it('WAITING belum penuh -> JOIN', () => expect(computeRoomAccess({ ...room, status: 'WAITING' })).toMatchObject({ canJoin: true, action: 'JOIN' }));
  it('WAITING penuh -> SPECTATE', () => expect(computeRoomAccess({ ...room, status: 'WAITING', playerCount: 6 })).toMatchObject({ canJoin: false, canSpectate: true, action: 'SPECTATE' }));
  it('STARTING / IN_PROGRESS -> hanya SPECTATE', () => {
    for (const status of ['STARTING', 'IN_PROGRESS'] as const) {
      expect(computeRoomAccess({ ...room, status })).toMatchObject({ canJoin: false, canSpectate: true });
    }
  });
  it('spectator dinonaktifkan host -> tidak bisa spectate', () => expect(computeRoomAccess({ ...room, status: 'IN_PROGRESS', allowSpectators: false }).canSpectate).toBe(false));
  it('FINISHED dan CLOSED tidak bisa join/spectate', () => {
    expect(computeRoomAccess({ ...room, status: 'FINISHED' })).toMatchObject({ canJoin: false, canSpectate: false, action: 'FINISHED' });
    expect(computeRoomAccess({ ...room, status: 'CLOSED' })).toMatchObject({ canJoin: false, canSpectate: false, action: 'CLOSED' });
  });
  it('pemain yang sudah di room -> RETURN', () => expect(computeRoomAccess({ ...room, status: 'IN_PROGRESS', isPlayer: true }).action).toBe('RETURN'));
});

const wolf: Viewer = { kind: 'player', alive: true, role: 'WEREWOLF', isLover: false };
const villager: Viewer = { kind: 'player', alive: true, role: 'VILLAGER', isLover: false };
const dead: Viewer = { kind: 'player', alive: false, role: 'VILLAGER', isLover: false };
const spectator: Viewer = { kind: 'spectator', alive: false, role: null, isLover: false };

describe('permission chat (server-side)', () => {
  it('serigala hanya chat WEREWOLF saat malam', () => {
    expect(canSend('WEREWOLF', wolf, 'NIGHT')).toBe(true);
    expect(canSend('WEREWOLF', wolf, 'DISCUSSION')).toBe(false);
    expect(canSend('WEREWOLF', villager, 'NIGHT')).toBe(false);
  });
  it('chat publik hanya untuk pemain hidup saat siang', () => {
    expect(canSend('PUBLIC', villager, 'DISCUSSION')).toBe(true);
    expect(canSend('PUBLIC', villager, 'NIGHT')).toBe(false);
    expect(canSend('PUBLIC', dead, 'DISCUSSION')).toBe(false);
    expect(canSend('PUBLIC', spectator, 'DISCUSSION')).toBe(false);
  });
  it('spectator tidak bisa membaca channel rahasia dan hanya bisa chat SPECTATOR', () => {
    expect(readableChannels(spectator, 'NIGHT')).toEqual(['PUBLIC', 'SPECTATOR']);
    expect(canRead('WEREWOLF', spectator, 'FINISHED')).toBe(false);
    expect(canSend('SPECTATOR', spectator, 'DISCUSSION')).toBe(true);
    expect(canSend('SPECTATOR', villager, 'DISCUSSION')).toBe(false);
  });
  it('warga biasa tidak bisa membaca chat serigala', () => expect(canRead('WEREWOLF', villager, 'NIGHT')).toBe(false));
});

describe('sanitasi dan validasi', () => {
  it('menghapus tag HTML dan karakter tak terlihat', () => {
    expect(sanitizeText('<script>alert(1)</script>halo\u202E  dunia', 100)).toBe('alert(1)halo dunia');
  });
  it('membatasi panjang', () => expect(sanitizeText('a'.repeat(500), 300)).toHaveLength(300));
  it('register: username dinormalisasi dan password harus kuat', () => {
    const ok = registerSchema.parse({ username: '  Dafa_01 ', password: 'Abcdef12', confirmPassword: 'Abcdef12' });
    expect(ok.username).toBe('dafa_01');
    expect(registerSchema.safeParse({ username: 'ab', password: 'Abcdef12', confirmPassword: 'Abcdef12' }).success).toBe(false);
    expect(registerSchema.safeParse({ username: 'valid_user', password: 'lemah', confirmPassword: 'lemah' }).success).toBe(false);
    expect(registerSchema.safeParse({ username: 'valid_user', password: 'Abcdef12', confirmPassword: 'Beda1234' }).success).toBe(false);
    expect(registerSchema.safeParse({ username: 'bad name!', password: 'Abcdef12', confirmPassword: 'Abcdef12' }).success).toBe(false);
  });
  it('login memakai default remember=false', () => expect(loginSchema.parse({ username: 'A', password: 'x' }).remember).toBe(false));
});
