import Phaser from 'phaser';
import {
  AnimName,
  CharId,
  ITEM_POS,
  LEVELS,
  LEVEL_W,
  PLAYER_SPEED,
  PLAYER_START,
  VIEW_H,
  VIEW_W,
  WALK_BOTTOM,
  WALK_TOP,
  WORLD_W,
  ZOOM,
  gateMinX,
} from '../game/constants';
import { Sim } from '../game/Sim';
import {
  GameEvent,
  GameStartData,
  NF_ALERT,
  NF_KO,
  NF_LOOTED,
  NF_RAGE,
  NF_ROBBED,
  NF_WARN,
  PlayerInput,
  Snapshot,
  Stats,
} from '../game/types';
import { controls } from '../game/Controls';
import { net } from '../net/Net';
import { playMusic } from '../audio';
import { FONT } from '../ui';

const NET_RATE = 1 / 20;

/** Widok postaci (sprite + cień + ikonki). */
class CharView {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  icon: Phaser.GameObjects.Image;
  stars: Phaser.GameObjects.Sprite;
  anger: Phaser.GameObjects.Image;
  steam: Phaser.GameObjects.Sprite;
  label?: Phaser.GameObjects.Text;
  anim: AnimName | '' = '';
  tx = 0;
  ty = 0;
  x = 0;
  y = 0;
  seen = true;

  constructor(
    private scene: Phaser.Scene,
    readonly tex: string,
    x: number,
    y: number,
  ) {
    this.x = this.tx = x;
    this.y = this.ty = y;
    this.shadow = scene.add.image(x, y, 'shadow').setDepth(1);
    this.sprite = scene.add.sprite(x, y, tex).setOrigin(0.5, 38 / 40);
    this.icon = scene.add.image(x, y - 44, 'icon_q').setVisible(false).setDepth(9000);
    this.stars = scene.add.sprite(x, y - 30, 'fx_stars').play('fx_stars').setVisible(false).setDepth(9000);
    this.anger = scene.add.image(x, y, 'fx_anger').setVisible(false).setDepth(9001);
    this.steam = scene.add.sprite(x, y, 'fx_steam').play('fx_steam').setVisible(false).setDepth(9001);
    this.setAnim('idle');
  }

  setAnim(a: AnimName) {
    if (a === this.anim) return;
    this.anim = a;
    this.sprite.play(`${this.tex}-${a}`);
  }

  setLabel(s: string, color: string) {
    this.label = this.scene.add
      .text(0, 0, s, { fontFamily: FONT, fontSize: '14px', color, stroke: '#181020', strokeThickness: 4 })
      .setOrigin(0.5)
      .setScale(0.5)
      .setDepth(9002);
  }

  place(face: number, down: boolean) {
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    this.sprite.setPosition(x, y).setFlipX(face < 0).setDepth(y + (down ? -20 : 0));
    this.shadow.setPosition(x, y);
    this.icon.setPosition(x + 2, y - 44);
    this.stars.setPosition(x, y - 14);
    this.anger.setPosition(x + 6 * face, y - 36);
    this.steam.setPosition(x - 8 * face, y - 38);
    this.label?.setPosition(x, y - 48);
  }

  setVisible(v: boolean) {
    this.sprite.setVisible(v);
    this.shadow.setVisible(v);
    if (!v) {
      this.icon.setVisible(false);
      this.stars.setVisible(false);
      this.anger.setVisible(false);
      this.steam.setVisible(false);
    }
    this.label?.setVisible(v);
  }

  destroy() {
    [this.sprite, this.shadow, this.icon, this.stars, this.anger, this.steam, this.label].forEach((o) => o?.destroy());
  }
}

export class GameScene extends Phaser.Scene {
  data0!: GameStartData;
  me: CharId = 'pole';
  other: CharId = 'romanian';
  sim: Sim | null = null;
  snap: Snapshot | null = null;

  // lokalny gracz
  private px = 0;
  private py = 0;
  private face: 1 | -1 = -1;
  private atkSeq = 0;
  private atkT = 0;
  private hurtT = 0;
  private knock = 0;
  private stepT = 0;

  private views: Record<CharId, CharView> = {} as never;
  private npcViews = new Map<number, CharView>();
  private gnome!: Phaser.GameObjects.Image;
  private bike!: Phaser.GameObjects.Sprite;
  private car!: Phaser.GameObjects.Sprite;
  private far: Phaser.GameObjects.TileSprite[] = [];
  private progG!: Phaser.GameObjects.Graphics;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  private remoteInput: PlayerInput | null = null;
  private netT = 0;
  private pendingEv: GameEvent[] = [];
  private offs: (() => void)[] = [];
  private ended = false;
  private startTime = 0;
  stage = 0;
  levelSeen = 0;

  constructor() {
    super('Game');
  }

  create(data: GameStartData) {
    this.data0 = data;
    this.me = data.me;
    this.other = data.me === 'pole' ? 'romanian' : 'pole';
    this.snap = null;
    this.sim = null;
    this.ended = false;
    this.atkSeq = 0;
    this.atkT = this.hurtT = this.knock = 0;
    this.remoteInput = null;
    this.pendingEv = [];
    this.offs = [];
    this.npcViews = new Map();
    this.stage = 0;
    this.levelSeen = -1;
    this.startTime = this.time.now;
    controls.touchAtk = controls.touchAct = false;
    controls.touchX = controls.touchY = 0;

    const solo = data.mode === 'solo';
    if (data.mode !== 'guest') {
      this.sim = new Sim({ pole: solo ? this.me === 'pole' : true, romanian: solo ? this.me === 'romanian' : true }, solo);
    }

    // świat
    const cam = this.cameras.main;
    cam.setZoom(ZOOM);
    cam.setBounds(0, 0, WORLD_W, VIEW_H);
    cam.setRoundPixels(true);
    this.far = [1, 2, 3].map((i) => this.add.tileSprite(0, 0, VIEW_W, VIEW_H, `bg_far${i}`).setOrigin(0).setDepth(-100 + i));
    LEVELS.forEach((lv, i) => this.add.image(lv.x0, 0, `bg_level${i + 1}`).setOrigin(0).setDepth(-50));

    // przedmioty
    this.gnome = this.add.image(ITEM_POS.gnome.x, ITEM_POS.gnome.y, 'gnome').setOrigin(0.5, 1).setDepth(ITEM_POS.gnome.y);
    this.bike = this.add.sprite(ITEM_POS.bike.x, ITEM_POS.bike.y, 'bike', 0).setOrigin(0.5, 1).setDepth(ITEM_POS.bike.y);
    this.car = this.add.sprite(ITEM_POS.car.x, ITEM_POS.car.y, 'car', 0).setOrigin(0.5, 1).setDepth(ITEM_POS.car.y);
    this.add.image(ITEM_POS.car.x, ITEM_POS.car.y, 'shadow').setScale(5, 2).setDepth(2).setName('carShadow');

    // gracze
    for (const c of ['pole', 'romanian'] as CharId[]) {
      const v = new CharView(this, `char_${c}`, PLAYER_START[c].x, PLAYER_START[c].y);
      v.setLabel(c === this.me ? 'TY' : c === 'pole' ? 'POLAK' : 'RUMUN', c === this.me ? '#7dff7d' : '#80c0ff');
      this.views[c] = v;
    }
    if (solo) this.views[this.other].setVisible(false);
    this.px = PLAYER_START[this.me].x;
    this.py = PLAYER_START[this.me].y;
    this.face = -1;

    this.progG = this.add.graphics().setDepth(9500);

    cam.centerOn(this.px - 120, VIEW_H / 2);

    // klawiatura
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,J,K,E,SPACE,Z,X,ESC') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');

    // sieć
    if (data.mode === 'host') {
      this.offs.push(
        net.on('relay', (d) => {
          if (d.k === 'in') this.remoteInput = d.i;
        }),
        net.on('peer_left', () => this.abort('Kumpel się rozłączył.')),
        net.on('disconnected', () => this.abort('Utracono połączenie z serwerem.')),
      );
    } else if (data.mode === 'guest') {
      this.offs.push(
        net.on('relay', (d) => {
          if (d.k === 'snap') this.onSnap(d.s as Snapshot);
          else if (d.k === 'again') this.scene.start('Lobby', { mode: 'guest', code: this.data0.code });
        }),
        net.on('peer_left', () => this.abort('Host się rozłączył.')),
        net.on('disconnected', () => this.abort('Utracono połączenie z serwerem.')),
      );
    }
    this.events.once('shutdown', () => {
      this.offs.forEach((f) => f());
      this.scene.stop('UI');
    });

    playMusic(this, 'music_game', 0.28);
    this.scene.launch('UI', { game: this });
  }

  private abort(msg: string) {
    if (this.ended) return;
    this.ended = true;
    net.leave();
    this.scene.stop('UI');
    this.scene.start('Menu', { error: msg });
  }

  // ---------------------------------------------------------------------------
  private localInput(dt: number): PlayerInput {
    const k = this.keys;
    let mx = 0;
    let my = 0;
    if (k.A.isDown || k.LEFT.isDown) mx -= 1;
    if (k.D.isDown || k.RIGHT.isDown) mx += 1;
    if (k.W.isDown || k.UP.isDown) my -= 1;
    if (k.S.isDown || k.DOWN.isDown) my += 1;
    if (controls.touchX || controls.touchY) {
      mx = controls.touchX;
      my = controls.touchY;
    }
    const atkPressed =
      Phaser.Input.Keyboard.JustDown(k.J) || Phaser.Input.Keyboard.JustDown(k.SPACE) || Phaser.Input.Keyboard.JustDown(k.Z) || controls.touchAtk;
    controls.touchAtk = false;
    const actHeld = k.K.isDown || k.E.isDown || k.X.isDown || controls.touchAct;

    const ps = this.snap?.p[this.me];
    const down = !!ps?.down;
    const inCar = !!ps?.inCar;

    this.atkT = Math.max(0, this.atkT - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    let anim: AnimName = 'idle';

    if (down || inCar) {
      anim = 'down';
    } else if (this.hurtT > 0) {
      anim = 'hurt';
    } else {
      if (atkPressed && this.atkT <= 0) {
        this.atkSeq++;
        this.atkT = this.me === 'pole' ? 0.34 : 0.26;
      }
      if (this.atkT > 0) {
        anim = 'atk';
      } else if (actHeld && !(mx || my)) {
        anim = 'act';
      } else if (mx || my) {
        const len = Math.hypot(mx, my) || 1;
        const sp = PLAYER_SPEED * dt;
        this.px += (mx / len) * sp * Math.min(1, Math.hypot(mx, my));
        this.py += (my / len) * sp * 0.72 * Math.min(1, Math.hypot(mx, my));
        if (Math.abs(mx) > 0.2) this.face = mx > 0 ? 1 : -1;
        anim = 'walk';
        this.stepT += dt;
        if (this.stepT > 0.18) {
          this.stepT = 0;
          if (Math.random() < 0.35) this.spawnDust(this.px - this.face * 6, this.py);
        }
      }
    }
    if (this.knock) {
      this.px += this.knock * dt * 10;
      this.knock *= Math.pow(0.001, dt);
      if (Math.abs(this.knock) < 0.5) this.knock = 0;
    }
    const stage = this.snap?.stage ?? 0;
    this.px = Phaser.Math.Clamp(this.px, gateMinX(stage), WORLD_W - 8);
    this.py = Phaser.Math.Clamp(this.py, WALK_TOP, WALK_BOTTOM);

    return {
      x: Math.round(this.px * 10) / 10,
      y: Math.round(this.py * 10) / 10,
      face: this.face,
      anim,
      atk: this.atkSeq,
      act: actHeld && anim === 'act',
    };
  }

  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    if (this.keys.ESC && Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
      if (this.data0.mode !== 'solo') net.leave();
      this.scene.start('Menu');
      return;
    }
    const input = this.localInput(dt);

    if (this.sim) {
      const inputs: Partial<Record<CharId, PlayerInput>> = { [this.me]: input };
      if (this.remoteInput) inputs[this.other] = this.remoteInput;
      const s = this.sim.update(dt, inputs);
      this.pendingEv.push(...s.ev);
      this.onSnap(s);
      if (this.data0.mode === 'host') {
        this.netT += dt;
        if (this.netT >= NET_RATE) {
          this.netT = 0;
          net.send({ k: 'snap', s: { ...s, ev: this.pendingEv } });
          this.pendingEv = [];
        }
      }
    } else {
      this.netT += dt;
      if (this.netT >= NET_RATE) {
        this.netT = 0;
        net.send({ k: 'in', i: input });
      }
    }

    this.render(dt, input);
  }

  // ---------------------------------------------------------------------------
  private onSnap(s: Snapshot) {
    const prevStage = this.snap?.stage ?? 0;
    this.snap = s;
    for (const e of s.ev) this.handleEvent(e);
    if (s.stage !== prevStage) this.stage = s.stage;
  }

  private handleEvent(e: GameEvent) {
    switch (e.e) {
      case 'sfx':
        this.sound.play(e.k, { volume: e.k === 'siren' ? 0.35 : e.k === 'pick' ? 0.25 : 0.5 });
        break;
      case 'fx':
        if (e.k === 'hit') {
          this.add.sprite(e.x, e.y, 'fx_hit').setDepth(9800).play('fx_hit').once('animationcomplete', (_a: unknown, _f: unknown, sp: Phaser.GameObjects.Sprite) => sp.destroy());
          this.cameras.main.shake(80, 0.004);
        } else if (e.k === 'coin') {
          for (let i = 0; i < 5; i++) {
            const c = this.add.image(e.x, e.y, 'coin').setDepth(9800);
            this.tweens.add({
              targets: c,
              x: e.x + Phaser.Math.Between(-18, 18),
              y: e.y - Phaser.Math.Between(10, 26),
              alpha: 0,
              duration: 600,
              ease: 'Quad.out',
              onComplete: () => c.destroy(),
            });
          }
        }
        break;
      case 'txt':
        this.floatText(e.s, e.x, e.y, e.c);
        break;
      case 'hurt':
        if (e.who === this.me) {
          this.knock = e.dx;
          this.hurtT = 0.3;
          this.cameras.main.shake(150, 0.008);
          this.cameras.main.flash(80, 255, 60, 60);
        }
        break;
      case 'msg':
        if (!e.who || e.who === this.me) this.events.emit('toast', e.s);
        break;
      case 'stage':
        this.events.emit('stage', e.stage);
        break;
      case 'end':
        this.finish(e.win, e.reason);
        break;
    }
  }

  private finish(win: boolean, reason: string) {
    if (this.ended) return;
    this.ended = true;
    const s = this.snap!;
    const stats: Stats = {
      win,
      reason,
      money: s.money,
      kos: s.kos,
      steals: s.steals,
      time: Math.round((this.time.now - this.startTime) / 1000),
    };
    // dośle ostatnie zdarzenia gościowi
    if (this.data0.mode === 'host') {
      const last = this.sim!.snapshot();
      net.send({ k: 'snap', s: { ...last, ev: [...this.pendingEv, ...last.ev] } });
      this.pendingEv = [];
    }
    this.time.delayedCall(win ? 600 : 1800, () => {
      this.scene.stop('UI');
      this.scene.start('End', { stats, mode: this.data0.mode, code: this.data0.code, me: this.me });
    });
  }

  floatText(s: string, x: number, y: number, color: string) {
    const t = this.add
      .text(x, y, s, { fontFamily: FONT, fontSize: '18px', color, stroke: '#181020', strokeThickness: 5 })
      .setOrigin(0.5)
      .setScale(0.5)
      .setDepth(9900);
    this.tweens.add({ targets: t, y: y - 18, alpha: { from: 1, to: 0 }, duration: 1100, ease: 'Quad.out', onComplete: () => t.destroy() });
  }

  private spawnDust(x: number, y: number) {
    const d = this.add.image(x, y - 1, 'dust').setDepth(2).setAlpha(0.8);
    this.tweens.add({ targets: d, y: y - 5, alpha: 0, scale: 1.6, duration: 380, onComplete: () => d.destroy() });
  }

  // ---------------------------------------------------------------------------
  private render(dt: number, input: PlayerInput) {
    const s = this.snap;
    const lerp = Math.min(1, dt * 14);
    const cam = this.cameras.main;

    // gracze
    for (const c of ['pole', 'romanian'] as CharId[]) {
      const v = this.views[c];
      const ps = s?.p[c];
      if (s && ps && !ps.present) {
        v.setVisible(false);
        continue;
      }
      if (ps?.inCar) {
        v.setVisible(false);
        continue;
      }
      v.setVisible(true);
      if (c === this.me) {
        v.x = this.px;
        v.y = this.py;
        v.setAnim(ps?.down ? 'down' : input.anim);
        v.place(this.face, !!ps?.down);
        // mruganie przy nietykalności
        v.sprite.setAlpha(this.hurtT > 0 ? 0.6 : 1);
      } else if (ps) {
        if (Math.abs(ps.x - v.x) > 80) v.x = ps.x;
        v.x += (ps.x - v.x) * lerp;
        v.y += (ps.y - v.y) * lerp;
        v.setAnim(ps.anim);
        v.place(ps.face, ps.down);
      }
      v.stars.setVisible(!!ps?.down);
    }

    // NPC
    if (s) {
      const alive = new Set<number>();
      for (const [id, kind, x, y, face, anim, f] of s.n) {
        alive.add(id);
        let v = this.npcViews.get(id);
        if (!v) {
          v = new CharView(this, `char_${kind}`, x, y);
          this.npcViews.set(id, v);
        }
        if (Math.abs(x - v.x) > 80) v.x = x;
        v.x += (x - v.x) * lerp;
        v.y += (y - v.y) * lerp;
        v.setAnim(anim);
        v.place(face, !!(f & NF_KO));
        const rage = !!(f & NF_RAGE);
        if (rage) v.sprite.setTint(0xff7070);
        else if ((f & NF_ROBBED) && !(f & NF_KO)) v.sprite.setTint(0xd8d8ff);
        else v.sprite.clearTint();
        v.anger.setVisible(rage);
        v.steam.setVisible(rage);
        v.stars.setVisible(!!(f & NF_KO));
        if (f & NF_KO) v.stars.setAlpha(f & NF_LOOTED ? 0.5 : 1);
        const warn = !!(f & NF_WARN);
        const alert = !!(f & NF_ALERT) && !rage;
        v.icon.setVisible(warn || alert);
        if (warn || alert) {
          v.icon.setTexture(alert ? 'icon_alert' : 'icon_q');
          v.icon.y += Math.sin(this.time.now / 80) * 1.5;
        }
      }
      for (const [id, v] of this.npcViews) {
        if (!alive.has(id)) {
          v.destroy();
          this.npcViews.delete(id);
        }
      }

      // przedmioty
      this.gnome.setVisible(!s.o.gnome);
      this.bike.setVisible(!s.o.bike).setFrame(s.o.lockHp > 0 ? 0 : 1);
      this.car.x = s.o.carX;
      this.car.setFrame(s.o.carUnlocked ? 1 : 0);
      const cs = this.children.getByName('carShadow') as Phaser.GameObjects.Image;
      cs.x = s.o.carX;
      if (s.o.carGone && Math.random() < 0.5) this.spawnDust(this.car.x - 52, this.car.y - 2);

      // paski postępu akcji
      this.progG.clear();
      for (const c of ['pole', 'romanian'] as CharId[]) {
        const ps = s.p[c];
        if (!ps.present || ps.prog <= 0 || ps.inCar) continue;
        const v = this.views[c];
        const bx = Math.round(v.x) - 12;
        const by = Math.round(v.y) - 52;
        this.progG.fillStyle(0x181020, 1).fillRect(bx - 1, by - 1, 26, 5);
        this.progG.fillStyle(ps.kind === 'revive' ? 0x7dff7d : 0xf2c230, 1).fillRect(bx, by, Math.round(24 * Math.min(1, ps.prog)), 3);
      }
    }

    // kamera: podąża za graczem (albo autem)
    let fx = this.px;
    if (s?.p[this.me].inCar) fx = this.car.x;
    const lead = this.face * 40;
    const curMid = Phaser.Math.Clamp(cam.midPoint.x, VIEW_W / 2, WORLD_W - VIEW_W / 2);
    const nx = curMid + (fx + lead - curMid) * Math.min(1, dt * 4);
    cam.centerOn(nx, VIEW_H / 2);

    // paralaksa i przenikanie teł
    const view = cam.worldView;
    const mid = view.x + VIEW_W / 2;
    this.far.forEach((f, i) => {
      f.setPosition(view.x, 0);
      f.tilePositionX = view.x * 0.25;
      const lv = LEVELS[i];
      const center = (lv.x0 + lv.x1) / 2;
      const a = Phaser.Math.Clamp(1.5 - Math.abs(mid - center) / (LEVEL_W / 2), 0, 1);
      f.setAlpha(i === 0 ? 1 : a);
    });

    // baner poziomu
    const lvl = LEVELS.findIndex((l) => this.px >= l.x0 && this.px < l.x1);
    if (lvl >= 0 && lvl > this.levelSeen) {
      this.levelSeen = lvl;
      this.events.emit('level', lvl);
    }
  }

  /** Podpowiedź dla lokalnego gracza — co zrobi AKCJA w tym miejscu. */
  actionHint(): string {
    const s = this.snap;
    if (!s) return '';
    const me = s.p[this.me];
    if (me.down) return 'Leżysz! Kumpel musi cię podnieść';
    if (me.inCar) return 'Siedzisz w aucie...';
    const near = (x: number, y: number, rx: number, ry: number) => Math.abs(this.px - x) < rx && Math.abs(this.py - y) < ry;
    const o = s.p[this.other];
    if (o.present && o.down && near(o.x, o.y, 28, 16)) return 'AKCJA: podnieś kumpla';
    if (s.stage === 0 && !s.o.gnome && near(ITEM_POS.gnome.x, ITEM_POS.gnome.y, 22, 18)) return 'AKCJA: zwiń krasnala (gdy nikt nie patrzy!)';
    if (s.stage === 1 && !s.o.bike && near(ITEM_POS.bike.x, ITEM_POS.bike.y, 26, 20)) {
      if (s.o.lockHp > 0) return this.me === 'romanian' ? 'AKCJA: otwórz kłódkę wytrychem' : 'BIJ: rozwal kłódkę pałką!';
      return 'AKCJA: bierz rower';
    }
    if (s.stage === 2 && !s.o.carGone && near(s.o.carX, ITEM_POS.car.y, 56, 22)) {
      if (!s.o.carUnlocked) return this.me === 'romanian' || !o.present ? 'AKCJA: otwórz auto (Polak na czatach!)' : 'Stój na czatach — Rumun otwiera auto';
      return 'AKCJA: wsiadaj do auta';
    }
    for (const [, , x, y, face, , f] of s.n) {
      if (!near(x, y, 36, 14)) continue;
      if (f & NF_KO) return f & NF_LOOTED ? '' : 'AKCJA: przeszukaj kieszenie';
      if (this.me === 'romanian' && !(f & (NF_ROBBED | NF_RAGE))) {
        return face * (this.px - x) < 0 ? 'AKCJA: okradnij (od tyłu!)' : 'Patrzy na ciebie — zajdź od tyłu';
      }
    }
    return '';
  }

  /** Indeks poziomu, na którym stoi lokalny gracz. */
  playerLevel(): number {
    return LEVELS.findIndex((l) => this.px >= l.x0 && this.px < l.x1);
  }
}
