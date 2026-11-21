/**
 * Symulacja świata gry — liczona WYŁĄCZNIE u hosta (lub w trybie solo).
 * Gość wysyła tylko swoją pozycję i przyciski, a dostaje snapshoty.
 */
import {
  CharId,
  ITEM_POS,
  NpcKind,
  PLAYER_START,
  WALK_BOTTOM,
  WALK_TOP,
  WORLD_W,
  AnimName,
} from './constants';
import { mulberry32, randomSeed, Rng } from './rng';
import { PROLOG, Role } from './data/areas';
import {
  attackDmg,
  baseStats,
  CharStats,
  dmgTaken,
  knockdownHits,
  knockdownTime,
  maxHp,
  sneakTimeMult,
  statsToArray,
  throwDmg,
} from './stats';
import {
  ActKind,
  AtkKind,
  GameEvent,
  HoldKind,
  NF_ALERT,
  NF_KO,
  NF_LOOTED,
  NF_RAGE,
  NF_ROBBED,
  NF_WARN,
  NpcSnap,
  PlayerInput,
  PlayerSnap,
  Snapshot,
} from './types';

export type NpcState =
  | 'idle'
  | 'walk'
  | 'hurt'
  | 'chase'
  | 'windup'
  | 'strike'
  | 'recover'
  | 'ko'
  | 'flee'
  | 'down'
  | 'getup'
  | 'held'
  | 'thrown';

export interface Npc {
  id: number;
  kind: NpcKind;
  role: Role;
  x: number;
  y: number;
  /** wysokość nad ziemią (trzymany / rzucony) */
  z: number;
  vz: number;
  face: 1 | -1;
  hp: number;
  maxHp: number;
  state: NpcState;
  t: number;
  turnT: number;
  warn: boolean;
  rage: boolean;
  robbed: boolean;
  looted: boolean;
  alertT: number;
  minX: number;
  maxX: number;
  speed: number;
  atkCd: number;
  vx: number;
  target: CharId | null;
  /** trafienia z rzędu (3 = przewrócenie) */
  combo: number;
  comboT: number;
  /** kto rzucił / trzyma */
  by: CharId | null;
  /** kogo już trafił w locie */
  hitIds: number[];
}

export interface PlayerSim {
  id: CharId;
  present: boolean;
  in: PlayerInput;
  lastAtk: number;
  hp: number;
  down: boolean;
  prog: number;
  kind: ActKind;
  actTarget: number;
  inCar: boolean;
  invuln: number;
  stats: CharStats;
  /** czas leżenia po przewróceniu */
  kd: number;
  /** trafienia z rzędu */
  hits: number;
  hitsT: number;
  /** id trzymanego wroga */
  holdNpc: number;
  /** po podniesieniu trzeba puścić AKCJĘ, zanim zadziała kolejna */
  latch: boolean;
}

const ACT_TIME: Record<Exclude<ActKind, ''>, number> = {
  pickpocket: 1.3,
  loot: 0.8,
  gnome: 1.6,
  lockpick: 2.4,
  bike: 0.8,
  carlock: 3.2,
  revive: 2.0,
  enter: 0.35,
  lift: 0.25,
  drop: 0.1,
};

const SNEAKY: ActKind[] = ['pickpocket', 'gnome', 'lockpick', 'carlock', 'bike'];
/** Akcje, których czas skraca Lekka ręka. */
const HANDY: ActKind[] = ['pickpocket', 'lockpick', 'carlock', 'loot'];

/** Życie NPC (gracz zadaje ~11–20 na cios). */
const BASE_HP: Record<NpcKind, number> = {
  herr: 40,
  frau: 30,
  jogger: 40,
  opa: 30,
  gartner: 50,
  boss: 60,
  polizei: 70,
};
const RAGE_HP = 30;
/** Surowe obrażenia ciosu NPC (przed Obroną). */
const NPC_DMG = 10;

/** Stany, w których NPC nie da się zwyczajnie uderzyć. */
const UNHITTABLE: NpcState[] = ['ko', 'down', 'getup', 'held', 'thrown'];
/** Stany „wyłączonego” NPC — nie widzi, nie atakuje. */
const DISABLED: NpcState[] = ['ko', 'flee', 'hurt', 'down', 'getup', 'held', 'thrown'];

export class Sim {
  players: Record<CharId, PlayerSim>;
  npcs: Npc[] = [];
  private nextId = 1;
  stage = 0;
  money = 0;
  alarm = 0;
  kos = 0;
  steals = 0;
  time = 0;
  gnome: 0 | 1 = 0;
  lockHp = 3;
  bike: 0 | 1 = 0;
  carUnlocked: 0 | 1 = 0;
  carGone: 0 | 1 = 0;
  carX = ITEM_POS.car.x;
  carT = 0;
  ended = false;
  private events: GameEvent[] = [];
  private policeCooldown = 0;
  private hintCd: Record<CharId, number> = { pole: 0, romanian: 0 };
  readonly rng: Rng;

  constructor(present: Record<CharId, boolean>, readonly solo: boolean, opts: { seed?: number } = {}) {
    this.rng = mulberry32(opts.seed ?? randomSeed());
    const mk = (id: CharId): PlayerSim => {
      const stats = baseStats(id);
      return {
        id,
        present: present[id],
        in: { x: PLAYER_START[id].x, y: PLAYER_START[id].y, z: 0, face: -1, anim: 'idle', atk: 0, ak: 'n', act: false },
        lastAtk: 0,
        hp: maxHp(stats),
        down: false,
        prog: 0,
        kind: '',
        actTarget: -1,
        inCar: false,
        invuln: 0,
        stats,
        kd: 0,
        hits: 0,
        hitsT: 0,
        holdNpc: -1,
        latch: false,
      };
    };
    this.players = { pole: mk('pole'), romanian: mk('romanian') };
    this.spawnLevelNpcs();
  }

  private rand(a: number, b: number) {
    return a + this.rng() * (b - a);
  }
  private randi(a: number, b: number) {
    return Math.floor(this.rand(a, b + 1));
  }

  // -------------------------------------------------------------------------
  addNpc(kind: NpcKind, role: Role, x: number, y: number, minX: number, maxX: number, face: 1 | -1 = -1): Npc {
    const hp = BASE_HP[kind];
    const speed = kind === 'jogger' ? 42 : kind === 'opa' ? 14 : kind === 'polizei' ? 50 : 22;
    const n: Npc = {
      id: this.nextId++,
      kind,
      role,
      x,
      y,
      z: 0,
      vz: 0,
      face,
      hp,
      maxHp: hp,
      state: role === 'guard' ? 'idle' : 'walk',
      t: this.rand(1, 4),
      turnT: this.rand(2, 5),
      warn: false,
      rage: false,
      robbed: false,
      looted: false,
      alertT: 0,
      minX,
      maxX,
      speed,
      atkCd: 0,
      vx: 0,
      target: null,
      combo: 0,
      comboT: 0,
      by: null,
      hitIds: [],
    };
    this.npcs.push(n);
    return n;
  }

  private spawnLevelNpcs() {
    for (const sp of PROLOG.spawns) this.addNpc(sp.kind, sp.role, sp.x, sp.y, sp.minX, sp.maxX, sp.face ?? -1);
  }

  // -------------------------------------------------------------------------
  private ev(e: GameEvent) {
    this.events.push(e);
  }
  private sfx(k: string) {
    this.ev({ e: 'sfx', k });
  }
  private txt(s: string, x: number, y: number, c = '#ffffff') {
    this.ev({ e: 'txt', s, x: Math.round(x), y: Math.round(y), c });
  }
  private hint(who: CharId, s: string) {
    if (this.hintCd[who] > 0) return;
    this.hintCd[who] = 2.5;
    this.ev({ e: 'msg', s, who });
  }

  private mate(p: PlayerSim): PlayerSim {
    return this.players[p.id === 'pole' ? 'romanian' : 'pole'];
  }

  private alive(): PlayerSim[] {
    return Object.values(this.players).filter((p) => p.present && !p.down && !p.inCar);
  }

  private npc(id: number): Npc | undefined {
    return this.npcs.find((q) => q.id === id);
  }

  /** Czy NPC widzi punkt (stoi przodem do niego i blisko). */
  private sees(n: Npc, x: number, y: number, range = 150): boolean {
    if (DISABLED.includes(n.state)) return false;
    const dx = x - n.x;
    return n.face * dx > -4 && Math.abs(dx) < range && Math.abs(y - n.y) < 70;
  }

  private enrage(n: Npc, by?: PlayerSim) {
    if (n.state === 'ko') return;
    if (!n.rage) {
      n.rage = true;
      n.maxHp += RAGE_HP;
      n.hp += RAGE_HP;
      this.txt(n.kind === 'polizei' ? 'HALT!' : 'WUT!', n.x, n.y - 46, '#ff3b3b');
      this.sfx('rage');
      this.alarm += n.kind === 'polizei' ? 25 : 10;
    }
    n.warn = false;
    n.alertT = 1;
    if (by) n.target = by.id;
    if (!DISABLED.includes(n.state)) {
      n.state = 'chase';
      n.t = 0;
    }
  }

  // -------------------------------------------------------------------------
  update(dt: number, inputs: Partial<Record<CharId, PlayerInput>>): Snapshot {
    this.time += dt;
    for (const id of ['pole', 'romanian'] as CharId[]) {
      const p = this.players[id];
      const inp = inputs[id];
      if (inp && p.present) {
        const newAtk = inp.atk;
        p.in = { ...inp, z: inp.z ?? 0, ak: inp.ak ?? 'n' };
        if (newAtk > p.lastAtk) {
          p.lastAtk = newAtk;
          if (!p.down && !p.inCar && p.kd <= 0) {
            if (p.holdNpc >= 0) this.throwHeld(p);
            else this.resolveAttack(p, p.in.ak);
          }
        }
      }
      p.invuln = Math.max(0, p.invuln - dt);
      p.kd = Math.max(0, p.kd - dt);
      p.hitsT = Math.max(0, p.hitsT - dt);
      if (p.hitsT <= 0) p.hits = 0;
      this.hintCd[id] = Math.max(0, this.hintCd[id] - dt);
    }
    if (!this.ended) {
      for (const p of Object.values(this.players)) if (p.present) this.updateAct(p, dt);
    }
    for (const n of this.npcs) this.updateNpc(n, dt);
    this.updateAlarm(dt);
    this.updateCar(dt);
    this.checkLose();
    return this.snapshot();
  }

  // -------------------------------------------------------------------------
  private knockOut(n: Npc) {
    n.hp = 0;
    n.state = 'ko';
    n.t = 10;
    n.z = 0;
    n.vz = 0;
    n.rage = false;
    this.kos++;
    this.sfx('ko');
    this.txt('K.O.!', n.x, n.y - 44, '#ffe040');
  }

  private knockDown(n: Npc, t = 1.1) {
    n.state = 'down';
    n.t = t;
    n.combo = 0;
  }

  /** Zadaje obrażenia NPC; zwraca true, jeśli padł (K.O.). */
  private damageNpc(n: Npc, dmg: number, knock: boolean, by?: PlayerSim): boolean {
    n.hp -= dmg;
    n.warn = false;
    if (n.hp <= 0) {
      this.knockOut(n);
      return true;
    }
    if (knock) {
      if (by) this.enrage(n, by);
      this.knockDown(n);
    } else {
      n.state = 'hurt';
      n.t = 0.35;
      this.enrage(n, by);
    }
    return false;
  }

  private resolveAttack(p: PlayerSim, ak: AtkKind) {
    const isPole = p.id === 'pole';
    const heavy = ak === 'j' || ak === 'r' || ak === 'c';
    const range = (isPole ? 32 : 28) + (ak === 'r' ? 6 : ak === 'j' ? 4 : 0);
    const dmg = Math.round(attackDmg(p.id, p.stats) * (heavy ? 1.25 : 1) * (ak === 'c' ? 1.6 : 1));
    const { x, y, face } = p.in;
    this.sfx('swing');
    let hitSomething = false;
    for (const n of this.npcs) {
      if (UNHITTABLE.includes(n.state)) continue;
      const dx = (n.x - x) * face;
      if (dx < -4 || dx > range || Math.abs(n.y - y) > 14) continue;
      hitSomething = true;
      n.combo = n.comboT > 0 ? n.combo + 1 : 1;
      n.comboT = 1.2;
      const knock = heavy || n.combo >= 3;
      n.vx = face * (knock ? 170 : isPole ? 110 : 140);
      n.face = (-face) as 1 | -1;
      this.ev({ e: 'fx', k: 'hit', x: n.x - face * 4, y: n.y - 22 });
      this.sfx(isPole ? 'hit' : 'kick');
      this.damageNpc(n, dmg, knock, p);
    }
    // kłódka roweru — tylko pałka Polaka (albo kopniaki w solo)
    if (this.stage === 1 && this.lockHp > 0) {
      const dx = (ITEM_POS.bike.x - x) * face;
      if (dx > -6 && dx < range + 10 && Math.abs(ITEM_POS.bike.y - y) < 20) {
        if (isPole || this.solo) {
          this.lockHp--;
          hitSomething = true;
          this.sfx('hit');
          this.ev({ e: 'fx', k: 'hit', x: ITEM_POS.bike.x - 6, y: ITEM_POS.bike.y - 8 });
          this.alarm += 8;
          if (this.lockHp <= 0) {
            this.txt('f.lock_broken', ITEM_POS.bike.x, ITEM_POS.bike.y - 30, '#ffe040');
            this.sfx('pickup');
          } else this.txt(`${this.lockHp}`, ITEM_POS.bike.x, ITEM_POS.bike.y - 26, '#ffffff');
        } else {
          this.hint(p.id, 'h.kick_lock');
        }
      }
    }
    if (hitSomething) this.witnesses(p, x, y);
  }

  /** Świadkowie bójki podnoszą alarm i czasem się wkurzają. */
  private witnesses(p: PlayerSim, x: number, y: number) {
    for (const w of this.npcs) {
      if (w.rage || DISABLED.includes(w.state)) continue;
      if (this.sees(w, x, y, 130)) {
        this.alarm += 5;
        w.alertT = 1.2;
        if (w.role === 'guard' || w.kind === 'polizei' || this.rng() < 0.3) this.enrage(w, p);
      }
    }
  }

  // --- chwyt i rzut ---------------------------------------------------------
  private throwHeld(p: PlayerSim) {
    const n = this.npc(p.holdNpc);
    p.holdNpc = -1;
    if (!n || n.state !== 'held') return;
    const face = p.in.face;
    n.state = 'thrown';
    n.x = p.in.x + face * 8;
    n.y = p.in.y;
    n.z = 22;
    n.vz = 50;
    n.vx = face * 240;
    n.face = (-face) as 1 | -1;
    n.by = p.id;
    n.hitIds = [];
    this.sfx('swing');
    this.witnesses(p, p.in.x, p.in.y);
  }

  /** Puszcza trzymanego wroga (przewrócenie gracza, AKCJA). */
  private releaseHeld(p: PlayerSim) {
    const n = this.npc(p.holdNpc);
    p.holdNpc = -1;
    if (!n || n.state !== 'held') return;
    n.z = 0;
    n.x = p.in.x + p.in.face * 12;
    n.y = p.in.y;
    this.knockDown(n, 0.6);
  }

  private updateThrown(n: Npc, dt: number) {
    n.x += n.vx * dt;
    n.z += n.vz * dt;
    n.vz -= 600 * dt;
    const thrower = n.by ? this.players[n.by] : undefined;
    const dmg = thrower ? throwDmg(thrower.stats) : 15;
    for (const o of this.npcs) {
      if (o === n || UNHITTABLE.includes(o.state) || n.hitIds.includes(o.id)) continue;
      if (Math.abs(o.x - n.x) > 14 || Math.abs(o.y - n.y) > 12 || n.z > 30) continue;
      n.hitIds.push(o.id);
      o.vx = Math.sign(n.vx) * 150;
      o.face = (-Math.sign(n.vx) || 1) as 1 | -1;
      this.ev({ e: 'fx', k: 'hit', x: o.x, y: o.y - 18 });
      this.sfx('hit');
      this.damageNpc(o, dmg, true, thrower);
    }
    if (n.x < 4 || n.x > WORLD_W - 4) n.vx = 0;
    if (n.z <= 0) {
      n.z = 0;
      n.vz = 0;
      n.vx *= 0.3;
      this.ev({ e: 'fx', k: 'dust', x: n.x, y: n.y });
      this.sfx('hit');
      this.damageNpc(n, Math.round(dmg * 0.5), true, thrower);
    }
  }

  // -------------------------------------------------------------------------
  private near(p: PlayerSim, x: number, y: number, rx: number, ry: number) {
    return Math.abs(p.in.x - x) < rx && Math.abs(p.in.y - y) < ry;
  }

  private chooseAct(p: PlayerSim): { kind: ActKind; target: number } {
    const other = this.mate(p);
    if (p.holdNpc >= 0) return { kind: 'drop', target: p.holdNpc };
    // reanimacja kumpla
    if (other.present && other.down && this.near(p, other.in.x, other.in.y, 28, 16)) return { kind: 'revive', target: 100 };
    // cele poziomów
    if (this.stage === 0 && !this.gnome && this.near(p, ITEM_POS.gnome.x, ITEM_POS.gnome.y, 22, 18)) return { kind: 'gnome', target: 200 };
    if (this.stage === 1 && !this.bike && this.near(p, ITEM_POS.bike.x, ITEM_POS.bike.y, 26, 20)) {
      if (this.lockHp > 0) {
        if (p.id === 'romanian') return { kind: 'lockpick', target: 201 };
        this.hint(p.id, 'h.bike_locked');
        return { kind: '', target: -1 };
      }
      return { kind: 'bike', target: 202 };
    }
    if (this.stage === 2 && !this.carGone && this.near(p, this.carX, ITEM_POS.car.y, 56, 22)) {
      if (!this.carUnlocked) {
        if (p.id === 'romanian' || !other.present) return { kind: 'carlock', target: 203 };
        this.hint(p.id, 'h.only_rom_car');
        return { kind: '', target: -1 };
      }
      if (!p.inCar) return { kind: 'enter', target: 204 };
    }
    // przewrócony wróg — podnieś i rzuć
    for (const n of this.npcs) {
      if (n.state !== 'down' || n.z > 0) continue;
      if (Math.abs(n.x - p.in.x) < 30 && Math.abs(n.y - p.in.y) < 14) return { kind: 'lift', target: n.id };
    }
    // przeszukanie znokautowanego
    let best: Npc | null = null;
    let bd = 1e9;
    for (const n of this.npcs) {
      const d = Math.abs(n.x - p.in.x) + Math.abs(n.y - p.in.y) * 2;
      if (d > 50 || d >= bd) continue;
      if (n.state === 'ko' && !n.looted && Math.abs(n.x - p.in.x) < 36 && Math.abs(n.y - p.in.y) < 14) {
        best = n;
        bd = d;
      }
    }
    if (best) return { kind: 'loot', target: best.id };
    // kieszonkowiec — tylko Rumun, od tyłu
    if (p.id === 'romanian') {
      for (const n of this.npcs) {
        if (n.robbed || n.rage || DISABLED.includes(n.state)) continue;
        if (Math.abs(n.x - p.in.x) > 26 || Math.abs(n.y - p.in.y) > 12) continue;
        const behind = n.face * (p.in.x - n.x) < 0;
        if (behind) return { kind: 'pickpocket', target: n.id };
        this.hint(p.id, 'h.facing');
        return { kind: '', target: -1 };
      }
    } else {
      for (const n of this.npcs) {
        if (n.robbed || n.rage || DISABLED.includes(n.state)) continue;
        // podpowiedź tylko przy podchodzeniu od tyłu (przodem to blok)
        const behind = n.face * (p.in.x - n.x) < 0;
        if (behind && Math.abs(n.x - p.in.x) < 26 && Math.abs(n.y - p.in.y) < 12) {
          this.hint(p.id, 'h.pole_no_pick');
          break;
        }
      }
    }
    return { kind: '', target: -1 };
  }

  private updateAct(p: PlayerSim, dt: number) {
    if (p.down || p.inCar || p.kd > 0) {
      p.prog = 0;
      p.kind = '';
      return;
    }
    if (!p.in.act) p.latch = false;
    if (p.latch) return;
    if (!p.in.act) {
      // puszczony przycisk: postęp powoli maleje
      p.prog = Math.max(0, p.prog - dt * 0.25);
      if (p.prog === 0) p.kind = '';
      return;
    }
    // ktoś się odwrócił w trakcie cichej roboty? -> przyłapany
    if (p.prog > 0 && SNEAKY.includes(p.kind) && this.caught(p, p.kind)) return;
    const { kind, target } = this.chooseAct(p);
    if (kind !== p.kind || target !== p.actTarget) {
      p.prog = 0;
      p.kind = kind;
      p.actTarget = target;
    }
    if (!kind) return;

    // wykrycie przy cichych akcjach
    if (SNEAKY.includes(kind) && this.caught(p, kind)) return;
    // auto: Polak musi stać na czatach
    if (kind === 'carlock') {
      const other = this.players.pole;
      if (p.id === 'romanian' && other.present && !other.down && !this.near(other, this.carX, ITEM_POS.car.y, 90, 60)) {
        this.hint(p.id, 'h.lookout');
        return;
      }
      if (this.rng() < dt * 6) this.sfx('pick');
    }
    if (kind === 'lockpick' && this.rng() < dt * 6) this.sfx('pick');

    const time = ACT_TIME[kind] * (HANDY.includes(kind) ? sneakTimeMult(p.stats) : 1);
    p.prog += dt / time;
    if (p.prog < 1) return;
    p.prog = 0;
    this.completeAct(p, kind, target);
    p.kind = '';
  }

  /** Sprawdza, czy ktoś widzi gracza przy cichej robocie. Jeśli tak — rage. */
  private caught(p: PlayerSim, kind: ActKind): boolean {
    for (const n of this.npcs) {
      if (n.rage || DISABLED.includes(n.state)) continue;
      const range = n.role === 'guard' ? 170 : 110;
      if (!this.sees(n, p.in.x, p.in.y, range)) continue;
      p.prog = 0;
      p.kind = '';
      this.sfx('alert');
      this.alarm += 20;
      this.txt('!', n.x, n.y - 50, '#ff3b3b');
      this.enrage(n, p);
      if (kind === 'pickpocket') this.ev({ e: 'msg', s: 'm.caught_pick', who: p.id });
      else this.ev({ e: 'msg', s: 'm.caught', who: p.id });
      return true;
    }
    return false;
  }

  private completeAct(p: PlayerSim, kind: ActKind, target: number) {
    const n = this.npc(target);
    switch (kind) {
      case 'pickpocket': {
        if (!n) return;
        n.robbed = true;
        const amount = this.randi(20, 80);
        this.money += amount;
        this.steals++;
        this.sfx('steal');
        this.sfx('coin');
        this.txt(`+${amount}€`, n.x, n.y - 44, '#ffe040');
        this.ev({ e: 'fx', k: 'coin', x: n.x, y: n.y - 30 });
        break;
      }
      case 'loot': {
        if (!n) return;
        n.looted = true;
        const amount = n.kind === 'polizei' ? this.randi(60, 120) : this.randi(10, 50);
        this.money += amount;
        this.sfx('coin');
        this.txt(`+${amount}€`, n.x, n.y - 30, '#ffe040');
        this.ev({ e: 'fx', k: 'coin', x: n.x, y: n.y - 20 });
        break;
      }
      case 'lift': {
        if (!n || n.state !== 'down') return;
        n.state = 'held';
        n.t = 4;
        n.by = p.id;
        p.holdNpc = n.id;
        p.latch = true;
        this.sfx('click');
        break;
      }
      case 'drop':
        this.releaseHeld(p);
        break;
      case 'revive': {
        const other = this.mate(p);
        other.down = false;
        other.hp = Math.ceil(maxHp(other.stats) / 2);
        other.invuln = 1.5;
        this.sfx('pickup');
        this.txt('f.revive', other.in.x, other.in.y - 44, '#7dff7d');
        break;
      }
      case 'gnome':
        this.gnome = 1;
        this.steals++;
        this.sfx('pickup');
        this.txt('f.gnome', ITEM_POS.gnome.x, ITEM_POS.gnome.y - 30, '#ffe040');
        this.money += 50;
        this.advanceStage(1, 'm.gnome_done');
        break;
      case 'lockpick':
        this.lockHp = 0;
        this.sfx('pickup');
        this.txt('f.unlocked', ITEM_POS.bike.x, ITEM_POS.bike.y - 30, '#ffe040');
        break;
      case 'bike':
        this.bike = 1;
        this.steals++;
        this.money += 120;
        this.sfx('pickup');
        this.txt('f.bike', ITEM_POS.bike.x, ITEM_POS.bike.y - 30, '#ffe040');
        this.advanceStage(2, 'm.bike_done');
        break;
      case 'carlock':
        this.carUnlocked = 1;
        this.sfx('pickup');
        this.txt('f.car_unlocked', this.carX, ITEM_POS.car.y - 50, '#ffe040');
        this.ev({ e: 'msg', s: 'm.car_open' });
        break;
      case 'enter':
        p.inCar = true;
        this.releaseHeld(p);
        this.sfx('click');
        if (Object.values(this.players).every((q) => !q.present || q.inCar)) {
          this.carGone = 1;
          this.carT = 0;
          this.sfx('engine');
          this.steals++;
          this.ev({ e: 'msg', s: 'm.escape' });
        } else {
          this.ev({ e: 'msg', s: 'm.wait_car', who: p.id });
        }
        break;
    }
  }

  private advanceStage(stage: number, msg: string) {
    this.stage = stage;
    this.ev({ e: 'stage', stage });
    this.ev({ e: 'msg', s: msg });
  }

  // -------------------------------------------------------------------------
  private updateNpc(n: Npc, dt: number) {
    n.alertT = Math.max(0, n.alertT - dt);
    n.atkCd = Math.max(0, n.atkCd - dt);
    n.comboT = Math.max(0, n.comboT - dt);
    if (n.comboT <= 0) n.combo = 0;
    if (n.state === 'held') {
      this.updateHeld(n, dt);
      return;
    }
    if (n.state === 'thrown') {
      this.updateThrown(n, dt);
      n.x = Math.max(4, Math.min(WORLD_W - 4, n.x));
      return;
    }
    // odrzut
    if (n.vx !== 0) {
      n.x += n.vx * dt;
      n.vx *= Math.pow(0.002, dt);
      if (Math.abs(n.vx) < 3) n.vx = 0;
    }
    n.x = Math.max(4, Math.min(WORLD_W - 4, n.x));
    n.y = Math.max(WALK_TOP, Math.min(WALK_BOTTOM, n.y));

    const spd = n.speed * (n.rage ? 1.7 : 1);
    switch (n.state) {
      case 'ko':
        n.t -= dt;
        if (n.t <= 0) {
          n.state = 'flee';
          n.t = 5;
          n.hp = Math.ceil(n.maxHp / 2);
          n.rage = false;
        }
        return;
      case 'down':
        n.t -= dt;
        if (n.t <= 0) {
          n.state = 'getup';
          n.t = 0.4;
        }
        return;
      case 'getup':
        n.t -= dt;
        if (n.t <= 0) n.state = n.rage ? 'chase' : 'walk';
        return;
      case 'hurt':
        n.t -= dt;
        if (n.t <= 0) n.state = n.rage ? 'chase' : 'walk';
        return;
      case 'flee': {
        n.t -= dt;
        const pl = this.nearestPlayer(n);
        const dir = pl ? Math.sign(n.x - pl.in.x) || 1 : n.face;
        n.face = dir as 1 | -1;
        n.x += dir * 55 * dt;
        if (n.t <= 0) {
          n.state = 'walk';
          n.t = this.rand(2, 4);
        }
        return;
      }
      case 'windup':
        n.t -= dt;
        if (n.t <= 0) {
          n.state = 'strike';
          n.t = 0.15;
          this.npcStrike(n);
        }
        return;
      case 'strike':
        n.t -= dt;
        if (n.t <= 0) {
          n.state = 'recover';
          n.t = n.rage ? 0.35 : 0.5;
        }
        return;
      case 'recover':
        n.t -= dt;
        if (n.t <= 0) n.state = 'chase';
        return;
      case 'chase': {
        let tgt = n.target ? this.players[n.target] : null;
        if (!tgt || !tgt.present || tgt.down || tgt.inCar) {
          tgt = this.nearestPlayer(n);
          n.target = tgt ? tgt.id : null;
        }
        if (!tgt) {
          n.t += dt;
          if (n.t > 2) {
            n.state = 'walk';
            n.rage = n.kind === 'polizei' && n.role === 'police';
          }
          return;
        }
        const dx = tgt.in.x - n.x;
        const dy = tgt.in.y - n.y;
        n.face = (dx >= 0 ? 1 : -1) as 1 | -1;
        const wantX = tgt.in.x - n.face * 18;
        const mx = wantX - n.x;
        if (Math.abs(mx) > 2) n.x += Math.sign(mx) * Math.min(Math.abs(mx), spd * dt);
        if (Math.abs(dy) > 2) n.y += Math.sign(dy) * Math.min(Math.abs(dy), spd * 0.7 * dt);
        if (Math.abs(dx) < 26 && Math.abs(dy) < 8 && n.atkCd <= 0) {
          n.state = 'windup';
          n.t = n.rage ? 0.3 : 0.4;
        }
        return;
      }
      case 'idle':
      case 'walk': {
        if (n.rage) {
          n.state = 'chase';
          return;
        }
        // obracanie się — z ostrzeżeniem "?"
        n.turnT -= dt;
        n.warn = n.turnT < 0.75;
        if (n.turnT <= 0) {
          n.face = (-n.face) as 1 | -1;
          n.turnT = n.role === 'guard' ? this.rand(1.8, 4.2) : this.rand(2.6, 5.5);
          n.warn = false;
        }
        n.t -= dt;
        if (n.role === 'guard') {
          n.state = 'idle';
          return;
        }
        if (n.t <= 0) {
          n.state = n.state === 'walk' ? 'idle' : 'walk';
          n.t = n.state === 'walk' ? this.rand(2, 5) : this.rand(1.5, 3.5);
        }
        if (n.state === 'walk') {
          n.x += n.face * spd * dt;
          if (n.x < n.minX) {
            n.x = n.minX;
            n.face = 1;
            n.turnT = this.rand(2.6, 5.5);
          } else if (n.x > n.maxX) {
            n.x = n.maxX;
            n.face = -1;
            n.turnT = this.rand(2.6, 5.5);
          }
        }
        return;
      }
    }
  }

  /** Trzymany nad głową — wyrywa się po kilku sekundach. */
  private updateHeld(n: Npc, dt: number) {
    const p = n.by ? this.players[n.by] : null;
    n.t -= dt;
    if (!p || p.holdNpc !== n.id || p.down || p.kd > 0 || p.inCar || n.t <= 0) {
      if (p && p.holdNpc === n.id) p.holdNpc = -1;
      n.z = 0;
      n.state = 'chase';
      n.atkCd = 0.6;
      if (p) this.enrage(n, p);
      return;
    }
    n.x = p.in.x;
    n.y = p.in.y + 0.5;
    n.z = 24 + p.in.z;
    n.face = p.in.face;
  }

  private nearestPlayer(n: Npc): PlayerSim | null {
    let best: PlayerSim | null = null;
    let bd = 1e9;
    for (const p of this.alive()) {
      const d = Math.abs(p.in.x - n.x) + Math.abs(p.in.y - n.y);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }

  private npcStrike(n: Npc) {
    n.atkCd = n.rage ? 0.6 : 1.0;
    const raw = n.rage ? NPC_DMG * 2 : NPC_DMG;
    for (const p of this.alive()) {
      const dx = (p.in.x - n.x) * n.face;
      if (dx < -4 || dx > 30 || Math.abs(p.in.y - n.y) > 12) continue;
      if (p.in.z >= 12) continue; // przeskoczył
      if (p.invuln > 0 || p.kd > 0) continue;
      const blocking = p.in.anim === 'block' && p.in.face === -n.face;
      this.hurtPlayer(p, raw, n.face, blocking);
    }
  }

  /** Zadaje obrażenia graczowi (z blokiem i przewracaniem). */
  hurtPlayer(p: PlayerSim, raw: number, dir: 1 | -1, blocking = false) {
    if (blocking) {
      p.hp -= Math.max(1, Math.round(dmgTaken(raw, p.stats) * 0.25));
      p.invuln = 0.3;
      this.sfx('block');
      this.ev({ e: 'fx', k: 'hit', x: p.in.x + dir * -6, y: p.in.y - 24 });
    } else {
      p.hp -= dmgTaken(raw, p.stats);
      p.hits++;
      p.hitsT = 1.2;
      this.sfx('hurt');
      this.ev({ e: 'fx', k: 'hit', x: p.in.x, y: p.in.y - 22 });
      if (p.hits >= knockdownHits(p.stats) || p.in.z > 4) {
        p.hits = 0;
        p.kd = knockdownTime(p.stats);
        p.invuln = p.kd + 0.6;
        this.releaseHeld(p);
        this.ev({ e: 'hurt', who: p.id, dx: dir * 22, kd: p.kd });
      } else {
        p.invuln = 0.7;
        this.ev({ e: 'hurt', who: p.id, dx: dir * 14 });
      }
    }
    if (p.hp <= 0) {
      p.hp = 0;
      p.down = true;
      p.prog = 0;
      this.releaseHeld(p);
      this.sfx('ko');
      const other = this.mate(p);
      this.ev({
        e: 'msg',
        s: other.present && !other.down ? 'm.down_partner' : 'm.down_self',
        a: { who: `char.${p.id}` },
      });
    }
  }

  // -------------------------------------------------------------------------
  private updateAlarm(dt: number) {
    const raging = this.npcs.some((n) => n.rage && n.state !== 'ko');
    if (!raging) this.alarm -= dt * 2.5;
    this.alarm = Math.max(0, Math.min(100, this.alarm));
    this.policeCooldown = Math.max(0, this.policeCooldown - dt);
    if (this.alarm >= 100 && this.policeCooldown <= 0 && !this.ended) {
      const policeAlive = this.npcs.filter((n) => n.role === 'police' && n.state !== 'ko').length;
      if (policeAlive < 4) {
        const alive = this.alive();
        const cx = alive.length ? alive.reduce((s, p) => s + p.in.x, 0) / alive.length : 1500;
        for (const side of [-1, 1]) {
          const x = Math.max(10, Math.min(WORLD_W - 10, cx + side * 250));
          const cop = this.addNpc('polizei', 'police', x, this.rand(WALK_TOP + 10, WALK_BOTTOM - 10), 0, WORLD_W, (-side) as 1 | -1);
          this.enrage(cop);
        }
        this.sfx('siren');
        this.ev({ e: 'msg', s: 'm.police' });
      }
      this.alarm = 45;
      this.policeCooldown = 12;
    }
  }

  private updateCar(dt: number) {
    if (!this.carGone) return;
    this.carT += dt;
    this.carX += Math.min(260, 40 + this.carT * 140) * dt;
    if (this.carT > 3.2 && !this.ended) {
      this.ended = true;
      this.sfx('win');
      this.ev({ e: 'end', win: true, reason: 'end.win_reason' });
    }
  }

  private checkLose() {
    if (this.ended) return;
    const present = Object.values(this.players).filter((p) => p.present);
    if (present.length && present.every((p) => p.down)) {
      this.ended = true;
      this.sfx('lose');
      this.ev({ e: 'end', win: false, reason: 'end.lose_reason' });
    }
  }

  // -------------------------------------------------------------------------
  private npcAnim(n: Npc): AnimName {
    switch (n.state) {
      case 'ko':
      case 'down':
      case 'held':
      case 'thrown':
        return 'down';
      case 'hurt':
      case 'getup':
        return 'hurt';
      case 'windup':
      case 'strike':
      case 'recover':
        return 'atk';
      case 'walk':
      case 'flee':
        return 'walk';
      case 'chase':
        return 'walk';
      default:
        return 'idle';
    }
  }

  snapshot(): Snapshot {
    const n: NpcSnap[] = this.npcs.map((q) => {
      let f = 0;
      if (q.rage) f |= NF_RAGE;
      if (q.warn && !q.rage && !DISABLED.includes(q.state)) f |= NF_WARN;
      if (q.state === 'ko') f |= NF_KO;
      if (q.robbed) f |= NF_ROBBED;
      if (q.alertT > 0) f |= NF_ALERT;
      if (q.looted) f |= NF_LOOTED;
      return [
        q.id,
        q.kind,
        Math.round(q.x * 10) / 10,
        Math.round(q.y * 10) / 10,
        q.face,
        this.npcAnim(q),
        f,
        Math.round((q.hp / q.maxHp) * 100) / 100,
        Math.round(q.z),
      ];
    });
    const mkP = (p: PlayerSim): PlayerSnap => ({
      x: p.in.x,
      y: p.in.y,
      z: p.in.z,
      face: p.in.face,
      anim: p.down ? 'down' : p.in.anim,
      hp: p.hp,
      down: p.down,
      prog: Math.round(p.prog * 100) / 100,
      kind: p.kind,
      inCar: p.inCar,
      present: p.present,
      mhp: maxHp(p.stats),
      kd: Math.round(p.kd * 100) / 100,
      hold: (p.holdNpc >= 0 ? 1 : 0) as HoldKind,
      st: statsToArray(p.stats),
    });
    const ev = this.events;
    this.events = [];
    return {
      t: Math.round(this.time * 100) / 100,
      p: { pole: mkP(this.players.pole), romanian: mkP(this.players.romanian) },
      n,
      o: { gnome: this.gnome, lockHp: this.lockHp, bike: this.bike, carUnlocked: this.carUnlocked, carGone: this.carGone, carX: Math.round(this.carX) },
      money: this.money,
      alarm: Math.round(this.alarm),
      stage: this.stage,
      kos: this.kos,
      steals: this.steals,
      ev,
    };
  }
}
