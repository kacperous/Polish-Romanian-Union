import Phaser from 'phaser';
import { t } from '../i18n';
import type { GameScene } from './GameScene';
import { CharId } from '../game/constants';
import { controls, isTouchDevice } from '../game/Controls';
import { FONT, txt } from '../ui';

/** HUD + sterowanie dotykowe (osobna scena w rozdzielczości ekranu). */
export class UIScene extends Phaser.Scene {
  private game_!: GameScene;
  private hp: Record<CharId, Phaser.GameObjects.Graphics> = {} as never;
  private panels: Record<CharId, Phaser.GameObjects.Container> = {} as never;
  private money!: Phaser.GameObjects.Text;
  private items: Phaser.GameObjects.Image[] = [];
  private checks: Phaser.GameObjects.Text[] = [];
  private alarmG!: Phaser.GameObjects.Graphics;
  private alarmT!: Phaser.GameObjects.Text;
  private toastT!: Phaser.GameObjects.Text;
  private toastTimer?: Phaser.Time.TimerEvent;
  private hintT!: Phaser.GameObjects.Text;
  private arrow!: Phaser.GameObjects.Container;
  private lastMoney = 0;

  // joystick
  private joyBase!: Phaser.GameObjects.Arc;
  private joyKnob!: Phaser.GameObjects.Arc;
  private joyId = -1;
  private joyCx = 0;
  private joyCy = 0;
  private actId = -1;

  constructor() {
    super('UI');
  }

  create(data: { game: GameScene }) {
    this.game_ = data.game;
    this.items = [];
    this.checks = [];
    this.joyId = this.actId = -1;
    this.lastMoney = 0;

    // panele graczy
    const order: CharId[] = [this.game_.me, this.game_.other];
    order.forEach((c, i) => {
      const x = 12 + i * 214;
      const cont = this.add.container(x, 10);
      const bg = this.add.rectangle(0, 0, 204, 58, 0x181020, 0.75).setOrigin(0).setStrokeStyle(3, i === 0 ? 0x7dff7d : 0x80c0ff);
      const face = this.add.sprite(30, 30, `char_${c}`, 0).setScale(1.6).setCrop(8, 4, 24, 24);
      const name = this.add.text(56, 6, `${t(`char.${c}`)}${i === 0 ? ` (${t('you')})` : ''}`, { fontFamily: FONT, fontSize: '18px', color: '#ffffff' });
      const g = this.add.graphics();
      cont.add([bg, face, name, g]);
      g.setPosition(56, 32);
      this.hp[c] = g;
      this.panels[c] = cont;
    });

    // pieniądze + lista łupów
    this.money = txt(this, 560, 26, '0 €', 30, '#ffe040', 6).setOrigin(0, 0.5);
    const loot: [string, number][] = [
      ['gnome', 2.2],
      ['bike', 1.2],
      ['car', 0.5],
    ];
    loot.forEach(([k, sc], i) => {
      const x = 590 + i * 58;
      this.add.rectangle(x, 62, 52, 34, 0x181020, 0.7).setStrokeStyle(2, 0x505060);
      const img = this.add.image(x, 62, k, 0).setScale(sc).setAlpha(0.35);
      if (k === 'car') img.setCrop(0, 0, 104, 46);
      this.items.push(img);
      this.checks.push(txt(this, x + 18, 72, '', 20, '#7dff7d', 4));
    });

    // alarm
    txt(this, 860, 18, 'POLIZEI', 18, '#80c0ff', 4);
    this.alarmG = this.add.graphics();
    this.alarmT = txt(this, 860, 44, '', 14, '#ffffff', 3);

    this.toastT = txt(this, 480, 128, '', 24, '#ffffff', 6).setWordWrapWidth(760).setAlpha(0);
    this.hintT = txt(this, 480, 470, '', 20, '#ffe08a', 5);

    // strzałka "DALEJ"
    const arrImg = this.add.image(0, 0, 'arrow').setScale(3);
    const arrT = txt(this, 0, 40, t('hud.next'), 22, '#ffe040', 5);
    this.arrow = this.add.container(70, 270, [arrImg, arrT]).setVisible(false);
    this.tweens.add({ targets: this.arrow, x: 50, duration: 400, yoyo: true, repeat: -1 });

    this.game_.events.on('toast', this.toast, this);
    this.game_.events.on('level', this.levelBanner, this);
    this.game_.events.on('stage', () => this.sound.play('pickup', { volume: 0.3 }), this);
    this.events.once('shutdown', () => {
      this.game_.events.off('toast', this.toast, this);
      this.game_.events.off('level', this.levelBanner, this);
      this.game_.events.off('stage');
      controls.touchX = controls.touchY = 0;
      controls.touchAct = controls.touchAtk = controls.touchJump = false;
    });

    if (isTouchDevice()) this.createTouch();
    else txt(this, 480, 525, t('hud.keys'), 14, '#c0c0c0', 3);

    if (this.game_.data0.mode === 'solo') {
      this.panels[this.game_.other].setVisible(false);
    }
  }

  private toast(s: string) {
    this.toastT.setText(s).setAlpha(1).setScale(1.15);
    this.tweens.add({ targets: this.toastT, scale: 1, duration: 200 });
    this.toastTimer?.remove();
    this.toastTimer = this.time.delayedCall(3200, () => this.tweens.add({ targets: this.toastT, alpha: 0, duration: 400 }));
  }

  private levelBanner(i: number) {
    const band = this.add.rectangle(480, 250, 960, 110, 0x181020, 0.75);
    const t1 = txt(this, 480, 232, t(`lvl.${i}.name`).toUpperCase(), 38, '#ffffff', 7);
    const t2 = txt(this, 480, 278, t('hud.goal', { g: `lvl.${i}.sub` }), 22, '#ffe040', 5);
    const all = [band, t1, t2];
    all.forEach((o) => o.setAlpha(0));
    this.tweens.add({ targets: all, alpha: 1, duration: 300 });
    this.time.delayedCall(2600, () => this.tweens.add({ targets: all, alpha: 0, duration: 500, onComplete: () => all.forEach((o) => o.destroy()) }));
  }

  // ---------------------------------------------------------------------------
  private createTouch() {
    this.input.addPointer(3);
    // joystick
    this.joyBase = this.add.circle(150, 420, 66, 0xffffff, 0.12).setStrokeStyle(4, 0xffffff, 0.35).setDepth(100);
    this.joyKnob = this.add.circle(150, 420, 30, 0xffffff, 0.4).setStrokeStyle(3, 0x181020, 0.6).setDepth(101);
    const zone = this.add.zone(0, 140, 480, 400).setOrigin(0).setInteractive();
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.joyId !== -1) return;
      this.joyId = p.id;
      this.joyCx = Phaser.Math.Clamp(p.x, 80, 400);
      this.joyCy = Phaser.Math.Clamp(p.y, 200, 470);
      this.joyBase.setPosition(this.joyCx, this.joyCy);
      this.moveJoy(p);
    });

    // przyciski
    const mkBtn = (x: number, y: number, r: number, label: string, color: number) => {
      const c = this.add.circle(x, y, r, color, 0.55).setStrokeStyle(5, 0xffffff, 0.7).setDepth(100);
      txt(this, x, y, label, r > 50 ? 26 : 20, '#ffffff', 5).setDepth(101);
      c.setInteractive();
      return c;
    };
    const atk = mkBtn(866, 430, 62, t('btn.atk'), 0xd8263a);
    const act = mkBtn(742, 482, 50, t('btn.act'), 0x1f3f98);
    const jump = mkBtn(876, 300, 44, t('btn.jump'), 0x3e8e48);
    jump.on('pointerdown', () => {
      controls.touchJump = true;
      jump.setScale(0.9);
    });
    jump.on('pointerup', () => jump.setScale(1));
    jump.on('pointerout', () => jump.setScale(1));
    atk.on('pointerdown', () => {
      controls.touchAtk = true;
      atk.setScale(0.9);
    });
    atk.on('pointerup', () => atk.setScale(1));
    atk.on('pointerout', () => atk.setScale(1));
    act.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.actId = p.id;
      controls.touchAct = true;
      act.setScale(0.9);
    });
    const actUp = (p: Phaser.Input.Pointer) => {
      if (p.id !== this.actId) return;
      this.actId = -1;
      controls.touchAct = false;
      act.setScale(1);
    };
    act.on('pointerup', actUp);
    act.on('pointerout', actUp);

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id === this.joyId) this.moveJoy(p);
    });
    const up = (p: Phaser.Input.Pointer) => {
      if (p.id === this.joyId) {
        this.joyId = -1;
        controls.touchX = controls.touchY = 0;
        this.joyKnob.setPosition(this.joyBase.x, this.joyBase.y);
      }
      if (p.id === this.actId) actUp(p);
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);

    // pełny ekran
    const fs = txt(this, 920, 92, '⛶', 30, '#ffffff', 4).setInteractive();
    fs.on('pointerup', () => {
      if (this.scale.isFullscreen) this.scale.stopFullscreen();
      else this.scale.startFullscreen();
    });
  }

  private moveJoy(p: Phaser.Input.Pointer) {
    const dx = p.x - this.joyCx;
    const dy = p.y - this.joyCy;
    const len = Math.hypot(dx, dy);
    const max = 58;
    const k = len > max ? max / len : 1;
    this.joyKnob.setPosition(this.joyCx + dx * k, this.joyCy + dy * k);
    let nx = (dx * k) / max;
    let ny = (dy * k) / max;
    if (Math.hypot(nx, ny) < 0.22) nx = ny = 0;
    controls.touchX = nx;
    controls.touchY = ny;
  }

  // ---------------------------------------------------------------------------
  update() {
    const s = this.game_.snap;
    if (!s) return;
    for (const c of ['pole', 'romanian'] as CharId[]) {
      const g = this.hp[c];
      const p = s.p[c];
      g.clear();
      // 1 kratka = 10 pkt życia; przy dużej Wytrzymałości kratki się zwężają
      const cells = Math.max(1, Math.ceil(p.mhp / 10));
      const cw = Math.min(11, Math.floor(144 / cells));
      const low = p.hp <= p.mhp * 0.25;
      for (let i = 0; i < cells; i++) {
        const fill = Phaser.Math.Clamp((p.hp - i * 10) / 10, 0, 1);
        g.fillStyle(0x181020, 1).fillRect(i * cw, 0, cw - 1, 14);
        g.fillStyle(0x404050, 1).fillRect(i * cw + 1, 1, Math.max(1, cw - 3), 12);
        if (fill > 0) g.fillStyle(low ? 0xff4040 : 0x7dff7d, 1).fillRect(i * cw + 1, 1, Math.max(1, Math.round((cw - 3) * fill)), 12);
      }
      this.panels[c].setAlpha(p.down ? 0.55 : 1);
    }
    if (s.money !== this.lastMoney) {
      this.lastMoney = s.money;
      this.money.setText(`${s.money} €`);
      this.tweens.add({ targets: this.money, scale: { from: 1.3, to: 1 }, duration: 250 });
    }
    const done = [s.o.gnome, s.o.bike, s.o.carGone];
    done.forEach((d, i) => {
      this.items[i].setAlpha(d ? 1 : 0.35);
      this.checks[i].setText(d ? '✔' : '');
    });

    // alarm
    const a = s.alarm / 100;
    const g = this.alarmG;
    g.clear();
    g.fillStyle(0x181020, 0.85).fillRect(770, 32, 180, 24);
    const blink = a > 0.75 && Math.floor(this.time.now / 200) % 2 === 0;
    g.fillStyle(blink ? 0xffffff : a > 0.75 ? 0xff3030 : a > 0.4 ? 0xffa030 : 0x60a0ff, 1).fillRect(773, 35, Math.round(174 * a), 18);
    this.alarmT.setText(a > 0.75 ? t('hud.alarm') : '');

    this.hintT.setText(this.game_.actionHint());

    const lvl = this.game_.playerLevel();
    this.arrow.setVisible(lvl >= 0 && s.stage > lvl && !s.o.carGone);
  }
}
