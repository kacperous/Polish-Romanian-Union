/**
 * Sklepy: jedzenie leczy i NA STAŁE podnosi statystyki (jak w River City Ransom),
 * książki uczą technik. Ceny w €; jedzenie na wynos trafia do ekwipunku (4 sloty).
 */
import type { CharId } from '../constants';
import type { StatId } from '../stats';
import type { TechId } from './techniques';

export const SHOP_IDS = ['halina', 'costel', 'doner', 'baecker', 'spaeti', 'apotheke', 'buch'] as const;
export type ShopId = (typeof SHOP_IDS)[number];

export interface Good {
  id: string;
  price: number;
  /** leczenie (pkt życia; 999 = do pełna) */
  heal?: number;
  /** stałe przyrosty statystyk */
  stats?: Partial<Record<StatId, number>>;
  /** czy można wziąć na wynos */
  take?: boolean;
  /** książka z techniką */
  book?: TechId;
  /** tylko dla tej postaci */
  who?: CharId;
}

export interface ShopDef {
  id: ShopId;
  goods: Good[];
}

export const INV_SLOTS = 4;

export const SHOPS: Record<ShopId, ShopDef> = {
  halina: {
    id: 'halina',
    goods: [
      { id: 'pierogi', price: 12, heal: 40, stats: { obr: 1, wytrz: 1 }, take: true },
      { id: 'bigos', price: 18, heal: 60, stats: { wytrz: 2 }, take: true },
      { id: 'paczek', price: 6, heal: 15, stats: { zw: 1 }, take: true },
      { id: 'kompot', price: 4, heal: 10, stats: { leb: 1 } },
      { id: 'mleczko', price: 10, heal: 20, stats: { reka: 1, rzut: 1 }, take: true },
      { id: 'b_mlynek', price: 80, book: 'mlynek', who: 'pole' },
      { id: 'b_taran', price: 70, book: 'taran', who: 'pole' },
      { id: 'b_krawaciarz', price: 40, book: 'krawaciarz', who: 'pole' },
    ],
  },
  costel: {
    id: 'costel',
    goods: [
      { id: 'mici', price: 12, heal: 40, stats: { sila: 1, kop: 1 }, take: true },
      { id: 'sarmale', price: 18, heal: 60, stats: { wytrz: 1, obr: 1 }, take: true },
      { id: 'cozonac', price: 10, heal: 25, stats: { reka: 2 }, take: true },
      { id: 'papanasi', price: 14, heal: 30, stats: { zw: 1, kop: 1 } },
      { id: 'ciorba', price: 8, heal: 30, stats: { leb: 1 } },
      { id: 'b_wyskok', price: 80, book: 'wyskok', who: 'romanian' },
      { id: 'b_seria', price: 70, book: 'seria', who: 'romanian' },
      { id: 'b_brzytwa', price: 50, book: 'brzytwa', who: 'romanian' },
    ],
  },
  doner: {
    id: 'doner',
    goods: [
      { id: 'doner', price: 8, heal: 35, stats: { sila: 1 }, take: true },
      { id: 'durum', price: 10, heal: 40, stats: { kop: 1, rzut: 1 }, take: true },
      { id: 'ayran', price: 3, heal: 10, stats: { leb: 1 } },
    ],
  },
  baecker: {
    id: 'baecker',
    goods: [
      { id: 'brezel', price: 3, heal: 12, stats: { rzut: 1 }, take: true },
      { id: 'bienenstich', price: 6, heal: 20, stats: { zw: 1 }, take: true },
      { id: 'schwarzwald', price: 14, heal: 45, stats: { wytrz: 1, sila: 1 } },
    ],
  },
  spaeti: {
    id: 'spaeti',
    goods: [
      { id: 'currywurst', price: 6, heal: 25, stats: { sila: 1 }, take: true },
      { id: 'mate', price: 4, heal: 10, stats: { zw: 1 }, take: true },
      { id: 'gummi', price: 2, heal: 5, stats: { reka: 1 }, take: true },
    ],
  },
  apotheke: {
    id: 'apotheke',
    goods: [
      { id: 'pflaster', price: 15, heal: 60, take: true },
      { id: 'salbe', price: 40, heal: 999, take: true },
      { id: 'globuli', price: 25, stats: { leb: 2 } },
    ],
  },
  buch: {
    id: 'buch',
    goods: [
      { id: 'b_piesc', price: 60, book: 'piesc' },
      { id: 'b_oszczep', price: 50, book: 'oszczep' },
      { id: 'b_klepniecie', price: 30, book: 'klepniecie' },
    ],
  },
};

/** Wszystkie towary po id (do ekwipunku i hasła). */
export const GOODS: Record<string, Good> = Object.fromEntries(
  Object.values(SHOPS).flatMap((s) => s.goods.map((g) => [g.id, g] as const)),
);

/** Towary, które mogą leżeć w ekwipunku — kolejność stała (indeksy w haśle). */
export const TAKEAWAY_IDS: string[] = Object.values(SHOPS).flatMap((s) => s.goods.filter((g) => g.take).map((g) => g.id));
