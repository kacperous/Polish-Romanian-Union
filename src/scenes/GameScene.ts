import Phaser from 'phaser';
import { t } from '../i18n';
import {
  AnimName,
  CharId,
  GRAVITY,
  HOLD_MULT,
  JUMP_V,
  RUN_MULT,
  ITEM_POS,
  LEVELS,
  LEVEL_W,
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
import { PROLOG } from '../game/data/areas';
import { ITEMS } from '../game/data/items';
import { attackCooldown, baseStats, moveSpeed, statsFromArray } from '../game/stats';
import {
  AtkKind,
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
  z = 0;
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

  place(face: number, down: boolean, z = 0) {
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    const sy = y - Math.round(z);
    this.sprite.setPosition(x, sy).setFlipX(face < 0).setDepth(y + (down && z <= 0 ? -20 : 0) + (z > 0 ? 0.5 : 0));
    this.shadow.setPosition(x, y).setScale(z > 0 ? Math.max(0.5, 1 - z / 80) : 1);
    this.icon.setPosition(x + 2, sy - 44);
    this.stars.setPosition(x, sy - 14);
    this.anger.setPosition(x + 6 * face, sy - 36);
    this.steam.setPosition(x - 8 * face, sy - 38);
    this.label?.setPosition(x, sy - 48);
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
  private z = 0;
  private vz = 0;
  private kdT = 0;
  private ak: AtkKind = 'n';
  private running = false;
  private lastTapDir = 0;
  private lastTapT = 0;
  private fullStickT = 0;

  private views: Record<CharId, CharView> = {} as never;
  private itemViews = new Map<number, { img: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Image; spin: number }>();
  private coinViews = new Map<number, Phaser.GameObjects.Image>();
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
    this.atkT = this.hurtT = this.knock = this.kdT = 0;
    this.z = this.vz = 0;
    this.running = false;
    this.ak = 'n';
    this.remoteInput = null;
    this.pendingEv = [];
    this.offs = [];
    this.npcViews = new Map();
    this.itemViews = new Map();
    this.coinViews = new Map();
    this.stage = 0;
    this.levelSeen = -1;
    this.startTime = this.time.now;
    controls.touchAtk = controls.touchAct = controls.touchJump = false;
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
    this.far = PROLOG.far.map((k, i) => this.add.tileSprite(0, 0, VIEW_W, VIEW_H, k).setOrigin(0).setDepth(-99 + i));
    PROLOG.bgs.forEach((b) => this.add.image(b.x, 0, b.key).setOrigin(0).setDepth(-50));

    // przedmioty
    this.gnome = this.add.image(ITEM_POS.gnome.x, ITEM_POS.gnome.y, 'gnome').setOrigin(0.5, 1).setDepth(ITEM_POS.gnome.y);
    this.bike = this.add.sprite(ITEM_POS.bike.x, ITEM_POS.bike.y, 'bike', 0).setOrigin(0.5, 1).setDepth(ITEM_POS.bike.y);
    this.car = this.add.sprite(ITEM_POS.car.x, ITEM_POS.car.y, 'car', 0).setOrigin(0.5, 1).setDepth(ITEM_POS.car.y);
    this.add.image(ITEM_POS.car.x, ITEM_POS.car.y, 'shadow').setScale(5, 2).setDepth(2).setName('carShadow');

    // gracze
    for (const c of ['pole', 'romanian'] as CharId[]) {
      const v = new CharView(this, `char_${c}`, PLAYER_START[c].x, PLAYER_START[c].y);
      v.setLabel(c === this.me ? t('lobby.you') : t(`char.${c}.up`), c === this.me ? '#7dff7d' : '#80c0ff');
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
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,J,K,L,E,SPACE,Z,X,C,SHIFT,ESC') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');

    // sieć
    if (data.mode === 'host') {
      this.offs.push(
        net.on('relay', (d) => {
          if (d.k === 'in') this.remoteInput = d.i;
        }),
        net.on('peer_left', () => this.abort(t('err.mate_left'))),
        net.on('disconnected', () => this.abort(t('err.lost'))),
      );
    } else if (data.mode === 'guest') {
      this.offs.push(
        net.on('relay', (d) => {
          if (d.k === 'snap') this.onSnap(d.s as Snapshot);
          else if (d.k === 'again') this.scene.start('Lobby', { mode: 'guest', code: this.data0.code });
        }),
        net.on('peer_left', () => this.abort(t('err.host_disc'))),
        net.on('disconnected', () => this.abort(t('err.lost'))),
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
    const touchMove = !!(controls.touchX || controls.touchY);
    if (touchMove) {
      mx = controls.touchX;
      my = controls.touchY;
    }
    const atkPressed =
      Phaser.Input.Keyboard.JustDown(k.J) || Phaser.Input.Keyboard.JustDown(k.SPACE) || Phaser.Input.Keyboard.JustDown(k.Z) || controls.touchAtk;
    controls.touchAtk = false;
    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(k.L) || Phaser.Input.Keyboard.JustDown(k.C) || Phaser.Input.Keyboard.JustDown(k.SHIFT) || controls.touchJump;
    controls.touchJump = false;
    const actHeld = k.K.isDown || k.E.isDown || k.X.isDown || controls.touchAct;

    // bieg: podwójne stuknięcie w bok (klawiatura) albo joystick wychylony do końca
    const tapL = Phaser.Input.Keyboard.JustDown(k.A) || Phaser.Input.Keyboard.JustDown(k.LEFT);
    const tapR = Phaser.Input.Keyboard.JustDown(k.D) || Phaser.Input.Keyboard.JustDown(k.RIGHT);
    const now = this.time.now;
    for (const [tap, dir] of [
      [tapL, -1],
      [tapR, 1],
    ] as const) {
      if (!tap) continue;
      if (this.lastTapDir === dir && now - this.lastTapT < 280) this.running = true;
      this.lastTapDir = dir;
      this.lastTapT = now;
    }
    if (touchMove) {
      this.fullStickT = Math.abs(controls.touchX) > 0.9 ? this.fullStickT + dt : 0;
      if (this.fullStickT > 0.3) this.running = true;
    }
    if (!mx || (this.running && Math.sign(mx) !== this.face)) this.running = false;

    const ps = this.snap?.p[this.me];
    const down = !!ps?.down;
    const inCar = !!ps?.inCar;
    // nad głową: wróg (1) albo ciężki przedmiot (2); broń (3) trzyma się w ręce
    const holding = ps?.hold === 1 || ps?.hold === 2;
    const st = ps ? statsFromArray(ps.st) : baseStats(this.me);

    this.atkT = Math.max(0, this.atkT - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.kdT = Math.max(0, this.kdT - dt);
    let anim: AnimName = 'idle';
    const moving = !!(mx || my);

    if (down || inCar) {
      anim = 'down';
      this.z = this.vz = 0;
      this.running = false;
    } else if (this.kdT > 0) {
      anim = 'down';
      this.running = false;
    } else if (this.hurtT > 0) {
      anim = 'hurt';
    } else {
      if (jumpPressed && this.z === 0 && !holding) {
        this.vz = JUMP_V;
        this.z = 0.01;
        this.sound.play('swing', { volume: 0.15, rate: 1.6 });
      }
      if (atkPressed && this.atkT <= 0) {
        this.atkSeq++;
        this.ak = holding ? 'n' : this.z > 0 ? 'j' : this.running ? 'r' : 'n';
        this.atkT = attackCooldown(this.me, st);
        if (this.ak === 'r') this.running = false;
      }
      const air = this.z > 0;
      if (air) anim = this.atkT > 0 ? 'jatk' : 'jump';
      else if (this.atkT > 0) anim = 'atk';
      else if (holding) anim = 'hold';
      else if (actHeld && !moving) anim = this.hasAction() ? 'act' : 'block';
      else if (moving) anim = this.running ? 'run' : 'walk';
      // na ziemi cios zatrzymuje w miejscu; w powietrzu można sterować
      if (moving && (air || this.atkT <= 0) && anim !== 'act' && anim !== 'block') {
        const len = Math.hypot(mx, my) || 1;
        const mag = Math.min(1, Math.hypot(mx, my));
        const sp = moveSpeed(st) * (this.running ? RUN_MULT : 1) * (holding ? HOLD_MULT : 1) * dt;
        this.px += (mx / len) * sp * mag;
        this.py += (my / len) * sp * 0.72 * mag;
        if (Math.abs(mx) > 0.2) this.face = mx > 0 ? 1 : -1;
        if (!air) {
          this.stepT += dt;
          if (this.stepT > (this.running ? 0.1 : 0.18)) {
            this.stepT = 0;
            if (Math.random() < (this.running ? 0.8 : 0.35)) this.spawnDust(this.px - this.face * 6, this.py);
          }
        }
      }
    }
    // fizyka skoku
    if (this.z > 0 || this.vz > 0) {
      this.vz -= GRAVITY * dt;
      this.z += this.vz * dt;
      if (this.z <= 0) {
        this.z = 0;
        this.vz = 0;
        this.spawnDust(this.px - 5, this.py);
        this.spawnDust(this.px + 5, this.py);
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
      z: Math.round(this.z),
      face: this.face,
      anim,
      atk: this.atkSeq,
      ak: this.ak,
      act: actHeld && (anim === 'act' || anim === 'block' || anim === 'hold'),
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
        this.floatText(t(e.s), e.x, e.y, e.c);
        break;
      case 'hurt':
        if (e.who === this.me) {
          this.knock = e.dx;
          this.hurtT = 0.3;
          this.running = false;
          if (e.kd) {
            this.kdT = e.kd;
            this.hurtT = 0;
          }
          this.cameras.main.shake(150, 0.008);
          this.cameras.main.flash(80, 255, 60, 60);
        }
        break;
      case 'msg':
        if (!e.who || e.who === this.me) this.events.emit('toast', t(e.s, e.a));
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
        v.place(this.face, !!ps?.down || this.kdT > 0, this.z);
        // mruganie przy nietykalności
        v.sprite.setAlpha(this.hurtT > 0 ? 0.6 : 1);
      } else if (ps) {
        if (Math.abs(ps.x - v.x) > 80) v.x = ps.x;
        v.x += (ps.x - v.x) * lerp;
        v.y += (ps.y - v.y) * lerp;
        v.setAnim(ps.anim);
        v.z += (ps.z - v.z) * Math.min(1, lerp * 1.5);
        v.place(ps.face, ps.down || ps.kd > 0, v.z);
      }
      v.stars.setVisible(!!ps?.down || (c === this.me ? this.kdT > 0 : (ps?.kd ?? 0) > 0));
    }

    // NPC
    if (s) {
      const alive = new Set<number>();
      for (const [id, kind, x, y, face, anim, f, , z] of s.n) {
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
        v.place(face, anim === 'down', z);
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

      this.renderItems(s, dt);

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

  /** Przedmioty z ulicy i monety na ziemi. */
  private renderItems(s: Snapshot, dt: number) {
    const lerp = Math.min(1, dt * 14);
    const seen = new Set<number>();
    for (const [id, kind, x, y, z, holder, thrown] of s.it) {
      seen.add(id);
      let v = this.itemViews.get(id);
      const tex = kind === 'gnome' ? 'gnome' : `it_${kind}`;
      if (!v) {
        v = { img: this.add.image(x, y, tex).setOrigin(0.5, 1), shadow: this.add.image(x, y, 'shadow').setScale(0.6).setDepth(1), spin: 0 };
        v.img.setData('x', x).setData('y', y).setData('z', z);
        this.itemViews.set(id, v);
      }
      const weapon = ITEMS[kind].type === 'weapon';
      // pozycja: trzymany przez gracza — za widokiem postaci (płynnie); reszta — ze snapshotu
      let ix: number;
      let iy: number;
      let iz: number;
      let face = 1;
      let anim: AnimName = 'idle';
      if (holder === 1 || holder === 2) {
        const c: CharId = holder === 1 ? 'pole' : 'romanian';
        const cv = this.views[c];
        ix = cv.x;
        iy = cv.y;
        iz = c === this.me ? this.z : cv.z;
        face = c === this.me ? this.face : s.p[c].face;
        anim = cv.anim || 'idle';
      } else {
        const px = v.img.getData('x') as number;
        const py = v.img.getData('y') as number;
        const pz = v.img.getData('z') as number;
        const far = Math.abs(x - px) > 60;
        ix = far ? x : px + (x - px) * lerp;
        iy = far ? y : py + (y - py) * lerp;
        iz = far ? z : pz + (z - pz) * lerp;
        v.img.setData('x', ix).setData('y', iy).setData('z', iz);
      }
      const img = v.img;
      img.setFlipX(false).setRotation(0);
      // NPC: snapshot ma już wysokość trzymania — liczymy od jego stóp
      const hz = holder === 3 ? 0 : iz;
      if (holder !== 0 && weapon) {
        // broń w dłoni
        const ang = anim === 'atk' ? 15 : anim === 'jatk' ? 35 : anim === 'block' ? -95 : -55;
        img.setOrigin(0.12, 0.5).setFlipX(face < 0);
        if (face < 0) img.setOrigin(0.88, 0.5);
        img.setRotation(Phaser.Math.DegToRad(ang) * face);
        img.setPosition(Math.round(ix + face * 8), Math.round(iy - 17 - hz)).setDepth(iy + 1);
        v.shadow.setVisible(false);
      } else if (holder !== 0) {
        // nad głową
        img.setOrigin(0.5, 1).setPosition(Math.round(ix), Math.round(iy - 26 - hz)).setDepth(iy + 1);
        v.shadow.setVisible(false);
      } else {
        img.setOrigin(0.5, 1).setPosition(Math.round(ix), Math.round(iy - iz)).setDepth(iy);
        if (thrown && (kind === 'tire' || kind === 'bottle' || weapon)) {
          v.spin += dt * 14;
          img.setOrigin(0.5, 0.5).setRotation(v.spin).setY(Math.round(iy - iz - img.height / 2));
        }
        v.shadow.setVisible(true).setPosition(Math.round(ix), Math.round(iy));
      }
    }
    for (const [id, v] of this.itemViews) {
      if (seen.has(id)) continue;
      v.img.destroy();
      v.shadow.destroy();
      this.itemViews.delete(id);
    }
    const seenC = new Set<number>();
    for (const [id, x, y, left] of s.co) {
      seenC.add(id);
      let c = this.coinViews.get(id);
      if (!c) {
        c = this.add.image(x, y - 3, 'coin').setDepth(y);
        this.coinViews.set(id, c);
        this.tweens.add({ targets: c, y: y - 12, duration: 180, yoyo: true, ease: 'Quad.out' });
      }
      c.setVisible(left > 3 || Math.floor(this.time.now / 120) % 2 === 0);
    }
    for (const [id, c] of this.coinViews) {
      if (seenC.has(id)) continue;
      c.destroy();
      this.coinViews.delete(id);
    }
  }

  /** Podpowiedź dla lokalnego gracza — co zrobi AKCJA w tym miejscu. */
  actionHint(): string {
    return this.actionInfo().text;
  }

  /** Czy AKCJA zrobi coś w tym miejscu (inaczej przytrzymanie AKCJI to blok). */
  hasAction(): boolean {
    return this.actionInfo().act;
  }

  private actionInfo(): { text: string; act: boolean } {
    const s = this.snap;
    const none = { text: '', act: false };
    if (!s) return none;
    const yes = (k: string, a?: Record<string, string>) => ({ text: t(k, a), act: true });
    const info = (k: string) => ({ text: t(k), act: false });
    const me = s.p[this.me];
    if (me.down) return info('hint.down');
    if (me.inCar) return info('hint.in_car');
    if (me.hold === 1) return yes('hint.holding');
    if (me.hold === 2) return yes('hint.holding_item');
    if (me.hold === 3) return yes('hint.weapon');
    const near = (x: number, y: number, rx: number, ry: number) => Math.abs(this.px - x) < rx && Math.abs(this.py - y) < ry;
    const o = s.p[this.other];
    if (o.present && o.down && near(o.x, o.y, 28, 16)) return yes('hint.revive');
    if (s.stage === 0 && !s.o.gnome && near(ITEM_POS.gnome.x, ITEM_POS.gnome.y, 22, 18)) return yes('hint.gnome');
    if (s.stage === 1 && !s.o.bike && near(ITEM_POS.bike.x, ITEM_POS.bike.y, 26, 20)) {
      if (s.o.lockHp > 0) return this.me === 'romanian' ? yes('hint.lockpick') : info('hint.smash');
      return yes('hint.bike');
    }
    if (s.stage === 2 && !s.o.carGone && near(s.o.carX, ITEM_POS.car.y, 56, 22)) {
      if (!s.o.carUnlocked) return this.me === 'romanian' || !o.present ? yes('hint.carlock') : info('hint.lookout');
      return yes('hint.enter');
    }
    for (const [, , x, y, , anim, f, , z] of s.n) {
      if (anim === 'down' && !(f & NF_KO) && z === 0 && near(x, y, 30, 14)) return yes('hint.lift');
    }
    for (const [, kind, x, y, z, holder] of s.it) {
      if (holder === 0 && z === 0 && near(x, y, 18, 12)) return yes('hint.pickup', { i: `item.${kind}` });
    }
    for (const [, , x, y, face, , f] of s.n) {
      if (!near(x, y, 36, 14)) continue;
      if (f & NF_KO) {
        if (f & NF_LOOTED) continue;
        return yes('hint.loot');
      }
      if (this.me === 'romanian' && !(f & (NF_ROBBED | NF_RAGE))) {
        return face * (this.px - x) < 0 ? yes('hint.pick') : info('hint.facing');
      }
    }
    return none;
  }

  /** Indeks poziomu, na którym stoi lokalny gracz. */
  playerLevel(): number {
    return LEVELS.findIndex((l) => this.px >= l.x0 && this.px < l.x1);
  }
}
