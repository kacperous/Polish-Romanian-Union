import Phaser from 'phaser';
import { t } from '../i18n';
import { FONT, txt } from '../ui';
import type { GameScene } from './GameScene';
import { DIALOG_LINE } from '../game/data/story';

/** Scenka dialogowa: portret, imię, tekst pisany na maszynie. Czas linijek liczy host. */
export class DialogScene extends Phaser.Scene {
  private game_!: GameScene;
  private queue: [string, string][] = [];
  private portrait!: Phaser.GameObjects.Sprite;
  private nameT!: Phaser.GameObjects.Text;
  private bodyT!: Phaser.GameObjects.Text;
  private full = '';
  private shown = 0;
  private lineT = 0;

  constructor() {
    super('Dialog');
  }

  create(data: { game: GameScene; lines: [string, string][] }) {
    this.game_ = data.game;
    this.queue = [];
    this.lineT = 0;
    // kinowe pasy
    this.add.rectangle(480, 0, 960, 56, 0x000000, 0.85).setOrigin(0.5, 0);
    this.add.rectangle(480, 540, 960, 150, 0x000000, 0.85).setOrigin(0.5, 1);
    this.add.rectangle(480, 465, 900, 130, 0x181020, 0.95).setStrokeStyle(3, 0xf2c230);
    this.add.rectangle(110, 465, 104, 104, 0x2a2440).setStrokeStyle(2, 0x505060);
    this.portrait = this.add.sprite(110, 470, 'char_pole', 0).setScale(3.2);
    this.nameT = this.add.text(180, 412, '', { fontFamily: FONT, fontSize: '22px', color: '#ffe040', stroke: '#181020', strokeThickness: 4 });
    this.bodyT = this.add.text(180, 444, '', {
      fontFamily: FONT,
      fontSize: '19px',
      color: '#ffffff',
      wordWrap: { width: 740 },
      lineSpacing: 4,
    });
    txt(this, 900, 520, t('dlg.skip'), 13, '#a0a0b0', 3).setOrigin(1, 0.5);
    this.addLines(data.lines);
    this.next();
  }

  addLines(lines: [string, string][]) {
    this.queue.push(...lines);
  }

  private next() {
    const line = this.queue.shift();
    if (!line) return;
    const [who, key] = line;
    const tex = `char_${who}`;
    this.portrait.setTexture(this.textures.exists(tex) ? tex : 'char_pole', 0).setCrop(6, 2, 28, 30);
    this.nameT.setText(t(`who.${who}`));
    this.full = t(key);
    this.shown = 0;
    this.lineT = 0;
    this.bodyT.setText('');
  }

  update(_t: number, dms: number) {
    const dt = dms / 1000;
    this.lineT += dt;
    if (this.shown < this.full.length) {
      this.shown = Math.min(this.full.length, this.shown + dt * 60);
      this.bodyT.setText(this.full.slice(0, Math.floor(this.shown)));
    }
    if (this.lineT >= DIALOG_LINE && this.queue.length) this.next();
    // gra szuka pominięcia (BIJ / dotknięcie)
    void this.game_;
  }
}
