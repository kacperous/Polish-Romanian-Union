/**
 * Zapis postępu Rozdziału II: automatycznie w localStorage (u hosta) i jako HASŁO
 * (hołd dla River City Ransom) — działa między urządzeniami bez kont.
 *
 * Hasło: bity → base32 (bez mylących znaków 0/O/1/I), z sumą kontrolną CRC-8
 * i prostym „zaszumieniem”, żeby nie dało się go łatwo podrasować.
 */
import type { CharId } from './constants';
import type { Progress } from './Sim';
import { STAT_IDS, statsFromArray, statsToArray } from './stats';
import { TECH_IDS } from './data/techniques';
import { INV_SLOTS, TAKEAWAY_IDS } from './data/shops';
import { emptyCityState, type CityState } from './chapters/city';
import { mulberry32 } from './rng';

export interface SaveData {
  v: 1;
  progress: Progress;
  city: CityState;
}

export const SAVE_KEY = 'unia_rozdzial2';
export const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

const CHARS: CharId[] = ['pole', 'romanian'];
const VERSION = 1;
const MONEY_MAX = (1 << 14) - 1;

class BitWriter {
  bits: number[] = [];
  put(v: number, n: number) {
    for (let i = n - 1; i >= 0; i--) this.bits.push((v >>> i) & 1);
  }
}

class BitReader {
  i = 0;
  constructor(private bits: number[]) {}
  get(n: number): number {
    let v = 0;
    for (let k = 0; k < n; k++) v = (v << 1) | (this.bits[this.i++] ?? 0);
    return v >>> 0;
  }
}

function crc8(bits: number[]): number {
  let c = 0;
  for (const b of bits) {
    const top = ((c >> 7) & 1) ^ b;
    c = (c << 1) & 0xff;
    if (top) c ^= 0x07;
  }
  return c;
}

/** Zaszumienie bitów (XOR ze stałym strumieniem) — symetryczne. */
function scramble(bits: number[]): number[] {
  const r = mulberry32(0x5a17);
  return bits.map((b) => b ^ (r() < 0.5 ? 1 : 0));
}

export function encodePassword(d: SaveData): string {
  const w = new BitWriter();
  w.put(VERSION, 2);
  for (const c of CHARS) for (const v of statsToArray(d.progress.stats[c])) w.put(v, 6);
  for (const c of CHARS) w.put(d.progress.techs[c] & ((1 << TECH_IDS.length) - 1), TECH_IDS.length);
  for (const c of CHARS) {
    for (let i = 0; i < INV_SLOTS; i++) {
      const id = d.progress.inv[c][i];
      w.put(id ? TAKEAWAY_IDS.indexOf(id) + 1 : 0, 5);
    }
  }
  w.put(Math.max(0, Math.min(MONEY_MAX, Math.round(d.progress.money))), 14);
  w.put(d.city.stamps & 31, 5);
  w.put(d.city.gnomes & 31, 5);
  w.put(d.city.flags & 255, 8);
  w.put(Math.min(63, d.city.pfand), 6);
  // dopełnij do wielokrotności 5 bitów (z miejscem na CRC)
  while ((w.bits.length + 8) % 5) w.put(0, 1);
  w.put(crc8(w.bits), 8);
  const bits = scramble(w.bits);
  let out = '';
  for (let i = 0; i < bits.length; i += 5) {
    let v = 0;
    for (let k = 0; k < 5; k++) v = (v << 1) | bits[i + k];
    out += ALPHABET[v];
  }
  return out;
}

/** Normalizuje wpisane hasło (wielkość liter, spacje, myślniki). */
export function normalizePassword(s: string): string {
  return s.toUpperCase().replace(/[\s-]/g, '');
}

export function decodePassword(input: string): SaveData | null {
  const s = normalizePassword(input);
  if (s.length !== PASSWORD_LEN) return null;
  const raw: number[] = [];
  for (const ch of s) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) return null;
    for (let k = 4; k >= 0; k--) raw.push((v >> k) & 1);
  }
  const bits = scramble(raw);
  const body = bits.slice(0, -8);
  const r = new BitReader(bits);
  if (r.get(2) !== VERSION) return null;
  const stats = {} as Progress['stats'];
  for (const c of CHARS) stats[c] = statsFromArray(STAT_IDS.map(() => r.get(6)));
  const techs = {} as Progress['techs'];
  for (const c of CHARS) techs[c] = r.get(TECH_IDS.length);
  const inv = {} as Progress['inv'];
  for (const c of CHARS) {
    inv[c] = [];
    for (let i = 0; i < INV_SLOTS; i++) {
      const v = r.get(5);
      if (v > 0 && TAKEAWAY_IDS[v - 1]) inv[c].push(TAKEAWAY_IDS[v - 1]);
    }
  }
  const money = r.get(14);
  const city = emptyCityState();
  city.stamps = r.get(5);
  city.gnomes = r.get(5);
  city.flags = r.get(8);
  city.pfand = r.get(6);
  const crcPos = bits.length - 8;
  const crc = new BitReader(bits.slice(crcPos)).get(8);
  if (crc8(body) !== crc) return null;
  return { v: 1, progress: { stats, techs, inv, money }, city };
}

/** Długość hasła w znakach. */
export const PASSWORD_LEN = (() => {
  const bits = 2 + 2 * STAT_IDS.length * 6 + 2 * TECH_IDS.length + 2 * INV_SLOTS * 5 + 14 + 5 + 5 + 8 + 6;
  let n = bits;
  while ((n + 8) % 5) n++;
  return (n + 8) / 5;
})();

/** Hasło w grupach po 5 znaków (czytelniej). */
export function formatPassword(p: string): string {
  return p.replace(/(.{5})/g, '$1 ').trim();
}

export function saveLocal(d: SaveData) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(d));
  } catch {
    /* brak dostępu do pamięci — trudno, zostaje hasło */
  }
}

export function loadLocal(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as SaveData;
    // przepuszczamy przez hasło — waliduje i normalizuje dane
    return d && d.v === 1 ? decodePassword(encodePassword(d)) : null;
  } catch {
    return null;
  }
}

/** Rozdział II odblokowuje się po ukończeniu prologu (zapamiętane w przeglądarce). */
export const PROLOG_KEY = 'unia_prolog_ukonczony';

export function isPrologDone(): boolean {
  try {
    return localStorage.getItem(PROLOG_KEY) === '1';
  } catch {
    return false;
  }
}

/** Zaznacza ukończenie prologu; zwraca true, jeśli to pierwsze ukończenie (właśnie odblokowano). */
export function markPrologDone(): boolean {
  const first = !isPrologDone();
  try {
    localStorage.setItem(PROLOG_KEY, '1');
  } catch {
    /* brak pamięci — trudno */
  }
  return first;
}
