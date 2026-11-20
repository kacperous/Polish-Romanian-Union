/**
 * Symulacja świata gry — liczona WYŁĄCZNIE u hosta (lub w trybie solo).
 * Gość wysyła tylko swoją pozycję i przyciski, a dostaje snapshoty.
 */
import {
  CharId,
  ITEM_POS,
  LEVELS,
  NpcKind,
  PLAYER_MAX_HP,
  PLAYER_START,
  WALK_BOTTOM,
  WALK_TOP,
  WORLD_W,
  AnimName,
} from './constants';
import {
  ActKind,
  GameEvent,
  NF_ALERT,
  NF_KO,
  NF_LOOTED,
  NF_RAGE,
  NF_ROBBED,
  NF_WARN,
  NpcSnap,
  PlayerInput,
  Snapshot,
} from './types';

type NpcState = 'idle' | 'walk' | 'hurt' | 'chase' | 'windup' | 'strike' | 'recover' | 'ko' | 'flee';
type Role = 'walker' | 'guard' | 'police';

interface Npc {
  id: number;
  kind: NpcKind;
  role: Role;
  x: number;
  y: number;
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
}

interface PlayerSim {
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
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const randi = (a: number, b: number) => Math.floor(rand(a, b + 1));

const ACT_TIME: Record<Exclude<ActKind, ''>, number> = {
  pickpocket: 1.3,
  loot: 0.8,
  gnome: 1.6,
  lockpick: 2.4,
  bike: 0.8,
  carlock: 3.2,
  revive: 2.0,
  enter: 0.35,
};

const SNEAKY: ActKind[] = ['pickpocket', 'gnome', 'lockpick', 'carlock', 'bike'];

const BASE_HP: Record<NpcKind, number> = {
  herr: 4,
  frau: 3,
  jogger: 4,
  opa: 3,
  gartner: 5,
  boss: 6,
  polizei: 7,
};

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

  constructor(present: Record<CharId, boolean>, readonly solo: boolean) {
    const mk = (id: CharId): PlayerSim => ({
      id,
      present: present[id],
      in: { x: PLAYER_START[id].x, y: PLAYER_START[id].y, face: -1, anim: 'idle', atk: 0, act: false },
      lastAtk: 0,
      hp: PLAYER_MAX_HP,
      down: false,
      prog: 0,
      kind: '',
      actTarget: -1,
      inCar: false,
      invuln: 0,
    });
    this.players = { pole: mk('pole'), romanian: mk('romanian') };
    this.spawnLevelNpcs();
  }

  // -------------------------------------------------------------------------
  private addNpc(kind: NpcKind, role: Role, x: number, y: number, minX: number, maxX: number, face: 1 | -1 = -1) {
    const hp = BASE_HP[kind];
    const speed = kind === 'jogger' ? 42 : kind === 'opa' ? 14 : kind === 'polizei' ? 50 : 22;
    const n: Npc = {
      id: this.nextId++,
      kind,
      role,
      x,
      y,
      face,
      hp,
      maxHp: hp,
      state: role === 'guard' ? 'idle' : 'walk',
      t: rand(1, 4),
      turnT: rand(2, 5),
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
    };
    this.npcs.push(n);
    return n;
  }

  private spawnLevelNpcs() {
    const [l1, l2, l3] = LEVELS;
    // Poziom 1 — przedmieście
    this.addNpc('gartner', 'guard', 2440, 172, 2420, 2460, 1);
    this.addNpc('herr', 'walker', 2700, 196, l1.x0 + 40, l1.x1 - 60);
    this.addNpc('frau', 'walker', 2250, 214, l1.x0 + 40, l1.x1 - 60, 1);
    this.addNpc('jogger', 'walker', 2600, 244, l1.x0 + 20, l1.x1 - 40);
    this.addNpc('opa', 'walker', 2080, 182, l1.x0 + 20, l1.x0 + 500, 1);
    // Poziom 2 — ulica handlowa
    this.addNpc('herr', 'guard', 1478, 176, 1460, 1500, 1);
    this.addNpc('opa', 'walker', 1300, 190, l2.x0 + 30, l2.x1 - 30);
    this.addNpc('frau', 'walker', 1750, 218, l2.x0 + 30, l2.x1 - 30, 1);
    this.addNpc('jogger', 'walker', 1100, 250, l2.x0 + 10, l2.x1 - 10);
    this.addNpc('herr', 'walker', 1860, 200, l2.x0 + 30, l2.x1 - 30);
    this.addNpc('frau', 'walker', 1200, 230, l2.x0 + 30, l2.x1 - 30, 1);
    // Poziom 3 — willowe osiedle
    this.addNpc('boss', 'guard', 372, 196, 350, 400, -1);
    this.addNpc('opa', 'walker', 700, 186, l3.x0 + 30, l3.x1 - 30);
    this.addNpc('frau', 'walker', 160, 210, l3.x0 + 30, l3.x1 - 30, 1);
    this.addNpc('jogger', 'walker', 820, 252, l3.x0 + 10, l3.x1 - 10);
    this.addNpc('herr', 'walker', 520, 178, l3.x0 + 30, l3.x1 - 30);
    this.addNpc('polizei', 'walker', 620, 226, l3.x0 + 300, l3.x1 - 30);
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

  private alive(): PlayerSim[] {
    return Object.values(this.players).filter((p) => p.present && !p.down && !p.inCar);
  }

  /** Czy NPC widzi punkt (stoi przodem do niego i blisko). */
  private sees(n: Npc, x: number, y: number, range = 150): boolean {
    if (n.state === 'ko' || n.state === 'flee' || n.state === 'hurt') return false;
    const dx = x - n.x;
    return n.face * dx > -4 && Math.abs(dx) < range && Math.abs(y - n.y) < 70;
  }

  private enrage(n: Npc, by?: PlayerSim) {
    if (n.state === 'ko') return;
    if (!n.rage) {
      n.rage = true;
      n.maxHp += 3;
      n.hp += 3;
      this.txt(n.kind === 'polizei' ? 'HALT!' : 'WUT!', n.x, n.y - 46, '#ff3b3b');
      this.sfx('rage');
      this.alarm += n.kind === 'polizei' ? 25 : 10;
    }
    n.warn = false;
    n.alertT = 1;
    if (by) n.target = by.id;
    if (n.state !== 'hurt') {
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
        p.in = { ...inp };
        if (newAtk > p.lastAtk) {
          p.lastAtk = newAtk;
          if (!p.down && !p.inCar) this.resolveAttack(p);
        }
      }
      p.invuln = Math.max(0, p.invuln - dt);
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
  private resolveAttack(p: PlayerSim) {
    const isPole = p.id === 'pole';
    const range = isPole ? 32 : 28;
    const dmg = isPole ? 2 : 1;
    const { x, y, face } = p.in;
    this.sfx('swing');
    let hitSomething = false;
    for (const n of this.npcs) {
      if (n.state === 'ko') continue;
      const dx = (n.x - x) * face;
      if (dx < -4 || dx > range || Math.abs(n.y - y) > 14) continue;
      hitSomething = true;
      n.hp -= dmg;
      n.vx = face * (isPole ? 110 : 140);
      n.face = (-face) as 1 | -1;
      n.warn = false;
      this.ev({ e: 'fx', k: 'hit', x: n.x - face * 4, y: n.y - 22 });
      this.sfx(isPole ? 'hit' : 'kick');
      if (n.hp <= 0) {
        n.hp = 0;
        n.state = 'ko';
        n.t = 10;
        n.rage = false;
        this.kos++;
        this.sfx('ko');
        this.txt('K.O.!', n.x, n.y - 44, '#ffe040');
      } else {
        n.state = 'hurt';
        n.t = 0.35;
        this.enrage(n, p);
      }
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
            this.txt('KŁÓDKA ROZWALONA!', ITEM_POS.bike.x, ITEM_POS.bike.y - 30, '#ffe040');
            this.sfx('pickup');
          } else this.txt(`${this.lockHp}`, ITEM_POS.bike.x, ITEM_POS.bike.y - 26, '#ffffff');
        } else {
          this.hint(p.id, 'Kopniak nie ruszy kłódki — otwórz ją wytrychem (AKCJA) albo niech Polak walnie pałką!');
        }
      }
    }
    if (hitSomething) {
      // świadkowie
      for (const w of this.npcs) {
        if (w.rage || w.state === 'ko' || w.state === 'flee') continue;
        if (this.sees(w, x, y, 130)) {
          this.alarm += 5;
          w.alertT = 1.2;
          if (w.role === 'guard' || w.kind === 'polizei' || Math.random() < 0.3) this.enrage(w, p);
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  private near(p: PlayerSim, x: number, y: number, rx: number, ry: number) {
    return Math.abs(p.in.x - x) < rx && Math.abs(p.in.y - y) < ry;
  }

  private chooseAct(p: PlayerSim): { kind: ActKind; target: number } {
    const other = this.players[p.id === 'pole' ? 'romanian' : 'pole'];
    // reanimacja kumpla
    if (other.present && other.down && this.near(p, other.in.x, other.in.y, 28, 16)) return { kind: 'revive', target: 100 };
    // cele poziomów
    if (this.stage === 0 && !this.gnome && this.near(p, ITEM_POS.gnome.x, ITEM_POS.gnome.y, 22, 18)) return { kind: 'gnome', target: 200 };
    if (this.stage === 1 && !this.bike && this.near(p, ITEM_POS.bike.x, ITEM_POS.bike.y, 26, 20)) {
      if (this.lockHp > 0) {
        if (p.id === 'romanian') return { kind: 'lockpick', target: 201 };
        this.hint(p.id, 'Rower przypięty! Walnij kłódkę pałką (BIJ) albo niech Rumun ją otworzy.');
        return { kind: '', target: -1 };
      }
      return { kind: 'bike', target: 202 };
    }
    if (this.stage === 2 && !this.carGone && this.near(p, this.carX, ITEM_POS.car.y, 56, 22)) {
      if (!this.carUnlocked) {
        if (p.id === 'romanian' || !other.present) return { kind: 'carlock', target: 203 };
        this.hint(p.id, 'Tylko Rumun otworzy auto. Ty stój na czatach obok i pilnuj!');
        return { kind: '', target: -1 };
      }
      if (!p.inCar) return { kind: 'enter', target: 204 };
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
        if (n.robbed || n.rage || n.state === 'ko' || n.state === 'flee' || n.state === 'hurt') continue;
        if (Math.abs(n.x - p.in.x) > 26 || Math.abs(n.y - p.in.y) > 12) continue;
        const behind = n.face * (p.in.x - n.x) < 0;
        if (behind) return { kind: 'pickpocket', target: n.id };
        this.hint(p.id, 'On na ciebie patrzy! Zajdź go od tyłu albo poczekaj, aż się odwróci.');
        return { kind: '', target: -1 };
      }
    } else {
      for (const n of this.npcs) {
        if (n.robbed || n.rage || n.state === 'ko') continue;
        if (Math.abs(n.x - p.in.x) < 26 && Math.abs(n.y - p.in.y) < 12) {
          this.hint(p.id, 'Polak nie ma lekkiej ręki — ogłusz go pałką albo zostaw to Rumunowi!');
          break;
        }
      }
    }
    return { kind: '', target: -1 };
  }

  private updateAct(p: PlayerSim, dt: number) {
    if (p.down || p.inCar) {
      p.prog = 0;
      p.kind = '';
      return;
    }
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
        this.hint(p.id, 'Polak musi stać na czatach przy aucie, bo sam nie dasz rady!');
        return;
      }
      if (Math.random() < dt * 6) this.sfx('pick');
    }
    if (kind === 'lockpick' && Math.random() < dt * 6) this.sfx('pick');

    p.prog += dt / ACT_TIME[kind];
    if (p.prog < 1) return;
    p.prog = 0;
    this.completeAct(p, kind, target);
    p.kind = '';
  }

  /** Sprawdza, czy ktoś widzi gracza przy cichej robocie. Jeśli tak — rage. */
  private caught(p: PlayerSim, kind: ActKind): boolean {
    for (const n of this.npcs) {
      if (n.rage || n.state === 'ko' || n.state === 'flee' || n.state === 'hurt') continue;
      const range = n.role === 'guard' ? 170 : 110;
      if (!this.sees(n, p.in.x, p.in.y, range)) continue;
      p.prog = 0;
      p.kind = '';
      this.sfx('alert');
      this.alarm += 20;
      this.txt('!', n.x, n.y - 50, '#ff3b3b');
      this.enrage(n, p);
      if (kind === 'pickpocket') this.ev({ e: 'msg', s: 'Przyłapany! Szwab dostał szału!', who: p.id });
      else this.ev({ e: 'msg', s: 'Ktoś cię widzi! Uważaj, kiedy się odwracają!', who: p.id });
      return true;
    }
    return false;
  }

  private completeAct(p: PlayerSim, kind: ActKind, target: number) {
    const n = this.npcs.find((q) => q.id === target);
    switch (kind) {
      case 'pickpocket': {
        if (!n) return;
        n.robbed = true;
        const amount = randi(20, 80);
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
        const amount = n.kind === 'polizei' ? randi(60, 120) : randi(10, 50);
        this.money += amount;
        this.sfx('coin');
        this.txt(`+${amount}€`, n.x, n.y - 30, '#ffe040');
        this.ev({ e: 'fx', k: 'coin', x: n.x, y: n.y - 20 });
        break;
      }
      case 'revive': {
        const other = this.players[p.id === 'pole' ? 'romanian' : 'pole'];
        other.down = false;
        other.hp = Math.ceil(PLAYER_MAX_HP / 2);
        other.invuln = 1.5;
        this.sfx('pickup');
        this.txt('WSTAWAJ!', other.in.x, other.in.y - 44, '#7dff7d');
        break;
      }
      case 'gnome':
        this.gnome = 1;
        this.steals++;
        this.sfx('pickup');
        this.txt('KRASNAL!', ITEM_POS.gnome.x, ITEM_POS.gnome.y - 30, '#ffe040');
        this.money += 50;
        this.advanceStage(1, 'Krasnal ukradziony! Idźcie dalej ← do miasta.');
        break;
      case 'lockpick':
        this.lockHp = 0;
        this.sfx('pickup');
        this.txt('OTWARTE!', ITEM_POS.bike.x, ITEM_POS.bike.y - 30, '#ffe040');
        break;
      case 'bike':
        this.bike = 1;
        this.steals++;
        this.money += 120;
        this.sfx('pickup');
        this.txt('ROWER!', ITEM_POS.bike.x, ITEM_POS.bike.y - 30, '#ffe040');
        this.advanceStage(2, 'Rower jest wasz! Ostatni skok: AUTO. ←');
        break;
      case 'carlock':
        this.carUnlocked = 1;
        this.sfx('pickup');
        this.txt('AUTO OTWARTE!', this.carX, ITEM_POS.car.y - 50, '#ffe040');
        this.ev({ e: 'msg', s: 'Auto otwarte! Obaj wsiadajcie (AKCJA przy aucie)!' });
        break;
      case 'enter':
        p.inCar = true;
        this.sfx('click');
        if (Object.values(this.players).every((q) => !q.present || q.inCar)) {
          this.carGone = 1;
          this.carT = 0;
          this.sfx('engine');
          this.steals++;
          this.ev({ e: 'msg', s: 'W NOGI! Wracamy na wschód!' });
        } else {
          this.ev({ e: 'msg', s: 'Czekam w aucie na kumpla...', who: p.id });
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
          n.t = rand(2, 4);
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
          n.turnT = n.role === 'guard' ? rand(1.8, 4.2) : rand(2.6, 5.5);
          n.warn = false;
        }
        n.t -= dt;
        if (n.role === 'guard') {
          n.state = 'idle';
          return;
        }
        if (n.t <= 0) {
          n.state = n.state === 'walk' ? 'idle' : 'walk';
          n.t = n.state === 'walk' ? rand(2, 5) : rand(1.5, 3.5);
        }
        if (n.state === 'walk') {
          n.x += n.face * spd * dt;
          if (n.x < n.minX) {
            n.x = n.minX;
            n.face = 1;
            n.turnT = rand(2.6, 5.5);
          } else if (n.x > n.maxX) {
            n.x = n.maxX;
            n.face = -1;
            n.turnT = rand(2.6, 5.5);
          }
        }
        return;
      }
    }
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
    const dmg = n.rage ? 2 : 1;
    for (const p of this.alive()) {
      const dx = (p.in.x - n.x) * n.face;
      if (dx < -4 || dx > 30 || Math.abs(p.in.y - n.y) > 12) continue;
      if (p.invuln > 0) continue;
      p.hp -= dmg;
      p.invuln = 0.7;
      this.sfx('hurt');
      this.ev({ e: 'fx', k: 'hit', x: p.in.x, y: p.in.y - 22 });
      this.ev({ e: 'hurt', who: p.id, dx: n.face * 14 });
      if (p.hp <= 0) {
        p.hp = 0;
        p.down = true;
        p.prog = 0;
        this.sfx('ko');
        const other = this.players[p.id === 'pole' ? 'romanian' : 'pole'];
        this.ev({
          e: 'msg',
          s: other.present && !other.down ? `${p.id === 'pole' ? 'Polak' : 'Rumun'} leży! Podnieś go (AKCJA obok)!` : 'Padłeś!',
        });
      }
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
          const cop = this.addNpc('polizei', 'police', x, rand(WALK_TOP + 10, WALK_BOTTOM - 10), 0, WORLD_W, (-side) as 1 | -1);
          this.enrage(cop);
        }
        this.sfx('siren');
        this.ev({ e: 'msg', s: 'POLIZEI! Zwiewajcie albo walczcie!' });
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
      this.ev({ e: 'end', win: true, reason: 'Uciekliście kradzionym autem do domu!' });
    }
  }

  private checkLose() {
    if (this.ended) return;
    const present = Object.values(this.players).filter((p) => p.present);
    if (present.length && present.every((p) => p.down)) {
      this.ended = true;
      this.sfx('lose');
      this.ev({ e: 'end', win: false, reason: 'Leżycie na chodniku. Polizei już jedzie...' });
    }
  }

  // -------------------------------------------------------------------------
  private npcAnim(n: Npc): AnimName {
    switch (n.state) {
      case 'ko':
        return 'down';
      case 'hurt':
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
      if (q.warn && !q.rage && q.state !== 'ko') f |= NF_WARN;
      if (q.state === 'ko') f |= NF_KO;
      if (q.robbed) f |= NF_ROBBED;
      if (q.alertT > 0) f |= NF_ALERT;
      if (q.looted) f |= NF_LOOTED;
      return [q.id, q.kind, Math.round(q.x * 10) / 10, Math.round(q.y * 10) / 10, q.face, this.npcAnim(q), f, Math.round((q.hp / q.maxHp) * 100) / 100];
    });
    const mkP = (p: PlayerSim) => ({
      x: p.in.x,
      y: p.in.y,
      face: p.in.face,
      anim: p.down ? ('down' as AnimName) : p.in.anim,
      hp: p.hp,
      down: p.down,
      prog: Math.round(p.prog * 100) / 100,
      kind: p.kind,
      inCar: p.inCar,
      present: p.present,
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
