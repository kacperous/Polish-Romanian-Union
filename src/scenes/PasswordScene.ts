import Phaser from 'phaser';
import { t } from '../i18n';
import { button, COLORS, FONT, txt } from '../ui';
import { ALPHABET, decodePassword, formatPassword, normalizePassword, PASSWORD_LEN, SaveData } from '../game/save';

/** Wpisywanie hasła zapisu (nakładka nad lobby). Klawiatura ekranowa + fizyczna. */
export class PasswordScene extends Phaser.Scene {
  private code = '';
  private shown!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private onDone!: (s: SaveData | null) => void;

  constructor() {
    super('Password');
  }

  create(data: { onDone: (s: SaveData | null) => void }) {
    this.code = '';
    this.onDone = data.onDone;
    this.add.rectangle(480, 270, 960, 540, 0x000000, 0.7).setInteractive();
    this.add.rectangle(480, 270, 900, 500, 0x181020, 0.97).setStrokeStyle(4, 0xf2c230);
    txt(this, 480, 50, t('pw.title'), 30, '#ffe040', 6);
    txt(this, 480, 84, t('pw.sub', { n: PASSWORD_LEN }), 16, '#ffffff', 4);
    this.add.rectangle(480, 132, 840, 50, 0xf4f4f4).setStrokeStyle(3, 0x505060);
    this.shown = this.add.text(480, 132, '', { fontFamily: FONT, fontSize: '22px', color: '#181020' }).setOrigin(0.5);

    const keys = ALPHABET.split('');
    keys.forEach((k, i) => {
      const col = i % 8;
      const row = Math.floor(i / 8);
      button(this, 228 + col * 72, 200 + row * 56, 62, 48, k, COLORS.grey, () => this.press(k), 24);
    });
    button(this, 300, 440, 150, 48, '⌫', COLORS.red, () => this.press('⌫'), 24);
    button(this, 480, 440, 180, 48, t('pw.ok'), COLORS.green, () => this.submit(), 22);
    button(this, 680, 440, 180, 48, t('pw.cancel'), COLORS.grey, () => this.close(null), 20);
    this.status = txt(this, 480, 494, '', 18, '#ff6060', 4);

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Backspace') this.press('⌫');
      else if (e.key === 'Enter') this.submit();
      else if (e.key === 'Escape') this.close(null);
      else if (e.key.length === 1 && ALPHABET.includes(e.key.toUpperCase())) this.press(e.key.toUpperCase());
    });
    const onPaste = (e: ClipboardEvent) => {
      const s = normalizePassword(e.clipboardData?.getData('text') || '').slice(0, PASSWORD_LEN);
      if (s) {
        this.code = s;
        this.refresh();
      }
    };
    window.addEventListener('paste', onPaste);
    this.events.once('shutdown', () => window.removeEventListener('paste', onPaste));
    this.refresh();
  }

  private press(k: string) {
    if (k === '⌫') this.code = this.code.slice(0, -1);
    else if (this.code.length < PASSWORD_LEN) this.code += k;
    this.status.setText('');
    this.refresh();
  }

  private refresh() {
    const pad = this.code + '·'.repeat(PASSWORD_LEN - this.code.length);
    this.shown.setText(formatPassword(pad));
  }

  private submit() {
    const d = decodePassword(this.code);
    if (!d) {
      this.status.setText(this.code.length < PASSWORD_LEN ? t('pw.short') : t('pw.bad'));
      this.sound.play('alert', { volume: 0.4 });
      return;
    }
    this.sound.play('pickup', { volume: 0.4 });
    this.close(d);
  }

  private close(d: SaveData | null) {
    this.onDone(d);
    this.scene.stop();
  }
}
