import Phaser from 'phaser';
import { GAME_H, GAME_W } from './game/constants';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { JoinScene } from './scenes/JoinScene';
import { LobbyScene } from './scenes/LobbyScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { EndScene } from './scenes/EndScene';
import { ShopScene } from './scenes/ShopScene';
import { PauseScene } from './scenes/PauseScene';
import { PasswordScene } from './scenes/PasswordScene';
import { DialogScene } from './scenes/DialogScene';
import { applyDocumentLang } from './i18n';

async function start() {
  applyDocumentLang();
  try {
    await Promise.race([document.fonts.load('24px Pixelify'), new Promise((r) => setTimeout(r, 2500))]);
  } catch {
    /* brak fontu nie blokuje gry */
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_W,
    height: GAME_H,
    backgroundColor: '#181020',
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
      activePointers: 4,
    },
    audio: {
      disableWebAudio: false,
    },
    scene: [BootScene, MenuScene, JoinScene, LobbyScene, GameScene, UIScene, EndScene, ShopScene, PauseScene, PasswordScene, DialogScene],
  });
  (window as unknown as { __game: Phaser.Game }).__game = game;
}

start();
