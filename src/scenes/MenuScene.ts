import Phaser from 'phaser';
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

    const title = this.add.image(480, 105, 'title').setScale(2);
    this.tweens.add({ targets: title, y: 112, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    txt(this, 480, 196, 'Polak i Rumun na gościnnych występach w Niemczech', 20, '#ffe08a', 5);

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

    button(this, 480, 262, 360, 56, 'STWÓRZ GRĘ ONLINE', COLORS.red, () => this.createGame());
    button(this, 480, 330, 360, 56, 'DOŁĄCZ (KOD)', COLORS.blue, () => this.scene.start('Join'));
    button(this, 480, 398, 360, 56, 'GRAJ SOLO', COLORS.green, () => this.scene.start('Lobby', { mode: 'solo' }));

    const help = isTouchDevice()
      ? 'Joystick: ruch   •   BIJ: cios   •   AKCJA (przytrzymaj): kradnij / otwieraj / podnoś'
      : 'WASD/strzałki: ruch   •   J / Spacja: BIJ   •   K / E (przytrzymaj): AKCJA';
    txt(this, 480, 462, help, 16, '#ffffff', 4);
    this.status = txt(this, 480, 500, data?.error || '', 20, '#ff6060', 5);

    // ?join=123456 w linku
    const params = new URLSearchParams(location.search);
    const code = params.get('join');
    if (code && /^\d{6}$/.test(code)) {
      history.replaceState(null, '', location.pathname);
      this.scene.start('Join', { code });
    }
  }

  private async createGame() {
    if (this.busy) return;
    this.busy = true;
    this.status.setColor('#ffffff').setText('Łączenie z serwerem...');
    try {
      const code = await net.create();
      this.scene.start('Lobby', { mode: 'host', code });
    } catch (e) {
      this.busy = false;
      this.status.setColor('#ff6060').setText((e as Error).message + ' — spróbuj GRAJ SOLO');
    }
  }
}
