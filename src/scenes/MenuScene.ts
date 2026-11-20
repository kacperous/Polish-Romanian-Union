import Phaser from 'phaser';
import { getLang, LANGS, Lang, setLang, t } from '../i18n';
import { button, COLORS, menuBackdrop, txt } from '../ui';
import { net } from '../net/Net';
import { playMusic } from '../audio';
import { isTouchDevice } from '../game/Controls';

export class MenuScene extends Phaser.Scene {
  private status!: Phaser.GameObjects.Text;
  private busy = false;

  constructor() {
    super('Menu');
  }

  create(data: { error?: string }) {
    this.busy = false;
    menuBackdrop(this);
    playMusic(this, 'music_menu', 0.3);

    const title = this.add.image(480, 105, getLang() === 'pl' ? 'title' : `title_${getLang()}`).setScale(2);
    this.tweens.add({ targets: title, y: 112, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    txt(this, 480, 196, t('title.sub'), 20, '#ffe08a', 5);

    // postacie na boku
    const pole = this.add.sprite(150, 420, 'char_pole').setScale(5).play('char_pole-idle');
    const rom = this.add.sprite(810, 420, 'char_romanian').setScale(5).play('char_romanian-idle').setFlipX(true);
    this.add.image(150, 516, 'shadow').setScale(5).setDepth(-1);
    this.add.image(810, 516, 'shadow').setScale(5).setDepth(-1);
    this.time.addEvent({
      delay: 2600,
      loop: true,
      callback: () => {
        pole.play('char_pole-atk').once('animationcomplete', () => pole.play('char_pole-idle'));
        this.sound.play('swing', { volume: 0.2 });
      },
    });
    this.time.addEvent({
      delay: 3300,
      loop: true,
      callback: () => {
        rom.play('char_romanian-act').once('animationrepeat', () => rom.play('char_romanian-idle'));
      },
    });

    button(this, 480, 262, 360, 56, t('menu.create'), COLORS.red, () => this.createGame());
    button(this, 480, 330, 360, 56, t('menu.join'), COLORS.blue, () => this.scene.start('Join'));
    button(this, 480, 398, 360, 56, t('menu.solo'), COLORS.green, () => this.scene.start('Lobby', { mode: 'solo' }));

    const help = isTouchDevice()
      ? t('menu.help.touch')
      : t('menu.help.keys');
    txt(this, 480, 462, help, 16, '#ffffff', 4);
    this.status = txt(this, 480, 500, data?.error || '', 20, '#ff6060', 5);

    this.langSwitch();

    // ?join=123456 w linku
    const params = new URLSearchParams(location.search);
    const code = params.get('join');
    if (code && /^\d{6}$/.test(code)) {
      history.replaceState(null, '', location.pathname);
      this.scene.start('Join', { code });
    }
  }

  /** Przełącznik języka PL / EN / RO z flagami. */
  private langSwitch() {
    const flags: Record<Lang, [number, number[]]> = {
      pl: [0, [0xf4f4f4, 0xd8263a]],
      en: [1, [0x1f3f98, 0xf4f4f4, 0xd8263a]],
      ro: [2, [0x1f3f98, 0xf2c230, 0xd8263a]],
    };
    LANGS.forEach((l) => {
      const [i, cols] = flags[l];
      const x = 800 + i * 58;
      const y = 26;
      const active = l === getLang();
      const c = this.add.container(x, y);
      const frame = this.add.rectangle(0, 0, 50, 34, 0x181020).setStrokeStyle(3, active ? 0xffe040 : 0x505060);
      c.add(frame);
      if (l === 'pl') {
        c.add(this.add.rectangle(0, -7, 42, 13, cols[0]));
        c.add(this.add.rectangle(0, 6, 42, 13, cols[1]));
      } else if (l === 'ro') {
        cols.forEach((col, k) => c.add(this.add.rectangle(-14 + k * 14, 0, 14, 26, col)));
      } else {
        c.add(this.add.rectangle(0, 0, 42, 26, cols[0]));
        c.add(this.add.rectangle(0, 0, 42, 8, cols[1]));
        c.add(this.add.rectangle(0, 0, 8, 26, cols[1]));
        c.add(this.add.rectangle(0, 0, 42, 4, cols[2]));
        c.add(this.add.rectangle(0, 0, 4, 26, cols[2]));
      }
      c.add(txt(this, 0, 30, l.toUpperCase(), 16, active ? '#ffe040' : '#ffffff', 4));
      c.setAlpha(active ? 1 : 0.7);
      frame.setInteractive({ useHandCursor: true }).on('pointerup', () => {
        if (l === getLang()) return;
        setLang(l);
        this.sound.play('click', { volume: 0.5 });
        this.scene.restart({});
      });
    });
  }

  private async createGame() {
    if (this.busy) return;
    this.busy = true;
    this.status.setColor('#ffffff').setText(t('menu.connecting'));
    try {
      const code = await net.create();
      this.scene.start('Lobby', { mode: 'host', code });
    } catch (e) {
      this.busy = false;
      this.status.setColor('#ff6060').setText(t((e as Error).message) + t('menu.try_solo'));
    }
  }
}
