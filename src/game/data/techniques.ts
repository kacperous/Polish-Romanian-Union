/** Techniki walki z książek (jak w River City Ransom — kupowane w sklepach). */
import type { CharId } from '../constants';

/** Kolejność jest stała — to bity w haśle zapisu. */
export const TECH_IDS = ['mlynek', 'wyskok', 'seria', 'piesc', 'taran', 'oszczep', 'brzytwa', 'krawaciarz', 'klepniecie'] as const;
export type TechId = (typeof TECH_IDS)[number];

export interface TechDef {
  /** kto może się nauczyć (brak = obaj) */
  who?: CharId;
}

export const TECHS: Record<TechId, TechDef> = {
  /** Polak: cios w skoku trafia na wszystkie strony (obrót pałką) */
  mlynek: { who: 'pole' },
  /** Rumun: kopniak z wyskoku — większy zasięg i obrażenia */
  wyskok: { who: 'romanian' },
  /** Rumun: szybsza seria kopniaków */
  seria: { who: 'romanian' },
  /** obaj: przytrzymaj BIJ i puść — ładowany cios */
  piesc: {},
  /** Polak: cios w biegu taranuje całą grupę */
  taran: { who: 'pole' },
  /** obaj: rzuty lecą dalej i bolą bardziej */
  oszczep: {},
  /** Rumun: pierwsze przyłapanie przy kradzieży nie przerywa roboty */
  brzytwa: { who: 'romanian' },
  /** Polak: szybciej przeszukuje znokautowanych i znajduje więcej */
  krawaciarz: { who: 'pole' },
  /** obaj: szybsze podnoszenie kumpla i dłuższa nietykalność */
  klepniecie: {},
};

export function techBit(id: TechId): number {
  return 1 << TECH_IDS.indexOf(id);
}

export function hasTech(mask: number, id: TechId): boolean {
  return (mask & techBit(id)) !== 0;
}

export function canLearn(c: CharId, id: TechId): boolean {
  const w = TECHS[id].who;
  return !w || w === c;
}

/** Czas przytrzymania BIJ dla ładowanego ciosu. */
export const CHARGE_TIME = 0.6;
