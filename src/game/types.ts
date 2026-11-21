import type { AnimName, CharId, NpcKind } from './constants';

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

export type ActKind = '' | 'pickpocket' | 'loot' | 'gnome' | 'lockpick' | 'bike' | 'carlock' | 'revive' | 'enter' | 'lift' | 'drop';

/** Co gracz trzyma: 0 — nic, 1 — wroga. */
export type HoldKind = 0 | 1;

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
}

export const NF_RAGE = 1;
export const NF_WARN = 2;
export const NF_KO = 4;
export const NF_ROBBED = 8;
export const NF_ALERT = 16;
export const NF_LOOTED = 32;

/** [id, kind, x, y, face, anim, flags, hpFrac, z] */
export type NpcSnap = [number, NpcKind, number, number, 1 | -1, AnimName, number, number, number];

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
  | { e: 'end'; win: boolean; reason: string };

export interface Snapshot {
  t: number;
  p: Record<CharId, PlayerSnap>;
  n: NpcSnap[];
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
