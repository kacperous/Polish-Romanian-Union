/** Rozdział I (prolog): krasnal → rower → auto, potem ucieczka na wschód. */
import { ITEM_POS } from '../constants';
import { PROLOG } from '../data/areas';
import type { PlayerSim, Sim } from '../Sim';
import type { ActKind } from '../types';
import type { ActChoice, ChapterRules } from './rules';

export class PrologRules implements ChapterRules {
  readonly chapter = 1;
  readonly seq = 0;
  gnome: 0 | 1 = 0;
  lockHp = 3;
  bike: 0 | 1 = 0;
  carUnlocked: 0 | 1 = 0;
  carGone: 0 | 1 = 0;
  carX = ITEM_POS.car.x;
  carT = 0;

  constructor(private sim: Sim) {}

  init() {
    const sim = this.sim;
    sim.areaW = PROLOG.w;
    for (const sp of PROLOG.spawns) sim.addNpc(sp.kind, sp.role, sp.x, sp.y, sp.minX, sp.maxX, sp.face ?? -1);
    for (const it of PROLOG.items ?? []) sim.addItem(it.kind, it.x, it.y);
  }

  chooseAct(p: PlayerSim): ActChoice | null {
    const sim = this.sim;
    const other = sim.mate(p);
    const stage = sim.stage;
    if (stage === 0 && !this.gnome && sim.near(p, ITEM_POS.gnome.x, ITEM_POS.gnome.y, 22, 18)) return { kind: 'gnome', target: 200 };
    if (stage === 1 && !this.bike && sim.near(p, ITEM_POS.bike.x, ITEM_POS.bike.y, 26, 20)) {
      if (this.lockHp > 0) {
        if (p.id === 'romanian') return { kind: 'lockpick', target: 201 };
        sim.hint(p.id, 'h.bike_locked');
        return { kind: '', target: -1 };
      }
      return { kind: 'bike', target: 202 };
    }
    if (stage === 2 && !this.carGone && sim.near(p, this.carX, ITEM_POS.car.y, 56, 22)) {
      if (!this.carUnlocked) {
        if (p.id === 'romanian' || !other.present) return { kind: 'carlock', target: 203 };
        sim.hint(p.id, 'h.only_rom_car');
        return { kind: '', target: -1 };
      }
      if (!p.inCar) return { kind: 'enter', target: 204 };
    }
    return null;
  }

  canProgress(p: PlayerSim, kind: ActKind, dt: number): boolean {
    const sim = this.sim;
    if (kind === 'carlock') {
      // auto: Polak musi stać na czatach
      const other = sim.players.pole;
      if (p.id === 'romanian' && other.present && !other.down && !sim.near(other, this.carX, ITEM_POS.car.y, 90, 60)) {
        sim.hint(p.id, 'h.lookout');
        return false;
      }
      if (sim.rng() < dt * 6) sim.sfx('pick');
    }
    if (kind === 'lockpick' && sim.rng() < dt * 6) sim.sfx('pick');
    return true;
  }

  completeAct(p: PlayerSim, kind: ActKind): boolean {
    const sim = this.sim;
    switch (kind) {
      case 'gnome':
        this.gnome = 1;
        sim.steals++;
        sim.sfx('pickup');
        sim.txt('f.gnome', ITEM_POS.gnome.x, ITEM_POS.gnome.y - 30, '#ffe040');
        sim.money += 50;
        sim.advanceStage(1, 'm.gnome_done');
        return true;
      case 'lockpick':
        this.lockHp = 0;
        sim.sfx('pickup');
        sim.txt('f.unlocked', ITEM_POS.bike.x, ITEM_POS.bike.y - 30, '#ffe040');
        return true;
      case 'bike':
        this.bike = 1;
        sim.steals++;
        sim.money += 120;
        sim.sfx('pickup');
        sim.txt('f.bike', ITEM_POS.bike.x, ITEM_POS.bike.y - 30, '#ffe040');
        sim.advanceStage(2, 'm.bike_done');
        return true;
      case 'carlock':
        this.carUnlocked = 1;
        sim.sfx('pickup');
        sim.txt('f.car_unlocked', this.carX, ITEM_POS.car.y - 50, '#ffe040');
        sim.ev({ e: 'msg', s: 'm.car_open' });
        return true;
      case 'enter':
        p.inCar = true;
        sim.releaseHeld(p);
        sim.playerDrop(p);
        sim.sfx('click');
        if (Object.values(sim.players).every((q) => !q.present || q.inCar)) {
          this.carGone = 1;
          this.carT = 0;
          sim.sfx('engine');
          sim.steals++;
          sim.ev({ e: 'msg', s: 'm.escape' });
        } else {
          sim.ev({ e: 'msg', s: 'm.wait_car', who: p.id });
        }
        return true;
    }
    return false;
  }

  /** Kłódka roweru — tylko pałka Polaka (albo kopniaki w solo). */
  onAttack(p: PlayerSim, x: number, y: number, face: 1 | -1, range: number): boolean {
    const sim = this.sim;
    if (sim.stage !== 1 || this.lockHp <= 0) return false;
    const dx = (ITEM_POS.bike.x - x) * face;
    if (dx <= -6 || dx >= range + 10 || Math.abs(ITEM_POS.bike.y - y) >= 20) return false;
    if (p.id !== 'pole' && !sim.solo) {
      sim.hint(p.id, 'h.kick_lock');
      return false;
    }
    this.lockHp--;
    sim.sfx('hit');
    sim.ev({ e: 'fx', k: 'hit', x: ITEM_POS.bike.x - 6, y: ITEM_POS.bike.y - 8 });
    sim.alarm += 8;
    if (this.lockHp <= 0) {
      sim.txt('f.lock_broken', ITEM_POS.bike.x, ITEM_POS.bike.y - 30, '#ffe040');
      sim.sfx('pickup');
    } else sim.txt(`${this.lockHp}`, ITEM_POS.bike.x, ITEM_POS.bike.y - 26, '#ffffff');
    return true;
  }

  update(dt: number) {
    const sim = this.sim;
    if (!this.carGone) return;
    this.carT += dt;
    this.carX += Math.min(260, 40 + this.carT * 140) * dt;
    if (this.carT > 3.2 && !sim.ended) {
      sim.ended = true;
      sim.sfx('win');
      sim.ev({ e: 'end', win: true, reason: 'end.win_reason' });
    }
  }

  onAllDown() {
    const sim = this.sim;
    sim.ended = true;
    sim.sfx('lose');
    sim.ev({ e: 'end', win: false, reason: 'end.lose_reason' });
  }

  policeAllowed() {
    return true;
  }

  snap() {
    return {
      o: { gnome: this.gnome, lockHp: this.lockHp, bike: this.bike, carUnlocked: this.carUnlocked, carGone: this.carGone, carX: Math.round(this.carX) },
    };
  }
}
