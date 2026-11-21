import Phaser from 'phaser';
import { t } from '../i18n';
import { button, COLORS, FONT, txt } from '../ui';
import type { GameScene } from './GameScene';
import { CharId } from '../game/constants';
import { STAT_IDS } from '../game/stats';
import { hasTech, TECH_IDS } from '../game/data/techniques';
import { GOODS, INV_SLOTS } from '../game/data/shops';
import { goodEffect } from './ShopScene';
import { CITY_ORDER } from '../game/data/city';
import { CityRules } from '../game/chapters/city';
import { encodePassword, formatPassword } from '../game/save';

/** Pauza / ekran statusu: statystyki obu postaci, techniki, ekwipunek. */
export class PauseScene extends Phaser.Scene {
  private game_!: GameScene;
  private dyn: Phaser.GameObjects.GameObject[] = [];
  private lastKey = '';

  constructor() {
    super('Pause');
  }

  create(data: { game: GameScene }) {
    this.game_ = data.game;
    this.dyn = [];
    this.lastKey = '';
    this.add.rectangle(480, 270, 960, 540, 0x000000, 0.6).setInteractive();
    this.add.rectangle(480, 270, 900, 510, 0x181020, 0.96).setStrokeStyle(4, 0x80c0ff);
    txt(this, 480, 40, this.game_.data0.mode === 'solo' ? t('pause.title') : t('pause.title_online'), 30, '#ffffff', 6);
    button(this, 360, 506, 220, 40, t('pause.resume'), COLORS.green, () => this.game_.togglePause(false), 20);
    button(this, 600, 506, 220, 40, t('pause.quit'), COLORS.grey, () => this.game_.quitToMenu(), 20);
    if (this.game_.chapter === 2) this.cityInfo();
    this.input.keyboard?.on('keydown-ESC', () => this.game_.togglePause(false));
    this.input.keyboard?.on('keydown-P', () => this.game_.togglePause(false));
  }

  update() {
    const s = this.game_.snap;
    if (!s) return;
    const key = JSON.stringify([s.p.pole.st, s.p.romanian.st, s.p.pole.tc, s.p.romanian.tc, s.p.pole.inv, s.p.romanian.inv, s.p.pole.hp, s.p.romanian.hp]);
    if (key === this.lastKey) return;
    this.lastKey = key;
    this.dyn.forEach((o) => o.destroy());
    this.dyn = [];
    const chars: CharId[] = this.game_.data0.mode === 'solo' ? [this.game_.me] : [this.game_.me, this.game_.other];
    chars.forEach((c, i) => this.column(c, chars.length === 1 ? 480 : 260 + i * 440, c === this.game_.me));
  }

  /** Mapa miasta i hasło zapisu (Rozdział II). */
  private cityInfo() {
    const s = this.game_.snap;
    const cur = s?.city?.ar;
    const parts = CITY_ORDER.map((id) => (id === cur ? `[${t(`area.${id}`).toUpperCase()}]` : t(`area.${id}`)));
    txt(this, 480, 436, parts.join(' – '), 15, '#a8d8ff', 4);
    const sim = this.game_.sim;
    if (sim && sim.rules instanceof CityRules) {
      const pw = encodePassword({ v: 1, progress: sim.progress(), city: { ...sim.rules.state } });
      txt(this, 480, 466, `${t('pause.password')}  ${formatPassword(pw)}`, 15, '#ffe040', 4);
    } else {
      txt(this, 480, 466, t('pause.password_host'), 15, '#c0c0c0', 4);
    }
  }

  private column(c: CharId, cx: number, mine: boolean) {
    const s = this.game_.snap!;
    const p = s.p[c];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => (this.dyn.push(o), o);
    const x0 = cx - 200;
    add(txt(this, cx, 82, `${t(`char.${c}.up`)}${mine ? ` (${t('you')})` : ''}`, 24, mine ? '#7dff7d' : '#80c0ff', 5));
    add(txt(this, cx, 110, `♥ ${p.hp} / ${p.mhp}`, 18, '#ff8080', 4));
    // statystyki
    STAT_IDS.forEach((k, i) => {
      const y = 136 + Math.floor(i / 2) * 24;
      const x = x0 + (i % 2) * 205;
      add(this.add.text(x, y, t(`stat.${k}`), { fontFamily: FONT, fontSize: '16px', color: '#c0c0d0' }));
      add(this.add.text(x + 150, y, String(p.st[i]), { fontFamily: FONT, fontSize: '16px', color: '#ffffff' }));
    });
    // techniki
    add(this.add.text(x0, 238, t('pause.techs'), { fontFamily: FONT, fontSize: '17px', color: '#ffe040' }));
    const known = TECH_IDS.filter((id) => hasTech(p.tc, id));
    add(
      this.add.text(x0, 260, known.length ? known.map((id) => t(`tech.${id}`)).join(', ') : t('pause.none'), {
        fontFamily: FONT,
        fontSize: '14px',
        color: '#ffffff',
        lineSpacing: 2,
        wordWrap: { width: 400 },
      }),
    );
    // ekwipunek
    const iy = 322;
    add(this.add.text(x0, iy, t('pause.inv', { n: p.inv.length, m: INV_SLOTS }), { fontFamily: FONT, fontSize: '17px', color: '#ffe040' }));
    if (!p.inv.length) add(this.add.text(x0, iy + 24, t('pause.none'), { fontFamily: FONT, fontSize: '14px', color: '#808090' }));
    p.inv.forEach((id, i) => {
      const y = iy + 30 + i * 22;
      const g = GOODS[id];
      add(this.add.text(x0, y - 8, `${t(`good.${id}`)}  ${g ? goodEffect(g) : ''}`, { fontFamily: FONT, fontSize: '14px', color: '#ffffff' }));
      if (mine) add(button(this, x0 + 360, y, 70, 20, t('pause.use'), COLORS.green, () => this.game_.requestUse(i), 13));
    });
  }
}
