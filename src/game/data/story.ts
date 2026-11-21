/** Rozdział II — bandy, bossowie, dialogi i zadania poboczne. Teksty są kluczami i18n. */
import type { NpcKind } from '../constants';
import type { ItemKind } from './items';
import type { CityAreaId } from './city';

/** [kto mówi (rodzaj postaci), klucz tekstu] */
export type DialogLine = [string, string];

/** Ile sekund trwa jedna linijka dialogu (scenka zatrzymuje wrogów). */
export const DIALOG_LINE = 3;

export interface NpcParams {
  hp: number;
  speed: number;
  /** czas zamachu (domyślnie 0.4 s) */
  windup?: number;
  /** mnożnik obrażeń ciosu */
  dmg?: number;
  /** zasięg ciosu */
  reach?: number;
  /** cios zabiera kasę zamiast życia (mandat Ordnungsamtu) */
  mandat?: boolean;
  /** szarża z rozbiegu (kibice, Klaus w 2. fazie) */
  charge?: boolean;
  /** wyczarowuje przedmiot do rzucania (bossowie) */
  conjure?: ItemKind;
  /** fala uderzeniowa bębna — trzeba przeskoczyć */
  drum?: boolean;
  /** zawsze podnosi przedmioty */
  grabs?: boolean;
  /** zbiera monety z ziemi (Pfandsammler) */
  stealsCoins?: boolean;
  /** skala sprite'a */
  scale?: number;
}

export const NPC_PARAMS: Record<NpcKind, NpcParams> = {
  herr: { hp: 40, speed: 22 },
  frau: { hp: 30, speed: 22 },
  jogger: { hp: 40, speed: 42 },
  opa: { hp: 30, speed: 14 },
  gartner: { hp: 50, speed: 22, grabs: true },
  boss: { hp: 60, speed: 22 },
  polizei: { hp: 70, speed: 50 },
  // bandy
  kontroler: { hp: 55, speed: 26, windup: 0.8, dmg: 2 },
  pfandler: { hp: 45, speed: 40, stealsCoins: true, grabs: true },
  ultra: { hp: 55, speed: 34, charge: true },
  beamter: { hp: 60, speed: 24, mandat: true },
  halina: { hp: 999, speed: 0 },
  costel: { hp: 999, speed: 0 },
  // bossowie
  b_fahr: { hp: 220, speed: 30, windup: 0.7, dmg: 2, scale: 1.2 },
  b_gunther: { hp: 360, speed: 26, conjure: 'gnome', scale: 1.25 },
  b_paul: { hp: 380, speed: 36, conjure: 'crate', stealsCoins: true, scale: 1.25 },
  b_thorsten: { hp: 420, speed: 30, drum: true, charge: true, scale: 1.25 },
  b_paragraf: { hp: 400, speed: 28, conjure: 'binder', mandat: true, scale: 1.2 },
  b_klaus: { hp: 600, speed: 30, reach: 46, dmg: 1.5, charge: true, scale: 1.35 },
};

/** Imiona członków band (pokazywane przy pierwszym trafieniu — jak w River City Ransom). */
export const GANG_NAMES = [
  'Jürgen', 'Uwe', 'Dieter', 'Horst', 'Klaus-Peter', 'Detlef', 'Ralf', 'Torsten', 'Sven', 'Holger',
  'Heiko', 'Rüdiger', 'Bernd', 'Manfred', 'Sabine', 'Birgit', 'Gudrun', 'Heike', 'Uschi', 'Dörte',
];

export type BossId = 'fahr' | 'gunther' | 'paul' | 'thorsten' | 'paragraf' | 'klaus';

export interface BossDef {
  id: BossId;
  area: CityAreaId;
  /** bit pieczątki (-1 = finał bez pieczątki) */
  stamp: number;
  spawns: { kind: NpcKind; x: number; y: number }[];
  intro: DialogLine[];
  outro: DialogLine[];
}

export const BOSSES: BossDef[] = [
  {
    id: 'fahr',
    area: 'bahnhof',
    stamp: 0,
    spawns: [
      { kind: 'b_fahr', x: 1290, y: 196 },
      { kind: 'b_fahr', x: 1330, y: 236 },
    ],
    intro: [
      ['b_fahr', 'd.fahr.1'],
      ['b_fahr', 'd.fahr.2'],
      ['romanian', 'd.fahr.3'],
    ],
    outro: [['b_fahr', 'd.fahr.out']],
  },
  {
    id: 'gunther',
    area: 'garten',
    stamp: 1,
    spawns: [{ kind: 'b_gunther', x: 1300, y: 210 }],
    intro: [
      ['b_gunther', 'd.gunther.1'],
      ['b_gunther', 'd.gunther.2'],
      ['pole', 'd.gunther.3'],
    ],
    outro: [['b_gunther', 'd.gunther.out']],
  },
  {
    id: 'paul',
    area: 'industrie',
    stamp: 2,
    spawns: [{ kind: 'b_paul', x: 1300, y: 216 }],
    intro: [
      ['b_paul', 'd.paul.1'],
      ['romanian', 'd.paul.2'],
      ['b_paul', 'd.paul.3'],
    ],
    outro: [['b_paul', 'd.paul.out']],
  },
  {
    id: 'thorsten',
    area: 'stadion',
    stamp: 3,
    spawns: [{ kind: 'b_thorsten', x: 200, y: 210 }],
    intro: [
      ['b_thorsten', 'd.thorsten.1'],
      ['b_thorsten', 'd.thorsten.2'],
      ['pole', 'd.thorsten.3'],
    ],
    outro: [['b_thorsten', 'd.thorsten.out']],
  },
  {
    id: 'paragraf',
    area: 'altstadt',
    stamp: 4,
    spawns: [{ kind: 'b_paragraf', x: 220, y: 206 }],
    intro: [
      ['b_paragraf', 'd.paragraf.1'],
      ['b_paragraf', 'd.paragraf.2'],
      ['romanian', 'd.paragraf.3'],
    ],
    outro: [['b_paragraf', 'd.paragraf.out']],
  },
  {
    id: 'klaus',
    area: 'holownia',
    stamp: -1,
    spawns: [{ kind: 'b_klaus', x: 330, y: 212 }],
    intro: [
      ['b_klaus', 'd.klaus.1'],
      ['b_klaus', 'd.klaus.2'],
      ['pole', 'd.klaus.3'],
      ['romanian', 'd.klaus.4'],
    ],
    outro: [
      ['b_klaus', 'd.klaus.out'],
      ['pole', 'd.klaus.out2'],
    ],
  },
];

/** Flagi fabuły (bity w haśle). */
export const FLAG = {
  INTRO: 1,
  PFAND_DONE: 2,
  GNOMES_DONE: 4,
  GATE: 8,
  FINISHED: 16,
} as const;

export const INTRO_DIALOG: DialogLine[] = [
  ['halina', 'd.intro.1'],
  ['costel', 'd.intro.2'],
  ['costel', 'd.intro.3'],
  ['pole', 'd.intro.4'],
  ['romanian', 'd.intro.5'],
  ['halina', 'd.intro.6'],
];

export const GATE_DIALOG: DialogLine[] = [
  ['halina', 'd.gate.1'],
  ['costel', 'd.gate.2'],
];

/** Zadanie Haliny: tyle butelek zwrotnych za nagrodę. */
export const PFAND_GOAL = 20;
export const PFAND_REWARD = 100;
export const PFAND_DIALOG: DialogLine[] = [['halina', 'd.pfand.done']];

/** Ukryte krasnale (po jednym na dzielnicę) — za każdy +1 Wytrz. i +1 Łeb obu, za wszystkie premia. */
export const GNOME_SPOTS: Partial<Record<CityAreaId, { x: number; bit: number }>> = {
  bahnhof: { x: 64, bit: 0 },
  garten: { x: 700, bit: 1 },
  industrie: { x: 1016, bit: 2 },
  stadion: { x: 1160, bit: 3 },
  altstadt: { x: 470, bit: 4 },
};
export const GNOME_REWARD = 200;
export const GNOMES_DIALOG: DialogLine[] = [['costel', 'd.gnomes.done']];
