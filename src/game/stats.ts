/**
 * Statystyki postaci (RPG-lite w stylu River City Ransom) i wzory na wartości pochodne.
 * Statystyki rosną tylko od jedzenia, książek i nagród — nie ma punktów doświadczenia.
 */
import { CharId, PLAYER_SPEED } from './constants';

export const STAT_IDS = ['sila', 'kop', 'rzut', 'zw', 'obr', 'reka', 'wytrz', 'leb'] as const;
export type StatId = (typeof STAT_IDS)[number];
export type CharStats = Record<StatId, number>;

/** Maksimum statystyki — mieści się w 6 bitach hasła zapisu. */
export const STAT_MAX = 63;

/** Startowe statystyki (dają dokładnie balans prologu). */
export const BASE_STATS: Record<CharId, CharStats> = {
  pole: { sila: 12, kop: 6, rzut: 8, zw: 6, obr: 10, reka: 2, wytrz: 12, leb: 8 },
  romanian: { sila: 6, kop: 6, rzut: 8, zw: 12, obr: 8, reka: 12, wytrz: 12, leb: 6 },
};

export function baseStats(c: CharId): CharStats {
  return { ...BASE_STATS[c] };
}

export function clampStat(v: number): number {
  return Math.max(1, Math.min(STAT_MAX, Math.round(v)));
}

export function statsToArray(s: CharStats): number[] {
  return STAT_IDS.map((k) => s[k]);
}

export function statsFromArray(a: number[]): CharStats {
  const s = {} as CharStats;
  STAT_IDS.forEach((k, i) => (s[k] = clampStat(a[i] ?? 1)));
  return s;
}

/** Życie: 10 punktów na 1 „kratkę” paska. */
export function maxHp(s: CharStats): number {
  return s.wytrz * 10;
}

/** Obrażenia podstawowego ciosu: Polak bije pałką (Siła), Rumun kopie (Kopnięcie). */
export function attackDmg(c: CharId, s: CharStats): number {
  const v = c === 'pole' ? s.sila : s.kop;
  return Math.round(v * 1.6 + 1);
}

/** Obrażenia rzuconego wroga / przedmiotu. */
export function throwDmg(s: CharStats): number {
  return Math.round(s.rzut * 1.5 + 3);
}

/** Mnożnik szybkości ruchu. */
export function speedMult(s: CharStats): number {
  return 0.85 + s.zw * 0.025;
}

export function moveSpeed(s: CharStats): number {
  return PLAYER_SPEED * speedMult(s);
}

/** Czas między ciosami. */
export function attackCooldown(c: CharId, s: CharStats): number {
  const base = c === 'pole' ? 0.34 : 0.26;
  return base * Math.max(0.6, 1 - (s.zw - 6) * 0.01);
}

/** Obrażenia przyjęte po uwzględnieniu Obrony. */
export function dmgTaken(raw: number, s: CharStats): number {
  return Math.max(1, Math.round((raw * 20) / (10 + s.obr)));
}

/** Mnożnik czasu cichych akcji (kradzież, wytrych) — Lekka ręka. */
export function sneakTimeMult(s: CharStats): number {
  return 12 / (6 + s.reka * 0.5);
}

/** Ile trafień z rzędu wytrzyma gracz, zanim się przewróci — Twardy łeb. */
export function knockdownHits(s: CharStats): number {
  return 2 + Math.floor(s.leb / 8);
}

/** Jak długo gracz leży po przewróceniu. */
export function knockdownTime(s: CharStats): number {
  return Math.max(0.5, 1.4 - s.leb * 0.03);
}
