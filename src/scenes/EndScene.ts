import Phaser from 'phaser';
import { t } from '../i18n';
import { button, COLORS, menuBackdrop, txt } from '../ui';
import { net } from '../net/Net';
import type { Stats } from '../game/types';
import type { CharId } from '../game/constants';
import { playMusic } from '../audio';

export class EndScene extends Phaser.Scene {
  constructor() {
    super('End');
  }

  create(data: { stats: Stats; mode: 'solo' | 'host' | 'guest'; code?: string; me: CharId }) {
    const { stats, mode } = data;
    menuBackdrop(this);
    playMusic(this, 'music_menu', 0.3);
    const offs: (() => void)[] = [];
    this.events.once('shutdown', () => offs.forEach((f) => f()));

    txt(this, 480, 70, stats.win ? t('end.win') : t('end.lose'), 64, stats.win ? '#7dff7d' : '#ff4040', 10);
    txt(this, 480, 130, t(stats.reason), 22, '#ffffff', 5);

    if (stats.win) {
      const car = this.add.sprite(-120, 236, 'car', 1).setScale(3);
      this.tweens.add({ targets: car, x: 1100, duration: 3200, repeat: -1, delay: 300 });
      txt(this, 480, 290, t('end.home'), 20, '#ffe040', 5);
    } else {
      const cop = this.add.sprite(420, 250, 'char_polizei').setScale(4).play('char_polizei-idle');
      const p = this.add.sprite(540, 268, `char_${data.me}`, 10).setScale(4);
      this.tweens.add({ targets: cop, x: 430, duration: 500, yoyo: true, repeat: -1 });
      void p;
    }

    const mins = Math.floor(stats.time / 60);
    const secs = String(stats.time % 60).padStart(2, '0');
    const lines = [
      t('end.money', { v: stats.money }),
      t('end.steals', { v: stats.steals }),
      t('end.kos', { v: stats.kos }),
      t('end.time', { v: `${mins}:${secs}` }),
    ];
    lines.forEach((l, i) => txt(this, 480, 340 + i * 30, l, 22, '#ffffff', 5));

    const status = txt(this, 480, 520, '', 18, '#c0c0c0', 4);
    if (mode === 'guest') {
      status.setText(t('end.wait'));
      offs.push(
        net.on('relay', (d) => {
          if (d.k === 'again') this.scene.start('Lobby', { mode: 'guest', code: data.code });
        }),
        net.on('peer_left', () => {
          net.leave();
          this.scene.start('Menu', { error: t('err.host_left') });
        }),
      );
    } else {
      button(this, 640, 476, 260, 52, t('end.again'), COLORS.red, () => {
        if (mode === 'host') {
          net.send({ k: 'again' });
          this.scene.start('Lobby', { mode: 'host', code: data.code });
        } else this.scene.start('Lobby', { mode: 'solo' });
      });
    }
    button(this, mode === 'guest' ? 480 : 320, 476, 220, 52, t('end.menu'), COLORS.grey, () => {
      if (mode !== 'solo') net.leave();
      this.scene.start('Menu');
    });
  }
}
