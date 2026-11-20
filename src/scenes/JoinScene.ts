import Phaser from 'phaser';
import { t } from '../i18n';
import { button, COLORS, menuBackdrop, txt } from '../ui';
import { net } from '../net/Net';

export class JoinScene extends Phaser.Scene {
  private code = '';
  private digits: Phaser.GameObjects.Text[] = [];
  private status!: Phaser.GameObjects.Text;
  private busy = false;

  constructor() {
    super('Join');
  }

  create(data: { code?: string }) {
    this.code = '';
    this.busy = false;
    this.digits = [];
    menuBackdrop(this);
    txt(this, 480, 50, t('join.title'), 40, '#ffe040');
    txt(this, 480, 92, t('join.sub'), 18, '#ffffff', 4);

    for (let i = 0; i < 6; i++) {
      const x = 480 + (i - 2.5) * 62;
      this.add.rectangle(x, 150, 52, 64, 0xf4f4f4).setStrokeStyle(4, COLORS.dark);
      this.digits.push(txt(this, x, 152, '', 44, '#181020', 0));
    }

    // klawiatura numeryczna (dla telefonów)
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'];
    keys.forEach((k, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const color = k === 'OK' ? COLORS.green : k === '⌫' ? COLORS.red : COLORS.grey;
      button(this, 400 + col * 80, 236 + row * 66, 70, 56, k, color, () => this.press(k), 30);
    });
    button(this, 120, 500, 180, 50, t('join.back'), COLORS.grey, () => this.scene.start('Menu'), 22);
    this.status = txt(this, 480, 510, '', 20, '#ff6060', 5);

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) this.press(e.key);
      else if (e.key === 'Backspace') this.press('⌫');
      else if (e.key === 'Enter') this.press('OK');
      else if (e.key === 'Escape') this.scene.start('Menu');
    });
    const onPaste = (e: ClipboardEvent) => {
      const s = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
      if (s) {
        this.code = s;
        this.refresh();
        if (s.length === 6) this.submit();
      }
    };
    window.addEventListener('paste', onPaste);
    this.events.once('shutdown', () => window.removeEventListener('paste', onPaste));

    if (data?.code) {
      this.code = data.code;
      this.refresh();
      this.submit();
    }
  }

  private press(k: string) {
    if (this.busy) return;
    if (k === '⌫') this.code = this.code.slice(0, -1);
    else if (k === 'OK') return this.submit();
    else if (this.code.length < 6) this.code += k;
    this.refresh();
    if (this.code.length === 6) this.submit();
  }

  private refresh() {
    this.digits.forEach((d, i) => d.setText(this.code[i] || ''));
  }

  private async submit() {
    if (this.code.length !== 6 || this.busy) {
      if (this.code.length !== 6) this.status.setText(t('join.len'));
      return;
    }
    this.busy = true;
    this.status.setColor('#ffffff').setText(t('join.connecting'));
    try {
      await net.join(this.code);
      this.scene.start('Lobby', { mode: 'guest', code: this.code });
    } catch (e) {
      this.busy = false;
      this.status.setColor('#ff6060').setText(t((e as Error).message));
      this.code = '';
      this.refresh();
    }
  }
}
