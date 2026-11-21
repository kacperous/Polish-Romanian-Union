import { describe, expect, it } from 'vitest';
import { emptySim, input, run } from './testutil';
import { attackDmg, baseStats, dmgTaken, maxHp } from './stats';

describe('statystyki', () => {
  it('startowe statystyki odtwarzają balans prologu', () => {
    expect(maxHp(baseStats('pole'))).toBe(120);
    expect(maxHp(baseStats('romanian'))).toBe(120);
    expect(attackDmg('pole', baseStats('pole'))).toBe(20);
    expect(attackDmg('romanian', baseStats('romanian'))).toBe(11);
    expect(dmgTaken(10, baseStats('pole'))).toBe(10);
  });
});

describe('walka', () => {
  it('kopniak z wyskoku przewraca wroga', () => {
    const sim = emptySim();
    const n = sim.addNpc('herr', 'walker', 2700, 200, 2600, 2800, 1);
    sim.update(1 / 60, { romanian: input(2685, 200, { face: 1, atk: 1, ak: 'j', z: 20 }) });
    expect(n.state).toBe('down');
  });

  it('trzy ciosy z rzędu przewracają wroga', () => {
    const sim = emptySim();
    const n = sim.addNpc('polizei', 'walker', 2700, 200, 2600, 2800, 1);
    for (let i = 1; i <= 3; i++) {
      sim.update(0.3, { romanian: input(2685, 200, { face: 1, atk: i }) });
      if (n.state === 'hurt') n.state = 'chase';
      n.x = 2700;
      n.vx = 0;
    }
    expect(n.state).toBe('down');
  });

  it('gracz w powietrzu przeskakuje cios', () => {
    const sim = emptySim();
    const n = sim.addNpc('herr', 'walker', 2700, 200, 2600, 2800, -1);
    n.state = 'windup';
    n.t = 0;
    const p = sim.players.pole;
    sim.update(1 / 60, { pole: input(2680, 200, { z: 20 }) });
    expect(p.hp).toBe(maxHp(p.stats));
  });

  it('blok przodem do wroga zmniejsza obrażenia', () => {
    const hit = (anim: 'block' | 'idle') => {
      const sim = emptySim();
      const n = sim.addNpc('herr', 'walker', 2700, 200, 2600, 2800, -1);
      n.state = 'windup';
      n.t = 0;
      n.rage = true;
      sim.update(1 / 60, { pole: input(2680, 200, { face: 1, anim, act: anim === 'block' }) });
      return maxHp(sim.players.pole.stats) - sim.players.pole.hp;
    };
    expect(hit('block')).toBeGreaterThan(0);
    expect(hit('block')).toBeLessThan(hit('idle'));
  });

  it('seria trafień przewraca gracza', () => {
    const sim = emptySim();
    const p = sim.players.romanian;
    let kd = 0;
    for (let i = 0; i < 4 && !kd; i++) {
      p.invuln = 0;
      sim.hurtPlayer(p, 10, 1);
      kd = p.kd;
    }
    expect(kd).toBeGreaterThan(0);
  });

  it('podniesiony wróg rzucony w drugiego przewraca go', () => {
    const sim = emptySim();
    const a = sim.addNpc('herr', 'walker', 2700, 200, 2600, 2800, 1);
    const b = sim.addNpc('frau', 'walker', 2780, 200, 2600, 2900, -1);
    a.state = 'down';
    a.t = 5;
    b.state = 'idle';
    b.turnT = 99;
    // podnieś
    run(sim, 0.5, { pole: input(2690, 200, { face: 1, act: true, anim: 'act' }) });
    expect(a.state).toBe('held');
    expect(sim.players.pole.holdNpc).toBe(a.id);
    // rzuć
    sim.update(1 / 60, { pole: input(2690, 200, { face: 1, atk: 1 }) });
    expect(a.state).toBe('thrown');
    run(sim, 0.6, { pole: input(2690, 200, { face: 1, atk: 1 }) });
    expect(b.hp).toBeLessThan(b.maxHp);
    expect(['down', 'ko', 'getup', 'chase']).toContain(b.state);
  });
});
