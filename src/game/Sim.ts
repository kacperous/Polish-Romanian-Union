/**
 * Symulacja świata gry — liczona WYŁĄCZNIE u hosta (lub w trybie solo).
 * Gość wysyła tylko swoją pozycję i przyciski, a dostaje snapshoty.
 */
import {
  CharId,
  NpcKind,
  PLAYER_START,
  WALK_BOTTOM,
  WALK_TOP,
  AnimName,
} from './constants';
import { mulberry32, randomSeed, Rng } from './rng';
import type { Role } from './data/areas';
import type { ActChoice, ChapterRules } from './chapters/rules';
import { PrologRules } from './chapters/prolog';
import { ITEMS, ItemKind, NPC_THROW_DMG } from './data/items';
import { GOODS, INV_SLOTS, SHOPS, ShopId } from './data/shops';
import { canLearn, hasTech, techBit, TechId } from './data/techniques';
import {
  attackDmg,
  baseStats,
  CharStats,
  clampStat,
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
  CoinSnap,
  HoldKind,
  ItemSnap,
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
  | 'thrown'
  | 'aim';

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
  /** trzymany przedmiot (-1 = brak) */
  holdItem: number;
  /** ile € wypada po nokaucie (monety na ziemi) */
  coins: number;
  /** czy podnosi przedmioty i nimi rzuca */
  grabs: boolean;
  /** Brzytwa: przez ten czas „nie widzi” kradzieży */
  blindT: number;
  /** do usunięcia (pokonany członek bandy znika) */
  gone: boolean;
}

export interface Item {
  id: number;
  kind: ItemKind;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  state: 'ground' | 'held' | 'thrown';
  /** gracz trzymający / rzucający */
  by: CharId | null;
  /** NPC trzymający / rzucający (-1 = brak) */
  byNpc: number;
  dur: number;
  hitIds: number[];
  rollT: number;
}

export interface Coin {
  id: number;
  x: number;
  y: number;
  v: number;
  t: number;
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
  /** id trzymanego przedmiotu */
  holdItem: number;
  /** techniki (bity TECH_IDS) */
  techs: number;
  /** ekwipunek: id towarów na wynos */
  inv: string[];
  /** sklep, w którym gracz jest (pusty = na ulicy) */
  shop: ShopId | '';
  /** Brzytwa: jedno przyłapanie przy bieżącej robocie już wybaczone */
  grace: boolean;
}

/** Postęp przenoszony między sesjami (zapis / hasło). */
export interface Progress {
  stats: Record<CharId, CharStats>;
  techs: Record<CharId, number>;
  inv: Record<CharId, string[]>;
  money: number;
}

export interface SimOptions {
  seed?: number;
  progress?: Progress;
  /** fabryka zasad rozdziału (domyślnie prolog) */
  rules?: (sim: Sim) => ChapterRules;
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
  pickup: 0.15,
  shop: 0.2,
  pfand: 0.5,
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
/** Grawitacja lotu rzuconych przedmiotów i ludzi (mniejsza niż przy skoku = dalszy rzut). */
const ITEM_GRAVITY = 300;
const BODY_GRAVITY = 350;
/** Surowe obrażenia ciosu NPC (przed Obroną). */
const NPC_DMG = 10;

/** Stany, w których NPC nie da się zwyczajnie uderzyć. */
const UNHITTABLE: NpcState[] = ['ko', 'down', 'getup', 'held', 'thrown'];
/** Stany „wyłączonego” NPC — nie widzi, nie atakuje. */
const DISABLED: NpcState[] = ['ko', 'flee', 'hurt', 'down', 'getup', 'held', 'thrown'];

export class Sim {
  players: Record<CharId, PlayerSim>;
  npcs: Npc[] = [];
  items: Item[] = [];
  coins: Coin[] = [];
  /** szerokość bieżącego obszaru */
  areaW = 2880;
  /** zasady bieżącego rozdziału (cele, przejścia, przegrana) */
  rules: ChapterRules;
  private nextId = 1;
  stage = 0;
  money = 0;
  alarm = 0;
  kos = 0;
  steals = 0;
  time = 0;
  ended = false;
  private events: GameEvent[] = [];
  private policeCooldown = 0;
  private hintCd: Record<CharId, number> = { pole: 0, romanian: 0 };
  readonly rng: Rng;

  constructor(present: Record<CharId, boolean>, readonly solo: boolean, opts: SimOptions = {}) {
    this.rng = mulberry32(opts.seed ?? randomSeed());
    const pr = opts.progress;
    if (pr) this.money = pr.money;
    const mk = (id: CharId): PlayerSim => {
      const stats = pr ? { ...pr.stats[id] } : baseStats(id);
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
        holdItem: -1,
        techs: pr ? pr.techs[id] : 0,
        inv: pr ? [...pr.inv[id]] : [],
        shop: '',
        grace: false,
      };
    };
    this.players = { pole: mk('pole'), romanian: mk('romanian') };
    this.rules = opts.rules ? opts.rules(this) : new PrologRules(this);
    this.rules.init();
  }

  rand(a: number, b: number) {
    return a + this.rng() * (b - a);
  }
  randi(a: number, b: number) {
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
      holdItem: -1,
      coins: 0,
      grabs: role !== 'police' && this.rng() < 0.4,
      blindT: 0,
      gone: false,
    };
    this.npcs.push(n);
    return n;
  }

  addItem(kind: ItemKind, x: number, y: number): Item {
    const it: Item = { id: this.nextId++, kind, x, y, z: 0, vx: 0, vz: 0, state: 'ground', by: null, byNpc: -1, dur: ITEMS[kind].dur, hitIds: [], rollT: 0 };
    this.items.push(it);
    return it;
  }

  item(id: number): Item | undefined {
    return id < 0 ? undefined : this.items.find((q) => q.id === id);
  }

  removeItem(it: Item) {
    this.items = this.items.filter((q) => q !== it);
    for (const p of Object.values(this.players)) if (p.holdItem === it.id) p.holdItem = -1;
    for (const n of this.npcs) if (n.holdItem === it.id) n.holdItem = -1;
  }

  /** Monety na ziemi po pokonanym wrogu (zbiera się je, przechodząc obok). */
  spawnCoins(x: number, y: number, total: number) {
    if (total <= 0) return;
    const parts = total >= 30 ? 3 : total >= 10 ? 2 : 1;
    let left = total;
    for (let i = 0; i < parts; i++) {
      const v = i === parts - 1 ? left : Math.round(total / parts);
      left -= v;
      this.coins.push({
        id: this.nextId++,
        x: Math.max(6, Math.min(this.areaW - 6, x + this.rand(-16, 16))),
        y: Math.max(WALK_TOP, Math.min(WALK_BOTTOM, y + this.rand(-6, 6))),
        v,
        t: 20,
      });
    }
    this.sfx('coin');
  }

  // -------------------------------------------------------------------------
  ev(e: GameEvent) {
    this.events.push(e);
  }
  sfx(k: string) {
    this.ev({ e: 'sfx', k });
  }
  txt(s: string, x: number, y: number, c = '#ffffff') {
    this.ev({ e: 'txt', s, x: Math.round(x), y: Math.round(y), c });
  }
  hint(who: CharId, s: string) {
    if (this.hintCd[who] > 0) return;
    this.hintCd[who] = 2.5;
    this.ev({ e: 'msg', s, who });
  }

  mate(p: PlayerSim): PlayerSim {
    return this.players[p.id === 'pole' ? 'romanian' : 'pole'];
  }

  alive(): PlayerSim[] {
    return Object.values(this.players).filter((p) => p.present && !p.down && !p.inCar && !p.shop);
  }

  has(p: PlayerSim, t: TechId): boolean {
    return hasTech(p.techs, t);
  }

  /** Bieżący postęp (do zapisu). */
  progress(): Progress {
    const P = this.players;
    return {
      stats: { pole: { ...P.pole.stats }, romanian: { ...P.romanian.stats } },
      techs: { pole: P.pole.techs, romanian: P.romanian.techs },
      inv: { pole: [...P.pole.inv], romanian: [...P.romanian.inv] },
      money: this.money,
    };
  }

  // --- sklepy i ekwipunek ---------------------------------------------------
  enterShop(who: CharId, shop: ShopId) {
    const p = this.players[who];
    if (p.down || p.inCar) return;
    this.releaseHeld(p);
    this.playerDrop(p);
    p.shop = shop;
    p.prog = 0;
    p.kind = '';
    this.sfx('click');
    this.ev({ e: 'shop', who, shop });
  }

  leaveShop(who: CharId) {
    const p = this.players[who];
    if (!p.shop) return;
    p.shop = '';
    p.invuln = Math.max(p.invuln, 1);
    p.latch = true;
    this.ev({ e: 'shop', who, shop: '' });
  }

  /** Zakup w sklepie: zjedz na miejscu (eat) albo na wynos (take). Zwraca klucz błędu albo ''. */
  buy(who: CharId, goodId: string, mode: 'eat' | 'take'): string {
    const err = this.tryBuy(who, goodId, mode);
    if (err) {
      this.sfx('alert');
      this.ev({ e: 'msg', s: err, who });
    }
    return err;
  }

  private tryBuy(who: CharId, goodId: string, mode: 'eat' | 'take'): string {
    const p = this.players[who];
    if (!p.shop) return 'shop.err_closed';
    const good = SHOPS[p.shop].goods.find((g) => g.id === goodId);
    if (!good) return 'shop.err_closed';
    if (good.who && good.who !== who) return 'shop.err_who';
    if (good.book && (this.has(p, good.book) || !canLearn(who, good.book))) return 'shop.err_known';
    if (mode === 'take' && (!good.take || good.book)) return 'shop.err_closed';
    if (mode === 'take' && p.inv.length >= INV_SLOTS) return 'shop.err_full';
    if (this.money < good.price) return 'shop.err_money';
    this.money -= good.price;
    this.sfx('coin');
    if (good.book) {
      p.techs |= techBit(good.book);
      this.sfx('pickup');
      this.ev({ e: 'msg', s: 'shop.learned', who, a: { t: `tech.${good.book}` } });
    } else if (mode === 'take') {
      p.inv.push(good.id);
    } else {
      this.consume(p, good.id);
    }
    return '';
  }

  /** Zjedzenie towaru z ekwipunku. */
  useItem(who: CharId, slot: number): boolean {
    const p = this.players[who];
    if (p.down || p.inCar || slot < 0 || slot >= p.inv.length) return false;
    const [id] = p.inv.splice(slot, 1);
    this.consume(p, id);
    return true;
  }

  private consume(p: PlayerSim, goodId: string) {
    const good = GOODS[goodId];
    if (!good) return;
    const before = maxHp(p.stats);
    const ups: string[] = [];
    for (const [k, v] of Object.entries(good.stats ?? {}) as [keyof CharStats, number][]) {
      const old = p.stats[k];
      p.stats[k] = clampStat(old + v);
      if (p.stats[k] > old) ups.push(`${k}+${p.stats[k] - old}`);
    }
    const mhp = maxHp(p.stats);
    p.hp = Math.min(mhp, p.hp + (mhp - before) + (good.heal ?? 0));
    this.sfx('pickup');
    this.ev({ e: 'eat', who: p.id, good: goodId, ups });
  }

  npc(id: number): Npc | undefined {
    return this.npcs.find((q) => q.id === id);
  }

  /** Czy NPC widzi punkt (stoi przodem do niego i blisko). */
  sees(n: Npc, x: number, y: number, range = 150): boolean {
    if (DISABLED.includes(n.state)) return false;
    const dx = x - n.x;
    return n.face * dx > -4 && Math.abs(dx) < range && Math.abs(y - n.y) < 70;
  }

  enrage(n: Npc, by?: PlayerSim) {
    if (n.state === 'ko') return;
    if (!n.rage) {
      n.rage = true;
      n.maxHp += RAGE_HP;
      n.hp += RAGE_HP;
      this.txt(n.kind === 'polizei' ? 'HALT!' : 'WUT!', n.x, n.y - 46, '#ff3b3b');
      this.sfx('rage');
      // banda nie dzwoni na policję
      if (n.role !== 'thug') this.alarm += n.kind === 'polizei' ? 25 : 10;
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
        const prevX = p.in.x;
        const prevY = p.in.y;
        const stale = (inp.ar ?? 0) !== this.rules.seq;
        p.in = { ...inp, z: inp.z ?? 0, ak: inp.ak ?? 'n' };
        if (stale) {
          // klient jeszcze nie wie o zmianie obszaru — zostaw pozycję ustawioną przez symulację
          p.in.x = prevX;
          p.in.y = prevY;
        }
        if (newAtk > p.lastAtk) {
          p.lastAtk = newAtk;
          if (!p.down && !p.inCar && p.kd <= 0) {
            const it = this.item(p.holdItem);
            if (p.holdNpc >= 0) this.throwHeld(p);
            else if (it && (ITEMS[it.kind].type === 'throw' || p.in.ak === 'j')) this.throwItem(p, it);
            else this.resolveAttack(p, p.in.ak === 'c' && !this.has(p, 'piesc') ? 'n' : p.in.ak, it);
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
    if (this.npcs.some((n) => n.gone)) this.npcs = this.npcs.filter((n) => !n.gone);
    this.updateItems(dt);
    this.updateCoins(dt);
    this.updateAlarm(dt);
    this.rules.update(dt);
    this.checkLose();
    return this.snapshot();
  }

  // -------------------------------------------------------------------------
  knockOut(n: Npc) {
    this.npcDrop(n);
    if (n.role === 'thug') this.ev({ e: 'cry', x: Math.round(n.x), y: Math.round(n.y), k: n.kind });
    if (n.coins > 0) {
      this.spawnCoins(n.x, n.y, n.coins);
      n.coins = 0;
    }
    n.hp = 0;
    n.state = 'ko';
    n.t = n.role === 'thug' ? 3 : 10;
    n.z = 0;
    n.vz = 0;
    n.rage = false;
    this.kos++;
    this.sfx('ko');
    this.txt('K.O.!', n.x, n.y - 44, '#ffe040');
  }

  knockDown(n: Npc, t = 1.1) {
    this.npcDrop(n);
    n.state = 'down';
    n.t = t;
    n.combo = 0;
  }

  /** Zadaje obrażenia NPC; zwraca true, jeśli padł (K.O.). */
  damageNpc(n: Npc, dmg: number, knock: boolean, by?: PlayerSim): boolean {
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

  private resolveAttack(p: PlayerSim, ak: AtkKind, weapon?: Item) {
    const isPole = p.id === 'pole';
    const heavy = ak === 'j' || ak === 'r' || ak === 'c';
    const wdef = weapon ? ITEMS[weapon.kind] : null;
    // techniki z książek
    const spin = ak === 'j' && !wdef && this.has(p, 'mlynek');
    const flyKick = ak === 'j' && !wdef && this.has(p, 'wyskok');
    const ram = ak === 'r' && this.has(p, 'taran');
    let range = (wdef ? wdef.range : isPole ? 32 : 28) + (ak === 'r' ? 6 : ak === 'j' ? 4 : 0);
    if (flyKick) range += 12;
    if (ram) range += 16;
    const base = wdef ? attackDmg('pole', p.stats) + wdef.dmg : attackDmg(p.id, p.stats);
    const techMult = flyKick || ram ? 1.5 : spin ? 1.2 : 1;
    const dmg = Math.round(base * (heavy ? 1.25 : 1) * (ak === 'c' ? 1.6 : 1) * techMult);
    const { x, y, face } = p.in;
    this.sfx('swing');
    let hitSomething = false;
    for (const n of this.npcs) {
      if (UNHITTABLE.includes(n.state)) continue;
      const dx = spin ? Math.abs(n.x - x) : (n.x - x) * face;
      if (dx < -4 || dx > range || Math.abs(n.y - y) > 14) continue;
      hitSomething = true;
      const hitDir = (spin ? Math.sign(n.x - x) || face : face) as 1 | -1;
      n.combo = n.comboT > 0 ? n.combo + 1 : 1;
      n.comboT = 1.2;
      const knock = heavy || n.combo >= 3;
      n.vx = hitDir * (knock ? 170 : isPole ? 110 : 140);
      n.face = (-hitDir) as 1 | -1;
      this.ev({ e: 'fx', k: 'hit', x: n.x - hitDir * 4, y: n.y - 22 });
      this.sfx(isPole || wdef ? 'hit' : 'kick');
      this.damageNpc(n, dmg, knock, p);
    }
    // zużycie broni (np. bagietka łamie się po kilku ciosach)
    if (hitSomething && weapon && wdef && wdef.dur > 0 && --weapon.dur <= 0) {
      this.txt('f.broke', x, y - 44, '#ffb060');
      this.ev({ e: 'fx', k: 'dust', x: x + face * 10, y });
      this.removeItem(weapon);
    }
    if (this.rules.onAttack(p, x, y, face, range)) hitSomething = true;
    if (hitSomething) this.witnesses(p, x, y);
  }

  /** Świadkowie bójki podnoszą alarm i czasem się wkurzają. */
  private witnesses(p: PlayerSim, x: number, y: number) {
    for (const w of this.npcs) {
      if (w.rage || w.role === 'thug' || DISABLED.includes(w.state)) continue;
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
    n.vx = face * 240 * (this.has(p, 'oszczep') ? 1.35 : 1);
    n.face = (-face) as 1 | -1;
    n.by = p.id;
    n.hitIds = [];
    this.sfx('swing');
    this.witnesses(p, p.in.x, p.in.y);
  }

  /** Puszcza trzymanego wroga (przewrócenie gracza, AKCJA). */
  releaseHeld(p: PlayerSim) {
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
    n.vz -= BODY_GRAVITY * dt;
    const thrower = n.by ? this.players[n.by] : undefined;
    const dmg = thrower ? Math.round(throwDmg(thrower.stats) * (this.has(thrower, 'oszczep') ? 1.5 : 1)) : 15;
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
    if (n.x < 4 || n.x > this.areaW - 4) n.vx = 0;
    if (n.z <= 0) {
      n.z = 0;
      n.vz = 0;
      n.vx *= 0.3;
      this.ev({ e: 'fx', k: 'dust', x: n.x, y: n.y });
      this.sfx('hit');
      this.damageNpc(n, Math.round(dmg * 0.5), true, thrower);
    }
  }

  // --- przedmioty ----------------------------------------------------------
  private throwItem(p: PlayerSim, it: Item) {
    p.holdItem = -1;
    const face = p.in.face;
    it.state = 'thrown';
    it.x = p.in.x + face * 10;
    it.y = p.in.y;
    it.z = 18 + p.in.z;
    it.vz = 40;
    it.vx = face * ITEMS[it.kind].speed * (this.has(p, 'oszczep') ? 1.35 : 1);
    it.by = p.id;
    it.byNpc = -1;
    it.hitIds = [];
    this.sfx('swing');
  }

  private npcDrop(n: Npc) {
    const it = this.item(n.holdItem);
    n.holdItem = -1;
    if (!it || it.state !== 'held') return;
    it.state = 'ground';
    it.z = 0;
    it.byNpc = -1;
    it.x = n.x + n.face * 10;
    it.y = n.y;
  }

  playerDrop(p: PlayerSim) {
    const it = this.item(p.holdItem);
    p.holdItem = -1;
    if (!it || it.state !== 'held') return;
    it.state = 'ground';
    it.z = 0;
    it.by = null;
    it.x = Math.max(6, Math.min(this.areaW - 6, p.in.x + p.in.face * 12));
    it.y = p.in.y;
  }

  private landItem(it: Item) {
    const def = ITEMS[it.kind];
    it.z = 0;
    it.vz = 0;
    if (def.breaks) {
      this.ev({ e: 'fx', k: 'hit', x: it.x, y: it.y - 4 });
      this.sfx('hit');
      this.removeItem(it);
      return;
    }
    if (def.rolls && it.rollT === 0) {
      it.rollT = 1.4;
      it.vx *= 0.8;
      return;
    }
    this.ev({ e: 'fx', k: 'dust', x: it.x, y: it.y });
    it.state = 'ground';
    it.vx = 0;
    it.rollT = 0;
    it.by = null;
    it.byNpc = -1;
  }

  private updateItems(dt: number) {
    for (const it of [...this.items]) {
      if (it.state === 'held') {
        const p = it.by ? this.players[it.by] : null;
        const n = it.byNpc >= 0 ? this.npc(it.byNpc) : null;
        if (p && p.holdItem === it.id) {
          it.x = p.in.x;
          it.y = p.in.y + 0.5;
          it.z = p.in.z + (ITEMS[it.kind].type === 'throw' ? 24 : 14);
        } else if (n && n.holdItem === it.id) {
          it.x = n.x;
          it.y = n.y + 0.5;
          it.z = ITEMS[it.kind].type === 'throw' ? 24 : 14;
        } else {
          it.state = 'ground';
          it.z = 0;
          it.by = null;
          it.byNpc = -1;
        }
        continue;
      }
      if (it.state !== 'thrown') continue;
      it.x += it.vx * dt;
      if (it.rollT > 0) {
        it.rollT -= dt;
        if (it.rollT <= 0) {
          it.rollT = -1;
          this.landItem(it);
          continue;
        }
      } else {
        it.z += it.vz * dt;
        it.vz -= ITEM_GRAVITY * dt;
      }
      if (it.x < 6 || it.x > this.areaW - 6) {
        it.x = Math.max(6, Math.min(this.areaW - 6, it.x));
        it.vx = -it.vx * 0.5;
      }
      this.itemHits(it);
      if (this.items.includes(it) && it.rollT === 0 && it.z <= 0) this.landItem(it);
    }
  }

  /** Trafienia lecącego przedmiotu: gracza rzut trafia wrogów, NPC — graczy. */
  private itemHits(it: Item) {
    if (it.z > 30) return;
    const def = ITEMS[it.kind];
    if (it.by) {
      const thrower = this.players[it.by];
      const dmg = Math.round((throwDmg(thrower.stats) + def.dmg) * (this.has(thrower, 'oszczep') ? 1.5 : 1));
      for (const n of this.npcs) {
        if (UNHITTABLE.includes(n.state) || it.hitIds.includes(n.id)) continue;
        if (Math.abs(n.x - it.x) > 12 || Math.abs(n.y - it.y) > 12) continue;
        it.hitIds.push(n.id);
        n.vx = Math.sign(it.vx) * 150;
        n.face = (-Math.sign(it.vx) || 1) as 1 | -1;
        this.ev({ e: 'fx', k: 'hit', x: n.x, y: n.y - 18 });
        this.sfx('hit');
        this.damageNpc(n, dmg, true, thrower);
        if (def.breaks) {
          this.removeItem(it);
          return;
        }
        if (!def.rolls) it.vx *= 0.4;
      }
    } else if (it.byNpc >= 0) {
      for (const p of this.alive()) {
        if (it.hitIds.includes(-1 - (p.id === 'pole' ? 0 : 1))) continue;
        if (Math.abs(p.in.x - it.x) > 12 || Math.abs(p.in.y - it.y) > 12) continue;
        if (p.in.z >= 12 || p.invuln > 0 || p.kd > 0) continue;
        it.hitIds.push(-1 - (p.id === 'pole' ? 0 : 1));
        const dir = (Math.sign(it.vx) || 1) as 1 | -1;
        const blocking = p.in.anim === 'block' && p.in.face === -dir;
        this.hurtPlayer(p, NPC_THROW_DMG + def.dmg / 2, dir, blocking);
        if (def.breaks) {
          this.removeItem(it);
          return;
        }
        it.vx *= -0.3;
      }
    }
  }

  private updateCoins(dt: number) {
    for (const c of this.coins) c.t -= dt;
    for (const p of this.alive()) {
      for (const c of this.coins) {
        if (c.t <= 0 || Math.abs(p.in.x - c.x) > 12 || Math.abs(p.in.y - c.y) > 10 || p.in.z > 6) continue;
        c.t = 0;
        this.money += c.v;
        this.sfx('coin');
        this.txt(`+${c.v}€`, c.x, c.y - 16, '#ffe040');
      }
    }
    this.coins = this.coins.filter((c) => c.t > 0);
  }

  // -------------------------------------------------------------------------
  near(p: PlayerSim, x: number, y: number, rx: number, ry: number) {
    return Math.abs(p.in.x - x) < rx && Math.abs(p.in.y - y) < ry;
  }

  private chooseAct(p: PlayerSim): ActChoice {
    const other = this.mate(p);
    if (p.holdNpc >= 0) return { kind: 'drop', target: p.holdNpc };
    // reanimacja kumpla
    if (other.present && other.down && this.near(p, other.in.x, other.in.y, 28, 16)) return { kind: 'revive', target: 100 };
    // cele rozdziału (np. automat Pfand przy butelce w ręku)
    const special = this.rules.chooseAct(p);
    if (special) return special;
    if (p.holdItem >= 0) return { kind: 'drop', target: p.holdItem };
    // przewrócony wróg — podnieś i rzuć
    for (const n of this.npcs) {
      if (n.state !== 'down' || n.z > 0) continue;
      if (Math.abs(n.x - p.in.x) < 30 && Math.abs(n.y - p.in.y) < 14) return { kind: 'lift', target: n.id };
    }
    // przedmiot na ziemi
    for (const it of this.items) {
      if (it.state !== 'ground') continue;
      if (Math.abs(it.x - p.in.x) < 18 && Math.abs(it.y - p.in.y) < 12) return { kind: 'pickup', target: it.id };
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
    if (p.latch || p.shop) return;
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
      p.grace = false;
    }
    if (!kind) return;

    // wykrycie przy cichych akcjach
    if (SNEAKY.includes(kind) && this.caught(p, kind)) return;
    if (!this.rules.canProgress(p, kind, dt)) return;

    let time = ACT_TIME[kind] * (HANDY.includes(kind) ? sneakTimeMult(p.stats) : 1);
    if (kind === 'loot' && this.has(p, 'krawaciarz')) time *= 0.5;
    if (kind === 'revive' && this.has(p, 'klepniecie')) time *= 0.5;
    p.prog += dt / time;
    if (p.prog < 1) return;
    p.prog = 0;
    this.completeAct(p, kind, target);
    p.kind = '';
  }

  /** Sprawdza, czy ktoś widzi gracza przy cichej robocie. Jeśli tak — rage. */
  private caught(p: PlayerSim, kind: ActKind): boolean {
    for (const n of this.npcs) {
      if (n.rage || n.blindT > 0 || DISABLED.includes(n.state)) continue;
      const range = n.role === 'guard' ? 170 : 110;
      if (!this.sees(n, p.in.x, p.in.y, range)) continue;
      // Brzytwa: pierwsze spojrzenie nic nie zauważa
      if (this.has(p, 'brzytwa') && !p.grace) {
        p.grace = true;
        n.blindT = 1.6;
        n.alertT = 1;
        this.txt('?!', n.x, n.y - 50, '#ffe040');
        return false;
      }
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
        const amount = Math.round((n.kind === 'polizei' ? this.randi(60, 120) : this.randi(10, 50)) * (this.has(p, 'krawaciarz') ? 1.5 : 1));
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
        if (p.holdItem >= 0) this.playerDrop(p);
        else this.releaseHeld(p);
        break;
      case 'pickup': {
        const it = this.item(target);
        if (!it || it.state !== 'ground') return;
        it.state = 'held';
        it.by = p.id;
        it.byNpc = -1;
        p.holdItem = it.id;
        p.latch = true;
        this.sfx('click');
        break;
      }
      case 'revive': {
        const other = this.mate(p);
        other.down = false;
        other.hp = Math.ceil(maxHp(other.stats) / 2);
        other.invuln = this.has(p, 'klepniecie') ? 3.5 : 1.5;
        this.sfx('pickup');
        this.txt('f.revive', other.in.x, other.in.y - 44, '#7dff7d');
        break;
      }
      default:
        this.rules.completeAct(p, kind, target);
    }
  }

  advanceStage(stage: number, msg: string) {
    this.stage = stage;
    this.ev({ e: 'stage', stage });
    this.ev({ e: 'msg', s: msg });
  }

  // -------------------------------------------------------------------------
  private updateNpc(n: Npc, dt: number) {
    n.alertT = Math.max(0, n.alertT - dt);
    n.blindT = Math.max(0, n.blindT - dt);
    n.atkCd = Math.max(0, n.atkCd - dt);
    n.comboT = Math.max(0, n.comboT - dt);
    if (n.comboT <= 0) n.combo = 0;
    if (n.state === 'held') {
      this.updateHeld(n, dt);
      return;
    }
    if (n.state === 'thrown') {
      this.updateThrown(n, dt);
      n.x = Math.max(4, Math.min(this.areaW - 4, n.x));
      return;
    }
    // odrzut
    if (n.vx !== 0) {
      n.x += n.vx * dt;
      n.vx *= Math.pow(0.002, dt);
      if (Math.abs(n.vx) < 3) n.vx = 0;
    }
    n.x = Math.max(4, Math.min(this.areaW - 4, n.x));
    n.y = Math.max(WALK_TOP, Math.min(WALK_BOTTOM, n.y));

    const spd = n.speed * (n.rage ? 1.7 : 1);
    switch (n.state) {
      case 'ko':
        n.t -= dt;
        if (n.t <= 0 && n.role === 'thug') {
          // pokonany członek bandy znika (jak w River City Ransom)
          n.gone = true;
          return;
        }
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
      case 'aim':
        n.t -= dt;
        if (n.t <= 0) this.npcThrow(n);
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
        const held = this.item(n.holdItem);
        // podnieś coś z ziemi po drodze
        if (!held && n.grabs) {
          const it = this.items.find((q) => q.state === 'ground' && Math.abs(q.x - n.x) < 16 && Math.abs(q.y - n.y) < 10);
          if (it) {
            it.state = 'held';
            it.byNpc = n.id;
            it.by = null;
            n.holdItem = it.id;
            n.atkCd = Math.max(n.atkCd, 0.4);
            return;
          }
        }
        // rzut z dystansu
        if (held && ITEMS[held.kind].type === 'throw' && n.atkCd <= 0 && Math.abs(dy) < 8 && Math.abs(dx) > 40 && Math.abs(dx) < 150) {
          n.state = 'aim';
          n.t = 0.5;
          return;
        }
        const wantX = tgt.in.x - n.face * (held && ITEMS[held.kind].type === 'weapon' ? 26 : 18);
        const mx = wantX - n.x;
        if (Math.abs(mx) > 2) n.x += Math.sign(mx) * Math.min(Math.abs(mx), spd * dt);
        if (Math.abs(dy) > 2) n.y += Math.sign(dy) * Math.min(Math.abs(dy), spd * 0.7 * dt);
        const reach = held && ITEMS[held.kind].type === 'weapon' ? 34 : 26;
        if (Math.abs(dx) < reach && Math.abs(dy) < 8 && n.atkCd <= 0) {
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
        // członek bandy rzuca się na graczy, gdy ich zobaczy
        if (n.role === 'thug') {
          for (const p of this.alive()) {
            const close = Math.abs(p.in.x - n.x) < 40 && Math.abs(p.in.y - n.y) < 24;
            if (close || this.sees(n, p.in.x, p.in.y, 150)) {
              this.enrage(n, p);
              return;
            }
          }
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

  private npcThrow(n: Npc) {
    const it = this.item(n.holdItem);
    n.holdItem = -1;
    n.state = 'recover';
    n.t = 0.5;
    n.atkCd = 1.6;
    if (!it) return;
    it.state = 'thrown';
    it.x = n.x + n.face * 10;
    it.y = n.y;
    it.z = 18;
    it.vz = 40;
    it.vx = n.face * ITEMS[it.kind].speed * 0.85;
    it.by = null;
    it.byNpc = n.id;
    it.hitIds = [];
    this.sfx('swing');
  }

  private npcStrike(n: Npc) {
    n.atkCd = n.rage ? 0.6 : 1.0;
    const held = this.item(n.holdItem);
    const weapon = held && ITEMS[held.kind].type === 'weapon' ? ITEMS[held.kind] : null;
    const raw = (n.rage ? NPC_DMG * 2 : NPC_DMG) + (weapon ? weapon.dmg : 0);
    const reach = weapon ? 38 : 30;
    for (const p of this.alive()) {
      const dx = (p.in.x - n.x) * n.face;
      if (dx < -4 || dx > reach || Math.abs(p.in.y - n.y) > 12) continue;
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
        this.playerDrop(p);
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
      this.playerDrop(p);
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
    if (this.alarm >= 100 && this.policeCooldown <= 0 && !this.ended && this.rules.policeAllowed()) {
      const policeAlive = this.npcs.filter((n) => n.role === 'police' && n.state !== 'ko').length;
      if (policeAlive < 4) {
        const alive = this.alive();
        const cx = alive.length ? alive.reduce((s, p) => s + p.in.x, 0) / alive.length : 1500;
        for (const side of [-1, 1]) {
          const x = Math.max(10, Math.min(this.areaW - 10, cx + side * 250));
          const cop = this.addNpc('polizei', 'police', x, this.rand(WALK_TOP + 10, WALK_BOTTOM - 10), 0, this.areaW, (-side) as 1 | -1);
          this.enrage(cop);
        }
        this.sfx('siren');
        this.ev({ e: 'msg', s: 'm.police' });
      }
      this.alarm = 45;
      this.policeCooldown = 12;
    }
  }

  private checkLose() {
    if (this.ended) return;
    const present = Object.values(this.players).filter((p) => p.present);
    if (present.length && present.every((p) => p.down)) this.rules.onAllDown();
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
      case 'aim':
        return 'hold';
      case 'walk':
      case 'flee':
        return 'walk';
      case 'chase':
        return n.holdItem >= 0 && this.item(n.holdItem) && ITEMS[this.item(n.holdItem)!.kind].type === 'throw' ? 'hold' : 'walk';
      default:
        return 'idle';
    }
  }

  private holdKind(p: PlayerSim): HoldKind {
    if (p.holdNpc >= 0) return 1;
    const it = this.item(p.holdItem);
    if (!it) return 0;
    return ITEMS[it.kind].type === 'throw' ? 2 : 3;
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
      hold: this.holdKind(p),
      st: statsToArray(p.stats),
      tc: p.techs,
      inv: [...p.inv],
      shop: p.shop,
    });
    const ev = this.events;
    this.events = [];
    return {
      t: Math.round(this.time * 100) / 100,
      p: { pole: mkP(this.players.pole), romanian: mkP(this.players.romanian) },
      n,
      it: this.items.map((q): ItemSnap => {
        const holder = q.state !== 'held' ? 0 : q.by === 'pole' ? 1 : q.by === 'romanian' ? 2 : 3;
        return [q.id, q.kind, Math.round(q.x * 10) / 10, Math.round(q.y * 10) / 10, Math.round(q.z), holder, q.state === 'thrown' ? 1 : 0];
      }),
      co: this.coins.map((c): CoinSnap => [c.id, Math.round(c.x), Math.round(c.y), Math.round(c.t * 10) / 10]),
      ...this.rules.snap(),
      money: this.money,
      alarm: Math.round(this.alarm),
      stage: this.stage,
      kos: this.kos,
      steals: this.steals,
      ev,
    };
  }
}
