/** Rozdział II: miasto Ordnungsburg — obszary, wyjścia, sklepy, automaty Pfand, kara za porażkę. */
import { WALK_BOTTOM, WALK_TOP } from '../constants';
import { ALL_STAMPS, CITY, CityArea, CityAreaId, DOOR_Y } from '../data/city';
import type { PlayerSim, Sim } from '../Sim';
import { maxHp } from '../stats';
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

export function emptyCityState(): CityState {
  return { stamps: 0, gnomes: 0, flags: 0, pfand: 0 };
}

/** Ile sekund czeka się przy wyjściu na kumpla, zanim zostanie „dociągnięty”. */
export const EXIT_WAIT = 3;
const EDGE = 14;

export class CityRules implements ChapterRules {
  readonly chapter = 2;
  seq = 0;
  area!: CityArea;
  state: CityState;
  private exitT = 0;
  private respawnT = 0;

  constructor(
    private sim: Sim,
    state?: Partial<CityState>,
    private start: CityAreaId = 'baza',
  ) {
    this.state = { ...emptyCityState(), ...state };
  }

  init() {
    this.load(this.start, null);
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
    if (a.safe) sim.ev({ e: 'save' });
  }

  update(dt: number) {
    const sim = this.sim;
    if (this.respawnT > 0) {
      this.respawnT -= dt;
      if (this.respawnT <= 0) this.respawn();
      return;
    }
    // wyjścia na krawędziach
    const active = Object.values(sim.players).filter((p) => p.present && !p.down && !p.shop);
    let side: 'L' | 'R' | null = null;
    let atExit = 0;
    for (const p of active) {
      const s = p.in.x < EDGE ? 'L' : p.in.x > this.area.w - EDGE ? 'R' : null;
      if (!s) continue;
      const ex = this.area.exits.find((e) => e.side === s);
      if (!ex) continue;
      if (ex.needStamps && this.state.stamps !== ALL_STAMPS) {
        sim.hint(p.id, 'h.gate');
        continue;
      }
      side = s;
      atExit++;
    }
    if (!side) {
      this.exitT = 0;
      return;
    }
    const everyone = Object.values(sim.players).filter((p) => p.present).length;
    this.exitT += dt;
    if (atExit >= everyone || this.exitT >= EXIT_WAIT) {
      const ex = this.area.exits.find((e) => e.side === side)!;
      this.load(ex.to, side);
    } else if (this.exitT < dt * 1.5) {
      sim.ev({ e: 'msg', s: 'm.wait_exit' });
    }
  }

  chooseAct(p: PlayerSim): ActChoice | null {
    const sim = this.sim;
    if (p.in.y > DOOR_Y + 14) return null;
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
    return !this.area.safe;
  }

  /** Czy obszar ma wyjście w tę stronę (do podpowiedzi). */
  exit(side: 'L' | 'R') {
    return this.area.exits.find((e) => e.side === side);
  }

  snap() {
    return {
      city: { ar: this.area.id, seq: this.seq, stamps: this.state.stamps, wait: Math.min(1, this.exitT / EXIT_WAIT) },
    };
  }
}
