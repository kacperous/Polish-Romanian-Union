import type { AnimName, CharId, NpcKind } from './constants';

/** Stan wysyłany przez każdego gracza (pozycję liczy klient lokalnie). */
export interface PlayerInput {
  x: number;
  y: number;
  face: 1 | -1;
  anim: AnimName;
  /** licznik ataków — każdy wzrost to nowy cios */
  atk: number;
  /** czy trzymany jest przycisk AKCJA */
  act: boolean;
}

export type ActKind = '' | 'pickpocket' | 'loot' | 'gnome' | 'lockpick' | 'bike' | 'carlock' | 'revive' | 'enter';

export interface PlayerSnap {
  x: number;
  y: number;
  face: 1 | -1;
  anim: AnimName;
  hp: number;
  down: boolean;
  /** postęp bieżącej akcji 0..1 */
  prog: number;
  kind: ActKind;
  inCar: boolean;
  present: boolean;
}

export const NF_RAGE = 1;
export const NF_WARN = 2;
export const NF_KO = 4;
export const NF_ROBBED = 8;
export const NF_ALERT = 16;
export const NF_LOOTED = 32;

/** [id, kind, x, y, face, anim, flags, hpFrac] */
export type NpcSnap = [number, NpcKind, number, number, 1 | -1, AnimName, number, number];

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
  | { e: 'hurt'; who: CharId; dx: number }
  | { e: 'msg'; s: string; who?: CharId }
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
