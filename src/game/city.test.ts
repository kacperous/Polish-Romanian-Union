import { describe, expect, it } from 'vitest';
import { Sim } from './Sim';
import { CityRules } from './chapters/city';
import { CITY } from './data/city';
import { input, run } from './testutil';
import { decodePassword, encodePassword, PASSWORD_LEN, SaveData } from './save';
import { baseStats } from './stats';

function citySim(seed = 3, stamps = 0) {
  return new Sim({ pole: true, romanian: true }, false, { seed, rules: (s) => new CityRules(s, { stamps }) });
}

describe('Rozdział II — miasto', () => {
  it('startuje w bezpiecznej bazie z zapisem', () => {
    const sim = citySim();
    const s = sim.snapshot();
    expect(s.city?.ar).toBe('baza');
    expect(s.ev.some((e) => e.e === 'save')).toBe(true);
    expect(sim.npcs.every((n) => n.role !== 'thug')).toBe(true);
  });

  it('wyjście wymaga obu graczy albo czekania', () => {
    const sim = citySim();
    const seq = sim.rules.seq;
    // tylko Polak przy prawej krawędzi
    run(sim, 1, { pole: input(955, 200, { ar: seq }), romanian: input(400, 220, { ar: seq }) });
    expect(sim.snapshot().city?.ar).toBe('baza');
    run(sim, 2.5, { pole: input(955, 200, { ar: seq }), romanian: input(400, 220, { ar: seq }) });
    const s = sim.snapshot();
    expect(s.city?.ar).toBe('bahnhof');
    // obaj stoją przy lewej krawędzi nowego obszaru
    expect(s.p.romanian.x).toBe(40);
    expect(s.p.pole.x).toBe(40);
  });

  it('stara pozycja od klienta nie cofa gracza po zmianie obszaru', () => {
    const sim = citySim();
    const seq = sim.rules.seq;
    run(sim, 0.2, { pole: input(955, 200, { ar: seq }), romanian: input(955, 220, { ar: seq }) });
    expect(sim.snapshot().city?.ar).toBe('bahnhof');
    run(sim, 0.5, { pole: input(955, 200, { ar: seq }), romanian: input(955, 220, { ar: seq }) });
    expect(sim.snapshot().city?.ar).toBe('bahnhof');
    expect(sim.players.pole.in.x).toBe(40);
  });

  it('brama holowni wymaga 5 pieczątek', () => {
    const go = (stamps: number) => {
      const sim = citySim(3, stamps);
      (sim.rules as CityRules).load('altstadt', null);
      const seq = sim.rules.seq;
      run(sim, 0.2, { pole: input(5, 200, { ar: seq }), romanian: input(5, 220, { ar: seq }) });
      return sim.snapshot().city?.ar;
    };
    expect(go(0)).toBe('altstadt');
    expect(go(31)).toBe('holownia');
  });

  it('członkowie band atakują i zostawiają monety', () => {
    const sim = citySim();
    (sim.rules as CityRules).load('bahnhof', null);
    const thug = sim.npcs.find((n) => n.role === 'thug')!;
    const seq = sim.rules.seq;
    run(sim, 0.3, { pole: input(thug.x - 30, thug.y, { face: 1, ar: seq }) });
    expect(thug.rage).toBe(true);
    thug.hp = 1;
    thug.state = 'chase';
    sim.update(1 / 60, { pole: input(thug.x - 20, thug.y, { face: 1, atk: 1, ar: seq }) });
    expect(thug.state).toBe('ko');
    expect(sim.coins.length).toBeGreaterThan(0);
    run(sim, 3.5, { pole: input(100, 250, { ar: seq }) });
    expect(sim.npcs.includes(thug)).toBe(false);
  });

  it('drzwi prowadzą do sklepu, automat przyjmuje butelki', () => {
    const sim = citySim();
    const seq = sim.rules.seq;
    const door = CITY.baza.props.find((p) => p.kind === 'door')!;
    run(sim, 0.4, { pole: input(door.x, 165, { act: true, anim: 'act', ar: seq }) });
    expect(sim.players.pole.shop).toBe('halina');
    sim.leaveShop('pole');
    const bottle = sim.addItem('bottle', 700, 170);
    run(sim, 0.3, { romanian: input(700, 170, { act: true, anim: 'act', ar: seq }) });
    expect(sim.players.romanian.holdItem).toBe(bottle.id);
    const m0 = sim.money;
    run(sim, 0.1, { romanian: input(780, 165, { ar: seq }) });
    run(sim, 0.8, { romanian: input(780, 165, { act: true, anim: 'hold', ar: seq }) });
    expect(sim.money).toBe(m0 + 1);
    expect((sim.rules as CityRules).state.pfand).toBe(1);
  });

  it('porażka: połowa kasy i powrót do bazy', () => {
    const sim = citySim();
    (sim.rules as CityRules).load('stadion', null);
    sim.money = 101;
    sim.players.pole.down = true;
    sim.players.romanian.down = true;
    const { events } = run(sim, 3, {});
    expect(sim.money).toBe(51);
    expect(sim.snapshot().city?.ar).toBe('baza');
    expect(sim.players.pole.down).toBe(false);
    expect(events.some((e) => e.e === 'end')).toBe(false);
  });
});

describe('hasło zapisu', () => {
  const data: SaveData = {
    v: 1,
    progress: {
      stats: { pole: { ...baseStats('pole'), sila: 40 }, romanian: { ...baseStats('romanian'), reka: 63 } },
      techs: { pole: 0b1001, romanian: 0b1000110 },
      inv: { pole: ['pierogi', 'mici'], romanian: ['salbe'] },
      money: 1234,
    },
    city: { stamps: 0b10101, gnomes: 3, flags: 7, pfand: 22 },
  };

  it('kodowanie i dekodowanie daje te same dane', () => {
    const pw = encodePassword(data);
    expect(pw.length).toBe(PASSWORD_LEN);
    expect(decodePassword(pw)).toEqual(data);
    expect(decodePassword(pw.toLowerCase().replace(/(.{5})/g, '$1 '))).toEqual(data);
  });

  it('literówka w haśle jest wykrywana', () => {
    const pw = encodePassword(data);
    const bad = pw.slice(0, 10) + (pw[10] === 'A' ? 'B' : 'A') + pw.slice(11);
    expect(decodePassword(bad)).toBeNull();
    expect(decodePassword('ABC')).toBeNull();
  });
});
