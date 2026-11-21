import type { AnimName, CharId, NpcKind } from './constants';
import type { ItemKind } from './data/items';

/** Rodzaj ciosu: n — zwykły, j — w skoku, r — w biegu, c — ładowany. */
export type AtkKind = 'n' | 'j' | 'r' | 'c';

/** Stan wysyłany przez każdego gracza (pozycję liczy klient lokalnie). */
export interface PlayerInput {
  x: number;
  y: number;
  /** wysokość nad ziemią (skok) */
  z: number;
  face: 1 | -1;
  anim: AnimName;
  /** licznik ataków — każdy wzrost to nowy cios */
  atk: number;
  /** rodzaj ostatniego ciosu */
  ak: AtkKind;
  /** czy trzymany jest przycisk AKCJA */
  act: boolean;
}

export type ActKind = '' | 'pickpocket' | 'loot' | 'gnome' | 'lockpick' | 'bike' | 'carlock' | 'revive' | 'enter' | 'lift' | 'drop' | 'pickup';

/** Co gracz trzyma: 0 — nic, 1 — wroga, 2 — przedmiot do rzucania, 3 — broń. */
export type HoldKind = 0 | 1 | 2 | 3;

export interface PlayerSnap {
  x: number;
  y: number;
  z: number;
  face: 1 | -1;
  anim: AnimName;
  hp: number;
  down: boolean;
  /** postęp bieżącej akcji 0..1 */
  prog: number;
  kind: ActKind;
  inCar: boolean;
  present: boolean;
  /** maksymalne życie */
  mhp: number;
  /** pozostały czas leżenia po przewróceniu */
  kd: number;
  hold: HoldKind;
  /** statystyki (kolejność STAT_IDS) */
  st: number[];
  /** techniki (bity TECH_IDS) */
  tc: number;
  /** ekwipunek (id towarów) */
  inv: string[];
  /** sklep, w którym jest gracz */
  shop: string;
}

export const NF_RAGE = 1;
export const NF_WARN = 2;
export const NF_KO = 4;
export const NF_ROBBED = 8;
export const NF_ALERT = 16;
export const NF_LOOTED = 32;

/** [id, kind, x, y, face, anim, flags, hpFrac, z] */
export type NpcSnap = [number, NpcKind, number, number, 1 | -1, AnimName, number, number, number];

/** [id, kind, x, y, z, holder (0 — nikt, 1 — Polak, 2 — Rumun, 3 — NPC), thrown (0/1)] */
export type ItemSnap = [number, ItemKind, number, number, number, 0 | 1 | 2 | 3, 0 | 1];

/** [id, x, y, pozostały czas] */
export type CoinSnap = [number, number, number, number];

export interface ObjSnap {
  gnome: 0 | 1; // 1 = ukradziony
  lockHp: number; // 0 = kłódka zniszczona
  bike: 0 | 1;
  carUnlocked: 0 | 1;
  carGone: 0 | 1;
  carX: number;
}

export type GameEvent =
  | { e: 'sfx'; k: string }
  | { e: 'fx'; k: 'hit' | 'dust' | 'coin'; x: number; y: number }
  | { e: 'txt'; s: string; x: number; y: number; c: string }
  | { e: 'hurt'; who: CharId; dx: number; kd?: number }
  | { e: 'msg'; s: string; who?: CharId; a?: Record<string, string> }
  | { e: 'stage'; stage: number }
  | { e: 'shop'; who: CharId; shop: string }
  | { e: 'eat'; who: CharId; good: string; ups: string[] }
  | { e: 'end'; win: boolean; reason: string };

export interface Snapshot {
  t: number;
  p: Record<CharId, PlayerSnap>;
  n: NpcSnap[];
  it: ItemSnap[];
  co: CoinSnap[];
  o: ObjSnap;
  money: number;
  alarm: number;
  stage: number;
  kos: number;
  steals: number;
  ev: GameEvent[];
}

export interface Stats {
  win: boolean;
  reason: string;
  money: number;
  kos: number;
  steals: number;
  time: number;
}

export interface GameStartData {
  mode: 'solo' | 'host' | 'guest';
  me: CharId;
  code?: string;
}
