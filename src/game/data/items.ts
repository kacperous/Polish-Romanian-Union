/** Przedmioty, które można podnieść z ulicy: bronie (BIJ = zamach) i rzucane (BIJ = rzut). */

export const ITEM_KINDS = ['bin', 'bottle', 'cone', 'rake', 'baguette', 'crate', 'tire', 'binder', 'gnome'] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export interface ItemDef {
  /** weapon — zamach w ręce; throw — trzymane nad głową, BIJ = rzut */
  type: 'weapon' | 'throw';
  /** premia do obrażeń (zamach) lub obrażeń rzutu */
  dmg: number;
  /** zasięg zamachu */
  range: number;
  /** prędkość lotu przy rzucie */
  speed: number;
  /** ile trafień wytrzyma broń (0 = niezniszczalna) */
  dur: number;
  /** rozbija się po upadku */
  breaks?: boolean;
  /** toczy się po upadku */
  rolls?: boolean;
}

export const ITEMS: Record<ItemKind, ItemDef> = {
  cone: { type: 'weapon', dmg: 8, range: 38, speed: 260, dur: 0 },
  rake: { type: 'weapon', dmg: 6, range: 44, speed: 240, dur: 0 },
  baguette: { type: 'weapon', dmg: 4, range: 32, speed: 280, dur: 3 },
  binder: { type: 'weapon', dmg: 7, range: 32, speed: 280, dur: 0 },
  bin: { type: 'throw', dmg: 16, range: 0, speed: 200, dur: 0 },
  crate: { type: 'throw', dmg: 14, range: 0, speed: 220, dur: 0 },
  bottle: { type: 'throw', dmg: 6, range: 0, speed: 320, dur: 0, breaks: true },
  tire: { type: 'throw', dmg: 12, range: 0, speed: 230, dur: 0, rolls: true },
  gnome: { type: 'throw', dmg: 10, range: 0, speed: 260, dur: 0 },
};

/** Surowe obrażenia przedmiotu rzuconego przez NPC w gracza. */
export const NPC_THROW_DMG = 14;
