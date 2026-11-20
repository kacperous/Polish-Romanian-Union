/** Prosty klient WebSocket z pokojami (kod 6 cyfr). */
type Handler = (msg: any) => void;

class NetClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<Handler>>();
  private openPromise: Promise<void> | null = null;
  code: string | null = null;
  role: 'host' | 'guest' | null = null;

  private url(): string {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${location.host}/ws`;
  }

  connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return Promise.resolve();
    if (this.openPromise) return this.openPromise;
    this.openPromise = new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url());
      this.ws = ws;
      const timer = setTimeout(() => {
        reject(new Error('Brak połączenia z serwerem'));
        ws.close();
      }, 6000);
      ws.onopen = () => {
        clearTimeout(timer);
        resolve();
      };
      ws.onerror = () => {
        clearTimeout(timer);
        reject(new Error('Nie można połączyć z serwerem'));
      };
      ws.onclose = () => {
        this.ws = null;
        this.openPromise = null;
        this.emit('disconnected', {});
      };
      ws.onmessage = (ev) => {
        let msg: any;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (msg.t === 'relay') this.emit('relay', msg.d);
        else this.emit(msg.t, msg);
      };
    });
    this.openPromise.catch(() => (this.openPromise = null));
    return this.openPromise;
  }

  get connected() {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  on(type: string, h: Handler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(h);
    return () => this.handlers.get(type)?.delete(h);
  }

  private emit(type: string, msg: any) {
    this.handlers.get(type)?.forEach((h) => h(msg));
  }

  private raw(msg: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  async create(): Promise<string> {
    await this.connect();
    return new Promise((resolve) => {
      const off = this.on('created', (m) => {
        off();
        this.code = m.code;
        this.role = 'host';
        resolve(m.code);
      });
      this.raw({ t: 'create' });
    });
  }

  async join(code: string): Promise<void> {
    await this.connect();
    return new Promise((resolve, reject) => {
      const offOk = this.on('joined', (m) => {
        offOk();
        offErr();
        this.code = m.code;
        this.role = 'guest';
        resolve();
      });
      const offErr = this.on('error', (m) => {
        offOk();
        offErr();
        reject(new Error(m.msg));
      });
      this.raw({ t: 'join', code });
    });
  }

  send(d: unknown) {
    this.raw({ t: 'relay', d });
  }

  leave() {
    this.raw({ t: 'leave' });
    this.code = null;
    this.role = null;
  }
}

export const net = new NetClient();
