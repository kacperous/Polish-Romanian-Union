import Phaser from 'phaser';

export const FONT = 'Pixelify, monospace';

export const COLORS = {
  dark: 0x181020,
  red: 0xd8263a,
  white: 0xf4f4f4,
  yellow: 0xf2c230,
  blue: 0x1f3f98,
  green: 0x3e8e48,
  grey: 0x505060,
};

export function txt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  s: string,
  size = 24,
  color = '#ffffff',
  stroke = 6,
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, s, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      color,
      stroke: '#181020',
      strokeThickness: stroke,
      align: 'center',
    })
    .setOrigin(0.5);
}

export interface Button extends Phaser.GameObjects.Container {
  setEnabled(v: boolean): void;
  setLabel(s: string): void;
}

export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  color: number,
  onClick: () => void,
  size = 26,
): Button {
  const c = scene.add.container(x, y) as Button;
  const shadow = scene.add.rectangle(4, 5, w, h, 0x000000, 0.45);
  const bg = scene.add.rectangle(0, 0, w, h, color).setStrokeStyle(4, COLORS.dark);
  const hl = scene.add.rectangle(0, -h / 2 + 5, w - 8, 4, 0xffffff, 0.35);
  const t = txt(scene, 0, 1, label, size, '#ffffff', 5);
  c.add([shadow, bg, hl, t]);
  c.setSize(w, h);
  let enabled = true;
  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerover', () => enabled && c.setScale(1.04));
  bg.on('pointerout', () => c.setScale(1));
  bg.on('pointerdown', () => {
    if (!enabled) return;
    c.setScale(0.96);
  });
  bg.on('pointerup', () => {
    if (!enabled) return;
    c.setScale(1);
    scene.sound.play('click', { volume: 0.5 });
    onClick();
  });
  c.setEnabled = (v: boolean) => {
    enabled = v;
    c.setAlpha(v ? 1 : 0.4);
  };
  c.setLabel = (s: string) => t.setText(s);
  return c;
}

/** Tło menu: przewijana panorama poziomu 1. */
export function menuBackdrop(scene: Phaser.Scene) {
  const far = scene.add.tileSprite(480, 270, 480, 270, 'bg_far1').setScale(2);
  const near = scene.add.tileSprite(480, 270, 960, 270, 'bg_level1').setScale(2);
  const shade = scene.add.rectangle(480, 270, 960, 540, 0x181020, 0.45);
  scene.events.on('update', (_t: number, dt: number) => {
    far.tilePositionX += dt * 0.004;
    near.tilePositionX += dt * 0.012;
  });
  return { far, near, shade };
}
