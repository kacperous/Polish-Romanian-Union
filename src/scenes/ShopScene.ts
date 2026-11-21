import Phaser from 'phaser';
import { t } from '../i18n';
import { button, Button, COLORS, FONT, txt } from '../ui';
import type { GameScene } from './GameScene';
import { Good, INV_SLOTS, SHOPS, ShopId } from '../game/data/shops';
import { canLearn, hasTech } from '../game/data/techniques';
import { StatId } from '../game/stats';

/** Opis działania towaru: leczenie, statystyki albo technika. */
export function goodEffect(g: Good): string {
  if (g.book) return t(`tech.${g.book}.d`);
  const parts: string[] = [];
  if (g.heal) parts.push(g.heal >= 999 ? t('shop.heal_full') : `♥+${g.heal}`);
  for (const [k, v] of Object.entries(g.stats ?? {}) as [StatId, number][]) parts.push(`${t(`stat.${k}.s`)} +${v}`);
  return parts.join('  ');
}

/** Sklep — nakładka nad grą. Zakupy liczy host (Sim). */
export class ShopScene extends Phaser.Scene {
  private game_!: GameScene;
  private shop!: ShopId;
  private moneyT!: Phaser.GameObjects.Text;
  private invT!: Phaser.GameObjects.Text;
  private rows: { good: Good; eat: Button; take?: Button; name: Phaser.GameObjects.Text }[] = [];

  constructor() {
    super('Shop');
  }

  create(data: { game: GameScene; shop: ShopId }) {
    this.game_ = data.game;
    this.shop = data.shop;
    this.rows = [];
    const def = SHOPS[this.shop];

    this.add.rectangle(480, 270, 960, 540, 0x000000, 0.55).setInteractive();
    this.add.rectangle(480, 278, 860, 500, 0x181020, 0.96).setStrokeStyle(4, 0xf2c230);
    txt(this, 480, 52, t(`shopname.${this.shop}`).toUpperCase(), 32, '#ffe040', 6);
    txt(this, 480, 88, t(`shopgreet.${this.shop}`), 17, '#ffffff', 4).setWordWrapWidth(800);
    this.moneyT = txt(this, 820, 52, '', 24, '#ffe040', 5);

    const y0 = 128;
    const rowH = Math.min(44, Math.floor(330 / def.goods.length));
    def.goods.forEach((g, i) => {
      const y = y0 + i * rowH;
      const name = this.add.text(70, y - 9, t(`good.${g.id}`), { fontFamily: FONT, fontSize: '19px', color: '#ffffff' });
      this.add.text(70, y + 9, goodEffect(g), { fontFamily: FONT, fontSize: '13px', color: '#a8d8ff' });
      txt(this, 560, y + 2, `${g.price} €`, 20, '#ffe040', 4);
      const eat = button(this, 680, y + 2, 120, rowH - 8, g.book ? t('shop.read') : t('shop.eat'), COLORS.green, () => this.buy(g, 'eat'), 16);
      const take = g.take ? button(this, 815, y + 2, 130, rowH - 8, t('shop.take'), COLORS.blue, () => this.buy(g, 'take'), 16) : undefined;
      this.rows.push({ good: g, eat, take, name });
    });

    this.invT = txt(this, 330, 500, '', 16, '#c0c0c0', 4);
    button(this, 740, 500, 200, 46, t('shop.leave'), COLORS.red, () => this.game_.leaveShop(), 22);
    this.input.keyboard?.on('keydown-ESC', () => this.game_.leaveShop());
    this.refresh();
  }

  private buy(g: Good, mode: 'eat' | 'take') {
    this.game_.requestBuy(g.id, mode);
  }

  private refresh() {
    const s = this.game_.snap;
    if (!s) return;
    const me = s.p[this.game_.me];
    this.moneyT.setText(`${s.money} €`);
    this.invT.setText(t('shop.inv', { n: me.inv.length, m: INV_SLOTS }));
    for (const r of this.rows) {
      const g = r.good;
      const known = !!g.book && (hasTech(me.tc, g.book) || !canLearn(this.game_.me, g.book));
      const blocked = (g.who && g.who !== this.game_.me) || known;
      r.eat.setEnabled(!blocked && s.money >= g.price);
      r.take?.setEnabled(s.money >= g.price && me.inv.length < INV_SLOTS);
      r.name.setColor(blocked ? '#707080' : '#ffffff');
      if (known && hasTech(me.tc, g.book!)) r.eat.setLabel(t('shop.known'));
    }
  }

  update() {
    this.refresh();
  }
}
