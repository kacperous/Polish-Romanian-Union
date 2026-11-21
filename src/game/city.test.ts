import { describe, expect, it } from 'vitest';
import { Sim } from './Sim';
import { CityRules } from './chapters/city';
import { CITY } from './data/city';
import { input, run } from './testutil';
import { FLAG } from './data/story';
import { decodePassword, encodePassword, PASSWORD_LEN, SaveData } from './save';
import { baseStats } from './stats';

/** Miasto po scenkach wstępnych (intro, brama, nagroda za butelki już były). */
function citySim(seed = 3, stamps = 0) {
  const flags = FLAG.INTRO | FLAG.GATE | FLAG.PFAND_DONE;
  return new Sim({ pole: true, romanian: true }, false, { seed, rules: (s) => new CityRules(s, { stamps, flags }) });
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

describe('Rozdział II — fabuła', () => {
  it('nowa gra zaczyna się scenką u Haliny, która zatrzymuje świat', () => {
    const sim = new Sim({ pole: true, romanian: true }, false, { seed: 1, rules: (s) => new CityRules(s) });
    const ev = sim.snapshot().ev;
    expect(ev.some((e) => e.e === 'dialog')).toBe(true);
    expect(sim.cutT).toBeGreaterThan(0);
    sim.skipCutscene();
    const { events } = run(sim, 0.1, {});
    expect(events.some((e) => e.e === 'dialog_end')).toBe(true);
    expect(sim.cutT).toBe(0);
    expect(sim.npcs.some((n) => n.kind === 'halina')).toBe(true);
  });

  it('boss: scenka, walka, pieczątka', () => {
    const sim = citySim();
    const rules = sim.rules as CityRules;
    rules.load('garten', null);
    const seq = sim.rules.seq;
    const boss = sim.npcs.find((n) => n.kind === 'b_gunther')!;
    expect(boss.role).toBe('boss');
    run(sim, 0.2, { pole: input(boss.x - 150, boss.y, { face: 1, ar: seq }) });
    expect(sim.cutT).toBeGreaterThan(0);
    sim.skipCutscene();
    run(sim, 0.1, { pole: input(boss.x - 150, boss.y, { face: 1, ar: seq }) });
    expect(boss.rage).toBe(true);
    expect(sim.snapshot().city?.boss?.[0]).toBe('boss.gunther');
    boss.hp = 1;
    boss.state = 'chase';
    sim.players.pole.invuln = 0;
    sim.update(1 / 60, { pole: input(boss.x - 20, boss.y, { face: 1, atk: 1, ar: seq }) });
    expect(boss.state).toBe('ko');
    sim.skipCutscene();
    run(sim, 0.2, { pole: input(100, 250, { ar: seq }) });
    expect(rules.state.stamps & 2).toBe(2);
    // pokonany boss nie wraca
    rules.load('garten', null);
    expect(sim.npcs.some((n) => n.kind === 'b_gunther')).toBe(false);
  });

  it('bęben Thorstena przewraca stojących, skaczący są bezpieczni', () => {
    const hit = (z: number) => {
      const sim = citySim();
      (sim.rules as CityRules).load('stadion', null);
      const seq = sim.rules.seq;
      const th = sim.npcs.find((n) => n.kind === 'b_thorsten')!;
      th.introDone = true;
      th.rage = true;
      th.state = 'drum';
      th.t = 0.01;
      sim.players.pole.invuln = 0;
      sim.update(1 / 60, { pole: input(th.x + 60, th.y, { z, ar: seq }) });
      return sim.players.pole.kd;
    };
    expect(hit(0)).toBeGreaterThan(0);
    expect(hit(20)).toBe(0);
  });

  it('urzędnik wypisuje mandat zamiast bić', () => {
    const sim = citySim();
    (sim.rules as CityRules).load('altstadt', null);
    sim.npcs = [];
    const seq = sim.rules.seq;
    sim.money = 100;
    const b = sim.addNpc('beamter', 'thug', 700, 200, 40, 1400, -1);
    b.rage = true;
    b.state = 'strike';
    sim.players.pole.invuln = 0;
    sim.players.pole.in.x = 680;
    sim.players.pole.in.y = 200;
    (sim as unknown as { npcStrike: (n: unknown) => void }).npcStrike(b);
    expect(sim.money).toBeLessThan(100);
    void seq;
  });

  it('finał: Klaus pokonany → auto → ucieczka', () => {
    const sim = citySim(5, 31);
    const rules = sim.rules as CityRules;
    rules.load('holownia', null);
    sim.npcs = sim.npcs.filter((n) => n.boss);
    const klaus = sim.npcs.find((n) => n.kind === 'b_klaus')!;
    const seq = sim.rules.seq;
    klaus.introDone = true;
    klaus.hp = 1;
    klaus.state = 'chase';
    klaus.rage = true;
    sim.update(1 / 60, { pole: input(klaus.x - 20, klaus.y, { face: 1, atk: 1, ar: seq }) });
    sim.skipCutscene();
    run(sim, 0.1, {});
    expect(rules.car).not.toBeNull();
    const cx = rules.car!.x;
    const { events } = run(sim, 5, {
      pole: input(cx, 236, { act: true, anim: 'act', ar: seq }),
      romanian: input(cx + 10, 236, { act: true, anim: 'act', ar: seq }),
    });
    expect(events.some((e) => e.e === 'end' && e.win)).toBe(true);
    expect(rules.state.flags & FLAG.FINISHED).toBeTruthy();
  });

  it('ukryty krasnal daje statystyki obu graczom', () => {
    const sim = citySim();
    const rules = sim.rules as CityRules;
    rules.load('garten', null);
    sim.npcs = [];
    const seq = sim.rules.seq;
    const w0 = sim.players.romanian.stats.wytrz;
    run(sim, 2, { pole: input(700, 166, { act: true, anim: 'act', ar: seq }) });
    expect(rules.state.gnomes & 2).toBe(2);
    expect(sim.players.romanian.stats.wytrz).toBe(w0 + 1);
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
