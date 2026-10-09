import { describe, expect, it } from 'vitest';
import { GameResolutionEngine } from '@/lib/game/engine/resolution';
import type { EngineAction } from '@/lib/game/engine/types';
import { player, state } from './helpers';

const act = (actorId: string, type: EngineAction['type'], targetId: string | null, target2Id: string | null = null): EngineAction => ({ actorId, type, targetId, target2Id });
const base = () => [player('w1', 'WEREWOLF'), player('g', 'GUARDIAN'), player('wi', 'WITCH'), player('s', 'SEER'), player('v1', 'VILLAGER'), player('v2', 'VILLAGER')];

describe('GameResolutionEngine.resolveNight', () => {
  it('Werewolf Attack + Guardian Protect = target selamat', () => {
    const r = GameResolutionEngine.resolveNight({ players: base(), actions: [act('w1', 'ATTACK', 'v1'), act('g', 'PROTECT', 'v1')], state: state() });
    expect(r.deaths).toHaveLength(0);
    expect(r.saved).toEqual([{ playerId: 'v1', by: 'PROTECT' }]);
  });

  it('Werewolf Attack + Witch Heal = target selamat', () => {
    const r = GameResolutionEngine.resolveNight({ players: base(), actions: [act('w1', 'ATTACK', 'v1'), act('wi', 'HEAL', 'v1')], state: state() });
    expect(r.deaths).toHaveLength(0);
    expect(r.consumed).toContainEqual({ actorId: 'wi', type: 'HEAL' });
  });

  it('Witch Poison + Guardian Protect = target mati', () => {
    const r = GameResolutionEngine.resolveNight({ players: base(), actions: [act('wi', 'POISON', 'v1'), act('g', 'PROTECT', 'v1')], state: state() });
    expect(r.deaths.map((d) => d.playerId)).toEqual(['v1']);
    expect(r.deaths[0].reason).toBe('POISON');
  });

  it('Witch Heal + Poison pada target sama = poison menang', () => {
    const r = GameResolutionEngine.resolveNight({ players: base(), actions: [act('wi', 'HEAL', 'v1'), act('wi', 'POISON', 'v1')], state: state() });
    expect(r.deaths.map((d) => d.playerId)).toEqual(['v1']);
  });

  it('Guardian tidak boleh melindungi diri sendiri secara default', () => {
    const r = GameResolutionEngine.resolveNight({ players: base(), actions: [act('w1', 'ATTACK', 'g'), act('g', 'PROTECT', 'g')], state: state() });
    expect(r.deaths.map((d) => d.playerId)).toEqual(['g']);
  });

  it('serigala tidak bisa menyerang sesama serigala dan aksi pemain mati diabaikan', () => {
    const players = [...base(), player('w2', 'WEREWOLF'), player('dead', 'SEER', false)];
    const r = GameResolutionEngine.resolveNight({ players, actions: [act('w1', 'ATTACK', 'w2'), act('dead', 'INSPECT', 'v1')], state: state() });
    expect(r.deaths).toHaveLength(0);
    expect(r.inspections).toHaveLength(0);
  });

  it('suara serigala terbanyak menentukan korban', () => {
    const players = [...base(), player('w2', 'WEREWOLF'), player('w3', 'WEREWOLF')];
    const r = GameResolutionEngine.resolveNight({ players, actions: [act('w1', 'ATTACK', 'v1'), act('w2', 'ATTACK', 'v2'), act('w3', 'ATTACK', 'v2')], state: state() });
    expect(r.attackTargetId).toBe('v2');
    expect(r.deaths.map((d) => d.playerId)).toEqual(['v2']);
  });

  it('Seer mendapat tim target dan Tracker melihat kunjungan', () => {
    const players = [...base(), player('t', 'TRACKER')];
    const r = GameResolutionEngine.resolveNight({ players, actions: [act('s', 'INSPECT', 'w1'), act('t', 'TRACK', 'g'), act('g', 'PROTECT', 'v1')], state: state() });
    expect(r.inspections.find((i) => i.kind === 'INSPECT')?.team).toBe('WEREWOLF');
    expect(r.inspections.find((i) => i.kind === 'TRACK')?.visited).toEqual(['v1']);
  });

  it('Witch tidak bisa memakai ramuan dua kali', () => {
    const players = base();
    players.find((p) => p.id === 'wi')!.usesLeft.POISON = 0;
    const r = GameResolutionEngine.resolveNight({ players, actions: [act('wi', 'POISON', 'v1')], state: state() });
    expect(r.deaths).toHaveLength(0);
  });

  it('Doctor tidak boleh melindungi target sama berturut-turut', () => {
    const players = [...base(), player('d', 'DOCTOR')];
    players.find((p) => p.id === 'd')!.lastTargets.PROTECT = 'v1';
    const r = GameResolutionEngine.resolveNight({ players, actions: [act('w1', 'ATTACK', 'v1'), act('d', 'PROTECT', 'v1')], state: state() });
    expect(r.deaths.map((d) => d.playerId)).toEqual(['v1']);
  });

  it('Serial Killer kebal terhadap serangan serigala', () => {
    const players = [...base(), player('sk', 'SERIAL_KILLER')];
    const r = GameResolutionEngine.resolveNight({ players, actions: [act('w1', 'ATTACK', 'sk')], state: state() });
    expect(r.deaths).toHaveLength(0);
  });

  it('Arsonist membakar semua yang sudah disiram dan tidak diblok Guardian', () => {
    const players = [...base(), player('a', 'ARSONIST')];
    const r = GameResolutionEngine.resolveNight({ players, actions: [act('a', 'IGNITE', null), act('g', 'PROTECT', 'v1')], state: state({ doused: ['v1', 'v2'] }) });
    expect(r.deaths.map((d) => d.playerId).sort()).toEqual(['v1', 'v2']);
  });

  it('Cupid hanya bisa memasangkan di malam pertama', () => {
    const players = [...base(), player('c', 'CUPID')];
    const night1 = GameResolutionEngine.resolveNight({ players, actions: [act('c', 'LINK', 'v1', 'v2')], state: state({ round: 1 }) });
    expect(night1.lovers).toEqual(['v1', 'v2']);
    const night2 = GameResolutionEngine.resolveNight({ players, actions: [act('c', 'LINK', 'v1', 'v2')], state: state({ round: 2 }) });
    expect(night2.lovers).toBeNull();
  });

  it('Lovers chain: kematian satu pasangan membunuh yang lain', () => {
    const r = GameResolutionEngine.resolveNight({ players: base(), actions: [act('w1', 'ATTACK', 'v1')], state: state({ lovers: ['v1', 'v2'] }) });
    expect(r.deaths.map((d) => [d.playerId, d.reason])).toEqual([['v1', 'WEREWOLF_ATTACK'], ['v2', 'HEARTBREAK']]);
  });

  it('Hunter yang mati memicu pendingRevenge dan menunda win check', () => {
    const players = [...base(), player('h', 'HUNTER')];
    const r = GameResolutionEngine.resolveNight({ players, actions: [act('w1', 'ATTACK', 'h')], state: state() });
    expect(r.pendingRevenge).toEqual(['h']);
    expect(r.win.over).toBe(false);
  });

  it('pipeline deterministik: input sama menghasilkan output sama', () => {
    const input = { players: base(), actions: [act('w1', 'ATTACK', 'v1'), act('wi', 'POISON', 'v2')], state: state() };
    expect(GameResolutionEngine.resolveNight(input)).toEqual(GameResolutionEngine.resolveNight(input));
  });
});

describe('Hunter revenge', () => {
  it('menembak target valid dan mengonsumsi kemampuan', () => {
    const players = [player('h', 'HUNTER', false), player('w1', 'WEREWOLF'), player('v1', 'VILLAGER'), player('v2', 'VILLAGER')];
    const r = GameResolutionEngine.resolveRevenge({ players, actions: [act('h', 'REVENGE_KILL', 'w1')], pending: ['h'], state: state() });
    expect(r.deaths.map((d) => d.playerId)).toEqual(['w1']);
    expect(r.consumed).toEqual([{ actorId: 'h', type: 'REVENGE_KILL' }]);
    expect(r.win.over).toBe(true);
    expect(r.win.label).toBe('VILLAGE');
  });

  it('tanpa aksi, tidak ada yang mati', () => {
    const players = [player('h', 'HUNTER', false), player('w1', 'WEREWOLF'), player('v1', 'VILLAGER')];
    const r = GameResolutionEngine.resolveRevenge({ players, actions: [], pending: ['h'], state: state() });
    expect(r.deaths).toHaveLength(0);
  });
});

describe('GameResolutionEngine.checkWin', () => {
  const s = state();
  it('Village menang saat semua serigala mati', () => {
    expect(GameResolutionEngine.checkWin([player('w', 'WEREWOLF', false), player('v', 'VILLAGER')], s).label).toBe('VILLAGE');
  });
  it('Werewolf menang saat paritas (mode klasik)', () => {
    expect(GameResolutionEngine.checkWin([player('w', 'WEREWOLF'), player('v', 'VILLAGER')], s).label).toBe('WEREWOLF');
  });
  it('mode mayoritas membutuhkan serigala lebih banyak', () => {
    const maj = state({ settings: { ...s.settings, winMode: 'MAJORITY' } });
    expect(GameResolutionEngine.checkWin([player('w', 'WEREWOLF'), player('v', 'VILLAGER')], maj).over).toBe(false);
    expect(GameResolutionEngine.checkWin([player('w', 'WEREWOLF'), player('w2', 'WEREWOLF'), player('v', 'VILLAGER')], maj).label).toBe('WEREWOLF');
  });
  it('Solo menang sebagai last survivor', () => {
    expect(GameResolutionEngine.checkWin([player('sk', 'SERIAL_KILLER'), player('v', 'VILLAGER', false)], s).label).toBe('SOLO');
  });
  it('game lanjut bila solo masih hidup bersama pemain lain', () => {
    expect(GameResolutionEngine.checkWin([player('sk', 'SERIAL_KILLER'), player('v', 'VILLAGER'), player('v2', 'VILLAGER')], s).over).toBe(false);
  });
  it('Lovers lintas tim menang bila opsi aktif', () => {
    const on = state({ lovers: ['w', 'v'], settings: { ...s.settings, loversWinAlone: true } });
    expect(GameResolutionEngine.checkWin([player('w', 'WEREWOLF'), player('v', 'VILLAGER')], on).label).toBe('LOVERS');
  });
  it('seri bila semua mati', () => {
    expect(GameResolutionEngine.checkWin([player('w', 'WEREWOLF', false)], s).label).toBe('DRAW');
  });
});

describe('GameResolutionEngine.tallyVotes', () => {
  it('menentukan pemimpin tunggal', () => {
    const t = GameResolutionEngine.tallyVotes([{ voterId: 'a', targetId: 'x' }, { voterId: 'b', targetId: 'x' }, { voterId: 'c', targetId: 'y' }]);
    expect(t.leaders).toEqual(['x']);
  });
  it('mendeteksi seri', () => {
    const t = GameResolutionEngine.tallyVotes([{ voterId: 'a', targetId: 'x' }, { voterId: 'b', targetId: 'y' }]);
    expect(t.leaders).toEqual(['x', 'y']);
  });
  it('tanpa suara tidak ada pemimpin', () => {
    expect(GameResolutionEngine.tallyVotes([]).leaders).toEqual([]);
  });
});
