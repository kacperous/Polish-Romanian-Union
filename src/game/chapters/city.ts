/** Rozdział II: miasto Ordnungsburg — obszary, wyjścia, sklepy, automaty Pfand, kara za porażkę. */
import { WALK_BOTTOM, WALK_TOP } from '../constants';
import { ALL_STAMPS, CITY, CityArea, CityAreaId, DOOR_Y } from '../data/city';
import type { PlayerSim, Sim } from '../Sim';
import { clampStat, maxHp } from '../stats';
import {
  BOSSES,
  BossDef,
  FLAG,
  GATE_DIALOG,
  GNOME_REWARD,
  GNOME_SPOTS,
  GNOMES_DIALOG,
  INTRO_DIALOG,
  PFAND_DIALOG,
  PFAND_GOAL,
  PFAND_REWARD,
} from '../data/story';
import type { ActKind } from '../types';
import type { ActChoice, ChapterRules } from './rules';

/** Stan fabuły zapisywany w haśle. */
export interface CityState {
  /** pieczątki szefów band (bity) */
  stamps: number;
  /** znalezione krasnale (bity) */
  gnomes: number;
  /** flagi zadań pobocznych */
  flags: number;
  /** oddane butelki */
  pfand: number;
}

/** Wysokość (y) auta w holowni. */
export const CAR_Y = 236;

function countBits(v: number) {
  let n = 0;
  for (; v; v &= v - 1) n++;
  return n;
}

export function emptyCityState(): CityState {
  return { stamps: 0, gnomes: 0, flags: 0, pfand: 0 };
}

const EDGE = 14;

export class CityRules implements ChapterRules {
  readonly chapter = 2;
  seq = 0;
  area!: CityArea;
  state: CityState;
  private exitT = 0;
  private respawnT = 0;
  /** bossowie pokonani w tej wizycie (żeby nie liczyć dwa razy) */
  private beaten = new Set<string>();
  /** auto w holowni (finał) */
  car: { x: number; unlocked: boolean; gone: boolean; t: number } | null = null;

  constructor(
    private sim: Sim,
    state?: Partial<CityState>,
    private start: CityAreaId = 'baza',
  ) {
    this.state = { ...emptyCityState(), ...state };
  }

  init() {
    this.load(this.start, null);
    if (!(this.state.flags & FLAG.INTRO)) {
      this.state.flags |= FLAG.INTRO;
      this.sim.dialog(INTRO_DIALOG);
    }
  }

  /** Bossowie tego obszaru, którzy jeszcze stoją. */
  private bossesHere(): BossDef[] {
    return BOSSES.filter((b) => b.area === this.area.id && (b.stamp < 0 ? !(this.state.flags & FLAG.FINISHED) : !(this.state.stamps & (1 << b.stamp))));
  }

  /** Wczytuje obszar; `from` — krawędź, którą gracze wyszli z poprzedniego. */
  load(id: CityAreaId, from: 'L' | 'R' | null) {
    const sim = this.sim;
    const a = CITY[id];
    this.area = a;
    this.seq++;
    this.exitT = 0;
    for (const p of Object.values(sim.players)) {
      p.holdNpc = -1;
      p.holdItem = -1;
    }
    sim.npcs = [];
    sim.items = [];
    sim.coins = [];
    sim.areaW = a.w;
    sim.alarm = a.safe ? 0 : Math.round(sim.alarm * 0.5);
    for (const sp of a.spawns) {
      const n = sim.addNpc(sp.kind, sp.role, sp.x, sp.y, sp.minX, sp.maxX, sp.face ?? -1);
      if (sp.role === 'thug') n.coins = Math.max(1, a.coins + sim.randi(-4, 4));
    }
    for (const it of a.items ?? []) sim.addItem(it.kind, it.x, it.y);
    this.beaten.clear();
    this.car = null;
    for (const b of this.bossesHere()) {
      for (const sp of b.spawns) {
        const n = sim.addNpc(sp.kind, 'boss', sp.x, sp.y, 30, a.w - 30, sp.x > a.w / 2 ? -1 : 1);
        n.boss = b.id;
        n.coins = 60;
      }
    }
    if (id === 'baza') {
      sim.addNpc('halina', 'keeper', 150, 170, 150, 150, 1);
      sim.addNpc('costel', 'keeper', 510, 170, 510, 510, 1);
    }
    // wejście: wyszli lewą krawędzią → pojawiają się z prawej strony nowego obszaru
    const x = from === 'L' ? a.w - 40 : from === 'R' ? 40 : 380;
    const face: 1 | -1 = from === 'L' ? -1 : 1;
    let i = 0;
    for (const p of Object.values(sim.players)) {
      p.in.x = x + (from ? 0 : i * 30);
      p.in.y = from ? Math.max(WALK_TOP + 10, Math.min(WALK_BOTTOM - 10, p.in.y)) : 196 + i * 30;
      p.in.face = face;
      p.in.z = 0;
      p.prog = 0;
      p.kind = '';
      p.shop = '';
      p.invuln = Math.max(p.invuln, 1);
      i++;
    }
    sim.ev({ e: 'area', id });
    if (a.safe) {
      sim.ev({ e: 'save' });
      this.baseEvents();
    }
  }

  /** Wydarzenia przy powrocie do bazy: otwarta brama, nagroda za butelki. */
  private baseEvents() {
    const st = this.state;
    if (st.stamps === ALL_STAMPS && !(st.flags & FLAG.GATE)) {
      st.flags |= FLAG.GATE;
      this.sim.dialog(GATE_DIALOG);
    }
    if (st.pfand >= PFAND_GOAL && !(st.flags & FLAG.PFAND_DONE)) {
      st.flags |= FLAG.PFAND_DONE;
      this.sim.money += PFAND_REWARD;
      this.sim.dialog(PFAND_DIALOG);
    }
  }

  /** Scenki powitalne bossów i sprawdzanie, czy padli. */
  private updateBosses() {
    const sim = this.sim;
    for (const b of this.bossesHere()) {
      const npcs = sim.npcs.filter((n) => n.boss === b.id);
      if (!npcs.length || this.beaten.has(b.id)) continue;
      if (!npcs[0].introDone) {
        const near = Object.values(sim.players).some((p) => p.present && !p.down && npcs.some((n) => Math.abs(n.x - p.in.x) < 210));
        if (!near) continue;
        npcs.forEach((n) => (n.introDone = true));
        sim.dialog(b.intro, () => {
          const tgt = Object.values(sim.players).find((p) => p.present && !p.down);
          npcs.forEach((n) => sim.enrage(n, tgt));
        });
        sim.ev({ e: 'sfx', k: 'rage' });
        continue;
      }
      if (npcs.every((n) => n.state === 'ko')) {
        this.beaten.add(b.id);
        if (b.stamp >= 0) {
          this.state.stamps |= 1 << b.stamp;
          sim.sfx('win');
          sim.ev({ e: 'msg', s: 'm.stamp', a: { b: `boss.${b.id}` } });
          sim.dialog(b.outro);
          sim.ev({ e: 'save' });
        } else {
          // finał: auto stoi za Klausem
          sim.dialog(b.outro);
          this.car = { x: 560, unlocked: true, gone: false, t: 0 };
          sim.ev({ e: 'msg', s: 'm.car_found' });
        }
      }
    }
  }

  update(dt: number) {
    const sim = this.sim;
    if (this.respawnT > 0) {
      this.respawnT -= dt;
      if (this.respawnT <= 0) this.respawn();
      return;
    }
    this.updateBosses();
    if (this.car?.gone) {
      const c = this.car;
      c.t += dt;
      c.x += Math.min(260, 40 + c.t * 140) * dt;
      if (c.t > 3.2 && !sim.ended) {
        sim.ended = true;
        this.state.flags |= FLAG.FINISHED;
        sim.ev({ e: 'save' });
        sim.sfx('win');
        sim.ev({ e: 'end', win: true, reason: 'end.win2_reason' });
      }
      return;
    }
    // wyjścia na krawędziach — przejście dopiero, gdy obaj gracze stoją przy tym samym wyjściu
    const active = Object.values(sim.players).filter((p) => p.present && !p.down && !p.shop);
    const at = { L: 0, R: 0 };
    for (const p of active) {
      const s = p.in.x < EDGE ? 'L' : p.in.x > this.area.w - EDGE ? 'R' : null;
      if (!s) continue;
      const ex = this.area.exits.find((e) => e.side === s);
      if (!ex) continue;
      if (ex.needStamps && this.state.stamps !== ALL_STAMPS) {
        sim.hint(p.id, 'h.gate');
        continue;
      }
      at[s]++;
    }
    if (!at.L && !at.R) {
      this.exitT = 0;
      return;
    }
    const everyone = Object.values(sim.players).filter((p) => p.present).length;
    const side = (['L', 'R'] as const).find((k) => at[k] >= everyone);
    if (side) {
      const ex = this.area.exits.find((e) => e.side === side)!;
      this.load(ex.to, side);
      return;
    }
    // jeden już czeka — przypomnij drugiemu (kumpel leżący też musi wstać)
    if (this.exitT === 0) sim.ev({ e: 'msg', s: 'm.wait_exit' });
    this.exitT += dt;
  }

  chooseAct(p: PlayerSim): ActChoice | null {
    const sim = this.sim;
    const car = this.car;
    if (car && !car.gone && !p.inCar && sim.near(p, car.x, CAR_Y, 56, 22)) return { kind: 'enter', target: 204 };
    if (p.in.y > DOOR_Y + 14) return null;
    const g = GNOME_SPOTS[this.area.id];
    if (g && !(this.state.gnomes & (1 << g.bit)) && Math.abs(p.in.x - g.x) < 16) return { kind: 'gnome', target: 300 };
    for (let i = 0; i < this.area.props.length; i++) {
      const pr = this.area.props[i];
      if (pr.kind === 'door' && Math.abs(p.in.x - pr.x) < 16) return { kind: 'shop', target: i };
      if (pr.kind === 'pfand' && Math.abs(p.in.x - pr.x) < 18) {
        const it = sim.item(p.holdItem);
        if (it && it.kind === 'bottle') return { kind: 'pfand', target: i };
        sim.hint(p.id, 'h.pfand');
        return { kind: '', target: -1 };
      }
    }
    return null;
  }

  canProgress(): boolean {
    return true;
  }

  completeAct(p: PlayerSim, kind: ActKind, target: number): boolean {
    const sim = this.sim;
    if (kind === 'enter' && this.car) {
      p.inCar = true;
      sim.releaseHeld(p);
      sim.playerDrop(p);
      sim.sfx('click');
      if (Object.values(sim.players).every((q) => !q.present || q.inCar)) {
        this.car.gone = true;
        sim.sfx('engine');
        sim.ev({ e: 'msg', s: 'm.escape2' });
      } else sim.ev({ e: 'msg', s: 'm.wait_car', who: p.id });
      return true;
    }
    if (kind === 'gnome') {
      const g = GNOME_SPOTS[this.area.id];
      if (!g || this.state.gnomes & (1 << g.bit)) return true;
      this.state.gnomes |= 1 << g.bit;
      for (const q of Object.values(sim.players)) {
        q.stats.wytrz = clampStat(q.stats.wytrz + 1);
        q.stats.leb = clampStat(q.stats.leb + 1);
      }
      sim.sfx('pickup');
      sim.txt('f.gnome2', g.x, DOOR_Y - 30, '#ffe040');
      sim.ev({ e: 'msg', s: 'm.gnome_found', a: { n: String(countBits(this.state.gnomes)) } });
      if (this.state.gnomes === 31 && !(this.state.flags & FLAG.GNOMES_DONE)) {
        this.state.flags |= FLAG.GNOMES_DONE;
        sim.money += GNOME_REWARD;
        sim.dialog(GNOMES_DIALOG);
      }
      return true;
    }
    const pr = this.area.props[target];
    if (!pr) return false;
    if (kind === 'shop' && pr.shop) {
      sim.enterShop(p.id, pr.shop);
      return true;
    }
    if (kind === 'pfand') {
      const it = sim.item(p.holdItem);
      if (!it || it.kind !== 'bottle') return true;
      sim.removeItem(it);
      sim.money += 1;
      this.state.pfand++;
      sim.sfx('coin');
      sim.txt('f.pfand', pr.x, DOOR_Y - 30, '#ffe040');
      return true;
    }
    return false;
  }

  onAttack(): boolean {
    return false;
  }

  /** Obaj leżą: mandat (połowa kasy) i powrót do bazy. */
  onAllDown() {
    const sim = this.sim;
    if (this.respawnT > 0) return;
    this.respawnT = 2.5;
    const lost = Math.floor(sim.money / 2);
    sim.money -= lost;
    sim.sfx('lose');
    sim.ev({ e: 'msg', s: 'm.strafzettel', a: { v: String(lost) } });
  }

  private respawn() {
    const sim = this.sim;
    for (const p of Object.values(sim.players)) {
      if (!p.present) continue;
      p.down = false;
      p.hp = maxHp(p.stats);
      p.kd = 0;
    }
    sim.alarm = 0;
    this.load('baza', null);
    sim.ev({ e: 'msg', s: 'm.respawn' });
  }

  policeAllowed() {
    return !this.area.safe && this.area.id !== 'holownia';
  }

  /** Pasek życia bossa, z którym trwa walka. */
  private bossBar(): [string, number] | null {
    for (const b of this.bossesHere()) {
      const npcs = this.sim.npcs.filter((n) => n.boss === b.id);
      if (!npcs.length || !npcs[0].introDone || this.beaten.has(b.id)) continue;
      const hp = npcs.reduce((a, n) => a + Math.max(0, n.hp), 0);
      const max = npcs.reduce((a, n) => a + n.maxHp, 0);
      return [`boss.${b.id}`, Math.round((hp / max) * 100) / 100];
    }
    return null;
  }

  /** Czy obszar ma wyjście w tę stronę (do podpowiedzi). */
  exit(side: 'L' | 'R') {
    return this.area.exits.find((e) => e.side === side);
  }

  snap() {
    return {
      city: {
        ar: this.area.id,
        seq: this.seq,
        stamps: this.state.stamps,
        gnomes: this.state.gnomes,
        wait: this.exitT > 0 ? 1 : 0,
        boss: this.bossBar(),
        car: this.car ? ([Math.round(this.car.x), this.car.gone ? 1 : 0] as [number, 0 | 1]) : null,
      },
    };
  }
}
