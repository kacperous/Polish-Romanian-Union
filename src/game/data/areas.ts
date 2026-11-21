/**
 * Obszary świata jako dane. Rozdział I (prolog) to jeden długi obszar złożony z trzech teł;
 * Rozdział II dokłada kolejne obszary połączone wyjściami.
 */
import { LEVEL_W, NpcKind } from '../constants';
import type { ItemKind } from './items';

export type Role = 'walker' | 'guard' | 'police';

export interface SpawnDef {
  kind: NpcKind;
  role: Role;
  x: number;
  y: number;
  minX: number;
  maxX: number;
  face?: 1 | -1;
}

export interface ItemSpawn {
  kind: ItemKind;
  x: number;
  y: number;
}

export interface BgDef {
  /** klucz tekstury tła (bliskiego) */
  key: string;
  x: number;
}

export interface AreaDef {
  id: string;
  /** szerokość obszaru w px */
  w: number;
  bgs: BgDef[];
  /** dalekie tła paralaksy — po jednym na każde tło bliskie (przenikają się) */
  far: string[];
  spawns: SpawnDef[];
  items?: ItemSpawn[];
}

const L1 = { x0: LEVEL_W * 2, x1: LEVEL_W * 3 };
const L2 = { x0: LEVEL_W, x1: LEVEL_W * 2 };
const L3 = { x0: 0, x1: LEVEL_W };

export const PROLOG: AreaDef = {
  id: 'prolog',
  w: LEVEL_W * 3,
  bgs: [
    { key: 'bg_level1', x: L1.x0 },
    { key: 'bg_level2', x: L2.x0 },
    { key: 'bg_level3', x: L3.x0 },
  ],
  far: ['bg_far1', 'bg_far2', 'bg_far3'],
  spawns: [
    // Poziom 1 — przedmieście
    { kind: 'gartner', role: 'guard', x: 2440, y: 172, minX: 2420, maxX: 2460, face: 1 },
    { kind: 'herr', role: 'walker', x: 2700, y: 196, minX: L1.x0 + 40, maxX: L1.x1 - 60 },
    { kind: 'frau', role: 'walker', x: 2250, y: 214, minX: L1.x0 + 40, maxX: L1.x1 - 60, face: 1 },
    { kind: 'jogger', role: 'walker', x: 2600, y: 244, minX: L1.x0 + 20, maxX: L1.x1 - 40 },
    { kind: 'opa', role: 'walker', x: 2080, y: 182, minX: L1.x0 + 20, maxX: L1.x0 + 500, face: 1 },
    // Poziom 2 — ulica handlowa
    { kind: 'herr', role: 'guard', x: 1478, y: 176, minX: 1460, maxX: 1500, face: 1 },
    { kind: 'opa', role: 'walker', x: 1300, y: 190, minX: L2.x0 + 30, maxX: L2.x1 - 30 },
    { kind: 'frau', role: 'walker', x: 1750, y: 218, minX: L2.x0 + 30, maxX: L2.x1 - 30, face: 1 },
    { kind: 'jogger', role: 'walker', x: 1100, y: 250, minX: L2.x0 + 10, maxX: L2.x1 - 10 },
    { kind: 'herr', role: 'walker', x: 1860, y: 200, minX: L2.x0 + 30, maxX: L2.x1 - 30 },
    { kind: 'frau', role: 'walker', x: 1200, y: 230, minX: L2.x0 + 30, maxX: L2.x1 - 30, face: 1 },
    // Poziom 3 — willowe osiedle
    { kind: 'boss', role: 'guard', x: 372, y: 196, minX: 350, maxX: 400, face: -1 },
    { kind: 'opa', role: 'walker', x: 700, y: 186, minX: L3.x0 + 30, maxX: L3.x1 - 30 },
    { kind: 'frau', role: 'walker', x: 160, y: 210, minX: L3.x0 + 30, maxX: L3.x1 - 30, face: 1 },
    { kind: 'jogger', role: 'walker', x: 820, y: 252, minX: L3.x0 + 10, maxX: L3.x1 - 10 },
    { kind: 'herr', role: 'walker', x: 520, y: 178, minX: L3.x0 + 30, maxX: L3.x1 - 30 },
    { kind: 'polizei', role: 'walker', x: 620, y: 226, minX: L3.x0 + 300, maxX: L3.x1 - 30 },
  ],
  items: [
    { kind: 'bin', x: 2760, y: 164 },
    { kind: 'bottle', x: 2560, y: 230 },
    { kind: 'rake', x: 2330, y: 168 },
    { kind: 'bottle', x: 1960, y: 182 },
    { kind: 'cone', x: 1650, y: 250 },
    { kind: 'crate', x: 1390, y: 166 },
    { kind: 'baguette', x: 1240, y: 172 },
    { kind: 'bin', x: 1080, y: 164 },
    { kind: 'tire', x: 800, y: 240 },
    { kind: 'bottle', x: 610, y: 176 },
  ],
};
