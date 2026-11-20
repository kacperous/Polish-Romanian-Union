import Phaser from 'phaser';
import { t } from '../i18n';
import { button, Button, COLORS, menuBackdrop, txt } from '../ui';
import { net } from '../net/Net';
import { CharId } from '../game/constants';
import type { GameStartData } from '../game/types';

type Mode = 'solo' | 'host' | 'guest';
interface Picks {
  host: CharId | null;
  guest: CharId | null;
}


export class LobbyScene extends Phaser.Scene {
  private mode: Mode = 'solo';
  private code = '';
  private picks: Picks = { host: null, guest: null };
  private guestPresent = false;
  private offs: (() => void)[] = [];
  private tags: Record<CharId, Phaser.GameObjects.Text> = {} as never;
  private cards: Record<CharId, Phaser.GameObjects.Rectangle> = {} as never;
  private status!: Phaser.GameObjects.Text;
  private startBtn?: Button;

  constructor() {
    super('Lobby');
  }

  create(data: { mode: Mode; code?: string }) {
    this.mode = data.mode;
    this.code = data.code || '';
    this.picks = { host: null, guest: null };
    this.guestPresent = false;
    this.offs = [];
    this.startBtn = undefined;
    menuBackdrop(this);

    if (this.mode === 'solo') {
      txt(this, 480, 44, t('lobby.pick'), 40, '#ffe040');
      txt(this, 480, 82, t('lobby.solo_sub'), 18, '#ffffff', 4);
    } else {
      txt(this, 480, 30, t('lobby.code'), 22, '#ffffff', 5);
      const codeT = txt(this, 480, 68, this.code.split('').join(' '), 52, '#ffe040', 8);
      if (this.mode === 'host') {
        codeT.x = 400;
        button(this, 700, 68, 210, 46, t('lobby.copy'), COLORS.blue, () => this.copyLink(), 20);
      }
    }

    (['pole', 'romanian'] as CharId[]).forEach((c, i) => this.makeCard(c, i === 0 ? 270 : 690));

    this.status = txt(this, 480, 470, '', 22, '#ffffff', 5);
    button(this, 110, 505, 170, 48, t('lobby.menu'), COLORS.grey, () => this.backToMenu(), 22);

    if (this.mode !== 'guest') {
      this.startBtn = button(this, 480, 512, 260, 52, t('lobby.start'), COLORS.red, () => this.startGame(), 30);
    }

    // sieć
    if (this.mode === 'host') {
      this.offs.push(
        net.on('peer_joined', () => {
          this.guestPresent = true;
          this.sound.play('pickup', { volume: 0.4 });
          this.broadcast();
        }),
        net.on('peer_left', () => {
          this.guestPresent = false;
          this.picks.guest = null;
          this.broadcast();
        }),
        net.on('relay', (d) => {
          if (d.k === 'hello') {
            this.guestPresent = true;
            this.broadcast();
          } else if (d.k === 'pick') {
            const c = d.c as CharId;
            if (this.picks.host !== c) this.picks.guest = c;
            this.broadcast();
          }
        }),
      );
    } else if (this.mode === 'guest') {
      this.offs.push(
        net.on('relay', (d) => {
          if (d.k === 'lobby') {
            this.picks = d.picks;
            this.refresh();
          } else if (d.k === 'start') {
            this.launch({ mode: 'guest', me: d.guest, code: this.code });
          }
        }),
        net.on('peer_left', () => this.backToMenu(t('err.host_left'))),
      );
      net.send({ k: 'hello' });
    }
    if (this.mode !== 'solo') {
      this.offs.push(net.on('disconnected', () => this.backToMenu(t('err.lost'))));
    }
    this.events.once('shutdown', () => this.offs.forEach((f) => f()));
    this.refresh();
  }

  private makeCard(c: CharId, x: number) {
    const y = 270;
    const card = this.add.rectangle(x, y, 340, 290, 0x181020, 0.82).setStrokeStyle(4, 0x505060);
    this.cards[c] = card;
    const sp = this.add.sprite(x - 90, y + 10, `char_${c}`).setScale(5).play(`char_${c}-idle`);
    if (c === 'romanian') sp.setFlipX(false);
    txt(this, x + 60, y - 110, t(`char.${c}.up`), 36, c === 'pole' ? '#ff5060' : '#ffd040', 6);
    this.add
      .text(x - 30, y - 70, t(`desc.${c}`), {
        fontFamily: 'Pixelify, monospace',
        fontSize: '15px',
        color: '#ffffff',
        lineSpacing: 6,
        wordWrap: { width: 190 },
      })
      .setOrigin(0, 0);
    this.tags[c] = txt(this, x, y + 120, '', 24, '#7dff7d', 5);
    card.setInteractive({ useHandCursor: true });
    card.on('pointerup', () => this.pick(c));
    sp.setInteractive({ useHandCursor: true }).on('pointerup', () => this.pick(c));
    // demonstracja ataku
    this.time.addEvent({
      delay: c === 'pole' ? 2000 : 2600,
      loop: true,
      callback: () => sp.play(`char_${c}-atk`).once('animationcomplete', () => sp.play(`char_${c}-idle`)),
    });
  }

  private mySide(): 'host' | 'guest' {
    return this.mode === 'guest' ? 'guest' : 'host';
  }

  private pick(c: CharId) {
    const other = this.mySide() === 'host' ? this.picks.guest : this.picks.host;
    if (other === c) {
      this.status.setColor('#ff6060').setText(t('lobby.taken'));
      return;
    }
    this.sound.play('click', { volume: 0.5 });
    if (this.mode === 'guest') {
      net.send({ k: 'pick', c });
      this.picks.guest = c;
      this.refresh();
    } else {
      this.picks.host = c;
      this.broadcast();
    }
  }

  private broadcast() {
    if (this.mode === 'host') net.send({ k: 'lobby', picks: this.picks });
    this.refresh();
  }

  private refresh() {
    const me = this.mySide();
    const mine = this.picks[me];
    const theirs = this.picks[me === 'host' ? 'guest' : 'host'];
    for (const c of ['pole', 'romanian'] as CharId[]) {
      const tag = c === mine ? t('lobby.you') : c === theirs ? t('lobby.mate') : '';
      this.tags[c].setText(tag).setColor(c === mine ? '#7dff7d' : '#80c0ff');
      this.cards[c].setStrokeStyle(4, c === mine ? 0x7dff7d : c === theirs ? 0x80c0ff : 0x505060);
    }
    let s = '';
    let canStart = false;
    if (this.mode === 'solo') {
      s = mine ? t('lobby.solo_ready') : t('lobby.solo_pick');
      canStart = !!mine;
    } else if (this.mode === 'host') {
      if (!this.guestPresent) s = t('lobby.waiting');
      else if (!this.picks.host || !this.picks.guest) s = t('lobby.mate_here');
      else s = t('lobby.ready');
      canStart = this.guestPresent && !!this.picks.host && !!this.picks.guest;
    } else {
      s = !mine ? t('lobby.guest_pick') : t('lobby.guest_wait');
    }
    this.status.setColor('#ffffff').setText(s);
    this.startBtn?.setEnabled(canStart);
  }

  private copyLink() {
    const link = `${location.origin}${location.pathname}?join=${this.code}`;
    const done = () => this.status.setColor('#7dff7d').setText(t('lobby.copied'));
    if (navigator.clipboard) navigator.clipboard.writeText(link).then(done, () => this.status.setText(link));
    else this.status.setText(link);
  }

  private startGame() {
    if (this.mode === 'solo') {
      if (this.picks.host) this.launch({ mode: 'solo', me: this.picks.host });
      return;
    }
    if (!this.picks.host || !this.picks.guest || !this.guestPresent) return;
    net.send({ k: 'start', host: this.picks.host, guest: this.picks.guest });
    this.launch({ mode: 'host', me: this.picks.host, code: this.code });
  }

  private launch(d: GameStartData) {
    this.scene.start('Game', d);
  }

  private backToMenu(error?: string) {
    if (this.mode !== 'solo') net.leave();
    this.scene.start('Menu', { error });
  }
}
