import { describe, expect, it } from 'vitest';
import { emptySim, input, run } from './testutil';
import { baseStats, maxHp } from './stats';
import { hasTech } from './data/techniques';

describe('sklepy i statystyki', () => {
  it('jedzenie leczy i na stałe podnosi statystyki', () => {
    const sim = emptySim();
    sim.money = 100;
    const p = sim.players.pole;
    p.hp = 50;
    sim.enterShop('pole', 'halina');
    expect(sim.buy('pole', 'bigos', 'eat')).toBe('');
    expect(sim.money).toBe(82);
    expect(p.stats.wytrz).toBe(baseStats('pole').wytrz + 2);
    expect(p.hp).toBe(50 + 20 + 60);
    expect(maxHp(p.stats)).toBe(140);
  });

  it('za mało kasy / pełny ekwipunek / cudza książka', () => {
    const sim = emptySim();
    sim.money = 5;
    sim.enterShop('romanian', 'halina');
    expect(sim.buy('romanian', 'bigos', 'eat')).toBe('shop.err_money');
    sim.money = 1000;
    expect(sim.buy('romanian', 'b_mlynek', 'eat')).toBe('shop.err_who');
    for (let i = 0; i < 4; i++) expect(sim.buy('romanian', 'paczek', 'take')).toBe('');
    expect(sim.buy('romanian', 'paczek', 'take')).toBe('shop.err_full');
    expect(sim.players.romanian.inv.length).toBe(4);
  });

  it('jedzenie z ekwipunku działa poza sklepem', () => {
    const sim = emptySim();
    sim.money = 100;
    sim.enterShop('romanian', 'costel');
    sim.buy('romanian', 'mici', 'take');
    sim.leaveShop('romanian');
    const p = sim.players.romanian;
    expect(sim.useItem('romanian', 0)).toBe(true);
    expect(p.inv.length).toBe(0);
    expect(p.stats.sila).toBe(baseStats('romanian').sila + 1);
  });

  it('książka uczy techniki, druga kopia już nie', () => {
    const sim = emptySim();
    sim.money = 500;
    sim.enterShop('pole', 'buch');
    expect(sim.buy('pole', 'b_piesc', 'eat')).toBe('');
    expect(hasTech(sim.players.pole.techs, 'piesc')).toBe(true);
    expect(sim.buy('pole', 'b_piesc', 'eat')).toBe('shop.err_known');
  });

  it('gracz w sklepie jest bezpieczny', () => {
    const sim = emptySim();
    sim.enterShop('pole', 'doner');
    const n = sim.addNpc('herr', 'walker', 2700, 200, 2600, 2800, -1);
    n.rage = true;
    n.state = 'chase';
    run(sim, 3, { pole: input(2690, 200) });
    expect(sim.players.pole.hp).toBe(120);
  });
});

describe('techniki', () => {
  it('Młynek trafia też za plecami', () => {
    const sim = emptySim();
    sim.players.pole.techs = 1; // mlynek
    const n = sim.addNpc('herr', 'walker', 2670, 200, 2600, 2800, 1);
    sim.update(1 / 60, { pole: input(2690, 200, { face: 1, atk: 1, ak: 'j', z: 10 }) });
    expect(n.hp).toBeLessThan(n.maxHp);
  });

  it('ładowany cios wymaga techniki', () => {
    const dmg = (techs: number) => {
      const sim = emptySim();
      sim.players.pole.techs = techs;
      const n = sim.addNpc('polizei', 'walker', 2710, 200, 2600, 2800, -1);
      n.rage = true;
      sim.update(1 / 60, { pole: input(2690, 200, { face: 1, atk: 1, ak: 'c' }) });
      return n.maxHp - n.hp;
    };
    expect(dmg(1 << 3)).toBeGreaterThan(dmg(0));
  });

  it('Brzytwa wybacza pierwsze przyłapanie', () => {
    const sim = emptySim();
    sim.players.romanian.techs = 1 << 6;
    const victim = sim.addNpc('herr', 'walker', 2700, 200, 2600, 2800, -1);
    victim.state = 'idle';
    victim.turnT = 99;
    const watcher = sim.addNpc('frau', 'walker', 2650, 200, 2500, 2800, 1);
    watcher.state = 'idle';
    watcher.turnT = 99;
    // Rumun za plecami ofiary (ofiara patrzy w lewo, Rumun z prawej), świadek patrzy na niego
    run(sim, 0.3, { romanian: input(2715, 200, { face: -1, act: true, anim: 'act' }) });
    expect(watcher.rage).toBe(false);
    expect(sim.players.romanian.grace).toBe(true);
  });
});
