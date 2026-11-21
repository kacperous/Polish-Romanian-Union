import { describe, expect, it } from 'vitest';
import { Sim } from './Sim';
import { ITEM_POS } from './constants';
import { emptySim, input, run } from './testutil';

describe('Sim — Rozdział I', () => {
  it('jest deterministyczny dla tego samego ziarna', () => {
    const a = new Sim({ pole: true, romanian: true }, false, { seed: 42 });
    const b = new Sim({ pole: true, romanian: true }, false, { seed: 42 });
    const inp = { pole: input(2830, 190), romanian: input(2850, 226) };
    const ra = run(a, 5, inp);
    const rb = run(b, 5, inp);
    expect(ra.snap.n).toEqual(rb.snap.n);
  });

  it('cios Polaka rani NPC w zasięgu i go wkurza', () => {
    const sim = emptySim();
    const n = (sim as unknown as { addNpc: Function }).addNpc('herr', 'walker', 2700, 200, 2600, 2800, 1);
    sim.update(1 / 60, { pole: input(2680, 200, { face: 1, atk: 1 }) });
    // RAGE dokłada życia, więc porównujemy z maksimum
    expect(n.hp).toBeLessThan(n.maxHp);
    expect(n.rage).toBe(true);
  });

  it('krasnal ukradziony bez świadków przesuwa etap', () => {
    const sim = emptySim();
    const { snap } = run(sim, 2, { romanian: input(ITEM_POS.gnome.x, ITEM_POS.gnome.y, { act: true }) });
    expect(snap.o.gnome).toBe(1);
    expect(snap.stage).toBe(1);
  });

  it('kumpel podnosi leżącego gracza', () => {
    const sim = emptySim();
    sim.players.pole.down = true;
    sim.players.pole.hp = 0;
    const { snap } = run(sim, 2.2, {
      pole: input(2700, 200),
      romanian: input(2710, 200, { act: true }),
    });
    expect(snap.p.pole.down).toBe(false);
    expect(snap.p.pole.hp).toBeGreaterThan(0);
  });

  it('obaj leżą = przegrana', () => {
    const sim = emptySim();
    sim.players.pole.down = true;
    sim.players.romanian.down = true;
    const { events } = run(sim, 0.1, {});
    expect(events.some((e) => e.e === 'end' && !e.win)).toBe(true);
  });
});
