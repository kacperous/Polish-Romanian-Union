import { afterEach, describe, expect, it } from 'vitest';
import { emptySim, input, run } from './testutil';
import { isPrologDone, markPrologDone } from './save';

describe('friendly fire', () => {
  it('cios trafia kumpla (połowa obrażeń) i go wkurza', () => {
    const sim = emptySim();
    sim.update(1 / 60, { pole: input(2680, 200), romanian: input(2700, 200) });
    const { events } = run(sim, 1 / 60, {
      pole: input(2680, 200, { face: 1, atk: 1 }),
      romanian: input(2700, 200),
    });
    const r = sim.players.romanian;
    expect(r.hp).toBeLessThan(120);
    expect(120 - r.hp).toBeLessThan(20);
    expect(events.some((e) => e.e === 'ff' && e.who === 'romanian' && e.by === 'pole')).toBe(true);
  });

  it('blok chroni przed kumplem, a w solo nie ma kogo trafić', () => {
    const sim = emptySim();
    sim.update(1 / 60, { pole: input(2680, 200), romanian: input(2700, 200, { face: -1, anim: 'block', act: true }) });
    sim.update(1 / 60, {
      pole: input(2680, 200, { face: 1, atk: 1 }),
      romanian: input(2700, 200, { face: -1, anim: 'block', act: true }),
    });
    const blocked = 120 - sim.players.romanian.hp;
    const sim2 = emptySim();
    sim2.update(1 / 60, { pole: input(2680, 200), romanian: input(2700, 200) });
    sim2.update(1 / 60, { pole: input(2680, 200, { face: 1, atk: 1 }), romanian: input(2700, 200) });
    expect(blocked).toBeLessThan(120 - sim2.players.romanian.hp);

    const solo = emptySim({ solo: true, present: { pole: true, romanian: false } });
    const { events } = run(solo, 1 / 60, { pole: input(2680, 200, { face: 1, atk: 1 }) });
    expect(events.some((e) => e.e === 'ff')).toBe(false);
  });

  it('rzucony kosz trafia kumpla na linii rzutu', () => {
    const sim = emptySim();
    sim.addItem('bin', 2690, 200);
    run(sim, 0.3, { pole: input(2690, 200, { face: 1, act: true, anim: 'act' }), romanian: input(2900, 230) });
    sim.update(1 / 60, { pole: input(2690, 200, { face: 1, atk: 1 }), romanian: input(2760, 200) });
    const { events } = run(sim, 0.8, { pole: input(2690, 200, { face: 1, atk: 1 }), romanian: input(2760, 200) });
    expect(events.some((e) => e.e === 'ff')).toBe(true);
  });
});

describe('odblokowanie Rozdziału II', () => {
  const store: Record<string, string> = {};
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => (store[k] = v),
  };
  afterEach(() => Object.keys(store).forEach((k) => delete store[k]));

  it('prolog trzeba ukończyć, odblokowanie liczy się raz', () => {
    expect(isPrologDone()).toBe(false);
    expect(markPrologDone()).toBe(true);
    expect(isPrologDone()).toBe(true);
    expect(markPrologDone()).toBe(false);
  });
});
