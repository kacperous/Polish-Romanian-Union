/**
 * Rozdział II — miasteczko Ordnungsburg. Obszary połączone wyjściami na krawędziach
 * (jak dzielnice w River City Ransom). Baza „U Haliny / La Nea Costel” jest bezpieczna.
 *
 *   holownia ← altstadt ← stadion ← BAZA → bahnhof → garten → industrie
 */
import type { AreaDef, SpawnDef } from './areas';
import type { ShopId } from './shops';

export type CityAreaId = 'baza' | 'bahnhof' | 'garten' | 'industrie' | 'stadion' | 'altstadt' | 'holownia';

export interface ExitDef {
  side: 'L' | 'R';
  to: CityAreaId;
  /** wymaga wszystkich pieczątek */
  needStamps?: boolean;
}

export interface PropDef {
  kind: 'door' | 'pfand';
  x: number;
  shop?: ShopId;
}

export interface CityArea extends AreaDef {
  id: CityAreaId;
  /** strefa bezpieczna — bez bójek i policji, tu zapisuje się gra */
  safe?: boolean;
  exits: ExitDef[];
  props: PropDef[];
  /** ile € wypada z członka bandy */
  coins: number;
  /** pozycja na mapie (kolumna) */
  map: number;
}

/** Drzwi i automaty stoją przy górnej krawędzi chodnika. */
export const DOOR_Y = 162;

const W = (n: number) => n * 480;

/** Spacerowicz do okradania. */
const civ = (kind: SpawnDef['kind'], x: number, y: number, w: number, face: 1 | -1 = -1): SpawnDef => ({
  kind,
  role: 'walker',
  x,
  y,
  minX: 30,
  maxX: w - 30,
  face,
});

/** Członek bandy — atakuje, gdy zobaczy graczy. */
const thug = (kind: SpawnDef['kind'], x: number, y: number, w: number, face: 1 | -1 = -1): SpawnDef => ({
  kind,
  role: 'thug',
  x,
  y,
  minX: 40,
  maxX: w - 40,
  face,
});

export const CITY: Record<CityAreaId, CityArea> = {
  baza: {
    id: 'baza',
    w: W(2),
    bgs: [{ key: 'bg_baza', x: 0 }],
    far: ['bg_far1'],
    safe: true,
    map: 3,
    coins: 0,
    exits: [
      { side: 'L', to: 'stadion' },
      { side: 'R', to: 'bahnhof' },
    ],
    props: [
      { kind: 'door', x: 196, shop: 'halina' },
      { kind: 'door', x: 556, shop: 'costel' },
      { kind: 'pfand', x: 780 },
    ],
    spawns: [civ('opa', 400, 200, W(2), 1), civ('frau', 700, 230, W(2))],
    items: [
      { kind: 'bottle', x: 300, y: 250 },
      { kind: 'bottle', x: 860, y: 176 },
    ],
  },
  bahnhof: {
    id: 'bahnhof',
    w: W(3),
    bgs: [{ key: 'bg_bahnhof', x: 0 }],
    far: ['bg_far2'],
    map: 4,
    coins: 12,
    exits: [
      { side: 'L', to: 'baza' },
      { side: 'R', to: 'garten' },
    ],
    props: [
      { kind: 'door', x: 1236, shop: 'doner' },
      { kind: 'pfand', x: 620 },
    ],
    spawns: [
      civ('herr', 300, 190, W(3)),
      civ('frau', 900, 240, W(3), 1),
      thug('kontroler', 640, 200, W(3)),
      thug('kontroler', 680, 236, W(3)),
      thug('kontroler', 1000, 216, W(3)),
    ],
    items: [
      { kind: 'bottle', x: 520, y: 180 },
      { kind: 'baguette', x: 820, y: 172 },
      { kind: 'bin', x: 1100, y: 166 },
    ],
  },
  garten: {
    id: 'garten',
    w: W(3),
    bgs: [{ key: 'bg_garten', x: 0 }],
    far: ['bg_far1'],
    map: 5,
    coins: 15,
    exits: [
      { side: 'L', to: 'bahnhof' },
      { side: 'R', to: 'industrie' },
    ],
    props: [],
    spawns: [
      civ('opa', 260, 186, W(3), 1),
      thug('gartner', 600, 200, W(3)),
      thug('gartner', 900, 236, W(3)),
      thug('gartner', 1200, 210, W(3)),
    ],
    items: [
      { kind: 'rake', x: 480, y: 168 },
      { kind: 'gnome', x: 760, y: 168 },
      { kind: 'gnome', x: 1080, y: 170 },
      { kind: 'tire', x: 1300, y: 244 },
    ],
  },
  industrie: {
    id: 'industrie',
    w: W(3),
    bgs: [{ key: 'bg_industrie', x: 0 }],
    far: ['bg_far2'],
    map: 6,
    coins: 18,
    exits: [{ side: 'L', to: 'garten' }],
    props: [
      { kind: 'door', x: 316, shop: 'spaeti' },
      { kind: 'pfand', x: 900 },
    ],
    spawns: [
      thug('pfandler', 520, 200, W(3)),
      thug('pfandler', 760, 240, W(3)),
      thug('pfandler', 1040, 186, W(3)),
    ],
    items: [
      { kind: 'crate', x: 640, y: 168 },
      { kind: 'bottle', x: 700, y: 250 },
      { kind: 'bottle', x: 980, y: 178 },
      { kind: 'tire', x: 1180, y: 200 },
    ],
  },
  stadion: {
    id: 'stadion',
    w: W(3),
    bgs: [{ key: 'bg_stadion', x: 0 }],
    far: ['bg_far2'],
    map: 2,
    coins: 15,
    exits: [
      { side: 'L', to: 'altstadt' },
      { side: 'R', to: 'baza' },
    ],
    props: [],
    spawns: [
      thug('ultra', 1000, 200, W(3)),
      thug('ultra', 1040, 236, W(3)),
      thug('ultra', 700, 210, W(3)),
      thug('ultra', 480, 190, W(3)),
    ],
    items: [
      { kind: 'bottle', x: 600, y: 176 },
      { kind: 'crate', x: 940, y: 168 },
      { kind: 'cone', x: 1200, y: 250 },
    ],
  },
  altstadt: {
    id: 'altstadt',
    w: W(3),
    bgs: [{ key: 'bg_altstadt', x: 0 }],
    far: ['bg_far1'],
    map: 1,
    coins: 20,
    exits: [
      { side: 'L', to: 'holownia', needStamps: true },
      { side: 'R', to: 'stadion' },
    ],
    props: [
      { kind: 'door', x: 1323, shop: 'baecker' },
      { kind: 'door', x: 1083, shop: 'apotheke' },
      { kind: 'door', x: 843, shop: 'buch' },
    ],
    spawns: [
      civ('frau', 1000, 200, W(3), 1),
      civ('opa', 1250, 240, W(3)),
      thug('beamter', 640, 190, W(3)),
      thug('beamter', 460, 230, W(3)),
      thug('beamter', 1200, 210, W(3)),
    ],
    items: [
      { kind: 'binder', x: 520, y: 170 },
      { kind: 'cone', x: 300, y: 250 },
    ],
  },
  holownia: {
    id: 'holownia',
    w: W(2),
    bgs: [{ key: 'bg_holownia', x: 0 }],
    far: ['bg_far3'],
    map: 0,
    coins: 25,
    exits: [{ side: 'R', to: 'altstadt' }],
    props: [],
    spawns: [thug('kontroler', 760, 240, W(2)), thug('ultra', 700, 190, W(2)), thug('beamter', 600, 220, W(2))],
    items: [{ kind: 'tire', x: 250, y: 200 }],
  },
};

export const CITY_ORDER: CityAreaId[] = ['holownia', 'altstadt', 'stadion', 'baza', 'bahnhof', 'garten', 'industrie'];
export const STAMP_COUNT = 5;
export const ALL_STAMPS = (1 << STAMP_COUNT) - 1;
