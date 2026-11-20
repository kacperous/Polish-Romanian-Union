/**
 * Serwer gry: serwuje zbudowanego klienta (dist/) oraz WebSocket /ws
 * z pokojami na 6-cyfrowy kod. Serwer tylko przekazuje wiadomości
 * między hostem a gościem — całą logikę gry liczy przeglądarka hosta.
 */
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const STATIC_DIR = resolve(process.env.STATIC_DIR || join(process.cwd(), 'dist'));

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.wav': 'audio/wav',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};

interface Room {
  code: string;
  host: WebSocket;
  guest: WebSocket | null;
  created: number;
}

const rooms = new Map<string, Room>();
const socketRoom = new Map<WebSocket, Room>();

async function serveStatic(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', 'http://x');
  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = normalize(join(STATIC_DIR, p));
  if (!file.startsWith(STATIC_DIR)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const s = await stat(file);
    if (!s.isFile()) throw new Error('nie plik');
    const data = await readFile(file);
    const ext = extname(file);
    res.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream',
      'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    res.end(data);
  } catch {
    // SPA fallback
    try {
      const data = await readFile(join(STATIC_DIR, 'index.html'));
      res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-cache' });
      res.end(data);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Brak zbudowanego klienta. Uruchom: npm run build');
    }
  }
}

function send(ws: WebSocket | null, msg: unknown) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function newCode(): string {
  for (let i = 0; i < 1000; i++) {
    const c = String(Math.floor(100000 + Math.random() * 900000));
    if (!rooms.has(c)) return c;
  }
  throw new Error('Brak wolnych kodów');
}

function leave(ws: WebSocket) {
  const room = socketRoom.get(ws);
  if (!room) return;
  socketRoom.delete(ws);
  if (room.host === ws) {
    send(room.guest, { t: 'peer_left', reason: 'host' });
    if (room.guest) socketRoom.delete(room.guest);
    rooms.delete(room.code);
  } else if (room.guest === ws) {
    room.guest = null;
    send(room.host, { t: 'peer_left', reason: 'guest' });
  }
}

const server = createServer((req, res) => {
  serveStatic(req, res).catch(() => res.writeHead(500).end());
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 256 * 1024 });

wss.on('connection', (ws) => {
  (ws as WebSocket & { alive?: boolean }).alive = true;
  ws.on('pong', () => ((ws as WebSocket & { alive?: boolean }).alive = true));

  ws.on('message', (raw) => {
    let msg: { t?: string; code?: string; d?: unknown };
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }
    switch (msg.t) {
      case 'create': {
        leave(ws);
        const code = newCode();
        const room: Room = { code, host: ws, guest: null, created: Date.now() };
        rooms.set(code, room);
        socketRoom.set(ws, room);
        send(ws, { t: 'created', code });
        break;
      }
      case 'join': {
        const code = String(msg.code || '').trim();
        const room = rooms.get(code);
        if (!room) {
          send(ws, { t: 'error', code: 'not_found', msg: 'Nie ma gry o takim kodzie.' });
          return;
        }
        if (room.guest && room.guest !== ws) {
          send(ws, { t: 'error', code: 'full', msg: 'Ta gra jest już pełna.' });
          return;
        }
        leave(ws);
        room.guest = ws;
        socketRoom.set(ws, room);
        send(ws, { t: 'joined', code });
        send(room.host, { t: 'peer_joined' });
        break;
      }
      case 'leave':
        leave(ws);
        break;
      case 'relay': {
        const room = socketRoom.get(ws);
        if (!room) return;
        const other = room.host === ws ? room.guest : room.host;
        send(other, { t: 'relay', d: msg.d });
        break;
      }
      case 'ping':
        send(ws, { t: 'pong' });
        break;
    }
  });

  ws.on('close', () => leave(ws));
  ws.on('error', () => leave(ws));
});

// heartbeat — wyrzuca martwe połączenia
setInterval(() => {
  for (const ws of wss.clients) {
    const w = ws as WebSocket & { alive?: boolean };
    if (w.alive === false) {
      w.terminate();
      continue;
    }
    w.alive = false;
    w.ping();
  }
}, 15000);

server.listen(PORT, HOST, () => {
  console.log(`[unia] serwer działa na http://${HOST}:${PORT} (static: ${STATIC_DIR})`);
});
