export const GAME_W = 960;
export const GAME_H = 540;
export const ZOOM = 2;
export const VIEW_W = GAME_W / ZOOM; // 480
export const VIEW_H = GAME_H / ZOOM; // 270

export const LEVEL_W = 960;
export const WORLD_W = LEVEL_W * 3;
export const WALK_TOP = 160;
export const WALK_BOTTOM = 262;

export const PLAYER_SPEED = 78;
export const PLAYER_MAX_HP = 12;

export type CharId = 'pole' | 'romanian';
export type NpcKind = 'herr' | 'frau' | 'jogger' | 'opa' | 'gartner' | 'boss' | 'polizei';

export const CHAR_NAMES: Record<CharId, string> = {
  pole: 'Polak',
  romanian: 'Rumun',
};

/** Poziomy (od prawej do lewej). index 0 = pierwszy poziom (prawa strona świata). */
export const LEVELS = [
  { name: 'Poziom 1: Przedmieście', sub: 'Ukradnij krasnala ogrodowego', x0: LEVEL_W * 2, x1: LEVEL_W * 3 },
  { name: 'Poziom 2: Einkaufsstraße', sub: 'Ukradnij rower', x0: LEVEL_W, x1: LEVEL_W * 2 },
  { name: 'Poziom 3: Willowe osiedle', sub: 'Ukradnijcie auto — RAZEM!', x0: 0, x1: LEVEL_W },
];

export const ANIM_FRAMES = {
  idle: [0, 1],
  walk: [2, 3, 4, 5],
  atk: [6, 7, 8],
  hurt: [9],
  down: [10],
  act: [11, 12],
} as const;

export type AnimName = keyof typeof ANIM_FRAMES;

export const ITEM_POS = {
  gnome: { x: 2478, y: 166 },
  bike: { x: 1520, y: 170 },
  car: { x: 300, y: 236 },
};

export const PLAYER_START: Record<CharId, { x: number; y: number }> = {
  pole: { x: 2830, y: 190 },
  romanian: { x: 2850, y: 226 },
};

/** Minimalne x gracza w zależności od etapu (bramy między poziomami). */
export function gateMinX(stage: number): number {
  if (stage <= 0) return LEVEL_W * 2 + 6;
  if (stage === 1) return LEVEL_W + 6;
  return 6;
}
