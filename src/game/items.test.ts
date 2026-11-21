import { describe, expect, it } from 'vitest';
import { emptySim, input, run } from './testutil';

describe('przedmioty', () => {
  it('pachołek wydłuża zasięg ciosu', () => {
    const sim = emptySim();
    sim.addItem('cone', 2690, 200);
    run(sim, 0.3, { romanian: input(2690, 200, { face: 1, act: true, anim: 'act' }) });
    expect(sim.players.romanian.holdItem).toBeGreaterThan(0);
    const n = sim.addNpc('herr', 'walker', 2725, 200, 2600, 2800, -1);
    sim.update(1 / 60, { romanian: input(2690, 200, { face: 1, atk: 1 }) });
    expect(n.hp).toBeLessThan(n.maxHp);
  });

  it('rzucony kosz przewraca wroga', () => {
    const sim = emptySim();
    sim.addItem('bin', 2690, 200);
    run(sim, 0.3, { pole: input(2690, 200, { face: 1, act: true, anim: 'act' }) });
    expect(sim.snapshot().p.pole.hold).toBe(2);
    const n = sim.addNpc('herr', 'walker', 2780, 200, 2600, 2900, -1);
    n.state = 'idle';
    n.turnT = 99;
    sim.update(1 / 60, { pole: input(2690, 200, { face: 1, atk: 1 }) });
    run(sim, 0.6, { pole: input(2690, 200, { face: 1, atk: 1 }) });
    expect(['down', 'ko', 'getup']).toContain(n.state);
    expect(sim.items[0].state).toBe('ground');
  });

  it('butelka rozbija się po upadku', () => {
    const sim = emptySim();
    sim.addItem('bottle', 2690, 200);
    run(sim, 0.3, { pole: input(2690, 200, { face: 1, act: true, anim: 'act' }) });
    sim.update(1 / 60, { pole: input(2690, 200, { face: 1, atk: 1 }) });
    run(sim, 1, { pole: input(2690, 200, { face: 1, atk: 1 }) });
    expect(sim.items.length).toBe(0);
  });

  it('monety po nokaucie zbiera się przechodząc obok', () => {
    const sim = emptySim();
    const n = sim.addNpc('herr', 'walker', 2700, 200, 2600, 2800, -1);
    n.coins = 25;
    n.hp = 1;
    sim.update(1 / 60, { pole: input(2680, 200, { face: 1, atk: 1 }) });
    expect(n.state).toBe('ko');
    // część monet mogła od razu wpaść do kieszeni (leżały pod nogami)
    const total = sim.money + sim.coins.reduce((a, c) => a + c.v, 0);
    expect(total).toBe(25);
    for (const c of [...sim.coins]) sim.update(1 / 60, { pole: input(c.x, c.y, { atk: 1 }) });
    expect(sim.money).toBe(25);
    expect(sim.coins.length).toBe(0);
  });

  it('wkurzony Niemiec rzuca przedmiotem w gracza', () => {
    const sim = emptySim();
    const n = sim.addNpc('herr', 'walker', 2700, 200, 2600, 2800, -1);
    n.grabs = true;
    sim.addItem('crate', 2700, 200);
    n.rage = true;
    n.state = 'chase';
    n.target = 'pole';
    const p = sim.players.pole;
    run(sim, 3, { pole: input(2600, 200, { face: 1 }) });
    expect(p.hp).toBeLessThan(120);
  });
});
