import Phaser from 'phaser';

let current: Phaser.Sound.BaseSound | null = null;
let currentKey = '';

export function playMusic(scene: Phaser.Scene, key: string, volume = 0.35) {
  if (currentKey === key && current && current.isPlaying) return;
  current?.stop();
  current?.destroy();
  current = scene.sound.add(key, { loop: true, volume });
  currentKey = key;
  if (scene.sound.locked) {
    scene.sound.once(Phaser.Sound.Events.UNLOCKED, () => current?.play());
  } else {
    current.play();
  }
}

export function stopMusic() {
  current?.stop();
  current?.destroy();
  current = null;
  currentKey = '';
}
