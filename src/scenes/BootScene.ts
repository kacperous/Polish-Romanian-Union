import Phaser from 'phaser';
import { t } from '../i18n';
import { ANIM_FRAMES } from '../game/constants';
import { txt } from '../ui';

export const CHAR_KEYS = ['pole', 'romanian', 'herr', 'frau', 'jogger', 'opa', 'gartner', 'boss', 'polizei'];
const SFX = ['block', 'hit', 'swing', 'kick', 'coin', 'steal', 'rage', 'alert', 'siren', 'hurt', 'pickup', 'click', 'engine', 'pick', 'ko', 'win', 'lose', 'music_game', 'music_menu'];

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const bar = this.add.rectangle(480, 290, 4, 18, 0xf2c230).setOrigin(0, 0.5);
    this.add.rectangle(480, 290, 404, 26).setStrokeStyle(3, 0xffffff);
    bar.x = 278;
    txt(this, 480, 240, t('loading'), 28, '#ffffff');
    this.load.on('progress', (v: number) => (bar.width = 400 * v));

    const a = 'assets/';
    for (const k of CHAR_KEYS) this.load.spritesheet(`char_${k}`, `${a}char_${k}.png`, { frameWidth: 40, frameHeight: 40 });
    this.load.image('gnome', `${a}gnome.png`);
    this.load.spritesheet('bike', `${a}bike.png`, { frameWidth: 36, frameHeight: 24 });
    this.load.spritesheet('car', `${a}car.png`, { frameWidth: 104, frameHeight: 46 });
    this.load.spritesheet('fx_hit', `${a}fx_hit.png`, { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('fx_stars', `${a}fx_stars.png`, { frameWidth: 20, frameHeight: 10 });
    this.load.spritesheet('fx_steam', `${a}fx_steam.png`, { frameWidth: 8, frameHeight: 8 });
    for (const k of ['shadow', 'icon_alert', 'icon_q', 'coin', 'fx_anger', 'dust', 'arrow', 'px', 'title', 'title_en', 'title_ro']) this.load.image(k, `${a}${k}.png`);
    for (let i = 1; i <= 3; i++) {
      this.load.image(`bg_level${i}`, `${a}bg_level${i}.png`);
      this.load.image(`bg_far${i}`, `${a}bg_far${i}.png`);
    }
    for (const s of SFX) this.load.audio(s, `${a}sfx/${s}.wav`);
  }

  create() {
    for (const k of CHAR_KEYS) {
      const tex = `char_${k}`;
      for (const [name, frames] of Object.entries(ANIM_FRAMES)) {
        const rate = name === 'walk' ? (k === 'jogger' ? 12 : 9) : name === 'run' ? 15 : name === 'atk' ? 14 : name === 'idle' ? 2 : 6;
        this.anims.create({
          key: `${tex}-${name}`,
          frames: this.anims.generateFrameNumbers(tex, { frames: [...frames] }),
          frameRate: rate,
          repeat: ['atk', 'hurt', 'down', 'jump', 'jatk', 'block'].includes(name) ? 0 : -1,
        });
      }
    }
    this.anims.create({ key: 'fx_hit', frames: this.anims.generateFrameNumbers('fx_hit', { frames: [0, 1, 2] }), frameRate: 18, repeat: 0 });
    this.anims.create({ key: 'fx_stars', frames: this.anims.generateFrameNumbers('fx_stars', { frames: [0, 1] }), frameRate: 5, repeat: -1 });
    this.anims.create({ key: 'fx_steam', frames: this.anims.generateFrameNumbers('fx_steam', { frames: [0, 1] }), frameRate: 4, repeat: -1 });
    this.scene.start('Menu');
  }
}
