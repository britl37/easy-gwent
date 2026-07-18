import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';
import {
  redactState,
  type ClientMsg,
  type PlayerId,
  type ProtocolErrorCode,
  type ServerMsg,
  type UserPublic,
} from '@gwent/engine';
import { authByToken, login, logout, register } from './auth.ts';
import { openDb } from './db.ts';
import { Rooms } from './rooms.ts';
import { leaderboard, recordMatch, type MatchOutcome } from './stats.ts';

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? '0.0.0.0';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATIC_DIR =
  process.env.STATIC_DIR ?? path.resolve(__dirname, '../../client/dist');
/** Downloaded card art (repo root assets/). */
const ASSETS_DIR =
  process.env.ASSETS_DIR ?? path.resolve(__dirname, '../../../assets');
const DB_PATH =
  process.env.GWENT_DB ?? path.resolve(__dirname, '../data/gwent.sqlite');

const db = openDb(DB_PATH);
const rooms = new Rooms();

interface ConnState {
  ws: WebSocket;
  userId: string | null;
  username: string | null;
  seat: PlayerId | null;
  roomId: string | null;
}

interface RoomMeta {
  userIds: [string | null, string | null];
  usernames: [string | null, string | null];
  seats: [WebSocket | null, WebSocket | null];
  matchRecorded: boolean;
  /** Per-seat forfeit timers while a player is disconnected mid-game. */
  disconnectTimers: [NodeJS.Timeout | null, NodeJS.Timeout | null];
  /** Last create/join/rejoin/action/rematch in this room — drives idle GC. */
  lastActivity: number;
  /** Per-seat rematch offers after a finished game. */
  rematchVotes: [boolean, boolean];
}

/** How long a disconnected player has to rejoin before forfeiting. */
const RECONNECT_GRACE_MS = Number(process.env.GWENT_GRACE_MS ?? 60_000);
/** How long a room may wait for an opponent before its invite code expires. */
const ROOM_WAIT_MS = Number(process.env.GWENT_ROOM_WAIT_MS ?? 30 * 60_000);
/** How long a finished game lingers (rematch window) before the room is GC'd. */
const POSTGAME_MS = Number(process.env.GWENT_POSTGAME_MS ?? 10 * 60_000);

const connByWs = new Map<WebSocket, ConnState>();
const roomMeta = new Map<string, RoomMeta>();

/** Simple per-IP rate limit for auth endpoints. */
const rateBuckets = new Map<string, number[]>();
function rateLimit(ip: string, max = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (rateBuckets.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    rateBuckets.set(ip, arr);
    return false;
  }
  arr.push(now);
  rateBuckets.set(ip, arr);
  return true;
}

function send(ws: WebSocket, msg: ServerMsg): void {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function error(ws: WebSocket, code: ProtocolErrorCode, message: string): void {
  send(ws, { t: 'error', code, message });
}

function broadcastState(roomId: string): void {
  const room = rooms.get(roomId);
  if (!room?.state) return;
  const meta = roomMeta.get(roomId);
  if (!meta) return;
  for (const seat of [0, 1] as const) {
    const ws = meta.seats[seat];
    if (ws && ws.readyState === ws.OPEN) {
      send(ws, { t: 'state', state: redactState(room.state, seat) });
    }
  }
}

function sendMatchResults(
  roomId: string,
  outcome: MatchOutcome,
  p0: UserPublic,
  p1: UserPublic,
): void {
  const meta = roomMeta.get(roomId);
  if (!meta) return;
  const forSeat = (seat: PlayerId): ServerMsg => {
    const you = seat === 0 ? p0 : p1;
    const opponent = seat === 0 ? p1 : p0;
    let result: 'win' | 'loss' | 'draw';
    if (outcome === 'draw') result = 'draw';
    else if (outcome === 'p0_win' || outcome === 'forfeit_p1') result = seat === 0 ? 'win' : 'loss';
    else result = seat === 1 ? 'win' : 'loss';
    return { t: 'match_result', result, you, opponent };
  };
  for (const seat of [0, 1] as const) {
    const ws = meta.seats[seat];
    if (ws && ws.readyState === ws.OPEN) send(ws, forSeat(seat));
  }
}

function maybeRecordNaturalFinish(roomId: string): void {
  const room = rooms.get(roomId);
  const meta = roomMeta.get(roomId);
  if (!room?.state || !meta || meta.matchRecorded) return;
  if (room.state.phase !== 'finished') return;
  const p0 = meta.userIds[0];
  const p1 = meta.userIds[1];
  if (!p0 || !p1) return;

  let outcome: MatchOutcome;
  if (room.state.drawn) outcome = 'draw';
  else if (room.state.winner === 0) outcome = 'p0_win';
  else if (room.state.winner === 1) outcome = 'p1_win';
  else return;

  const result = recordMatch(db, {
    roomId,
    p0UserId: p0,
    p1UserId: p1,
    outcome,
  });
  meta.matchRecorded = true;
  sendMatchResults(roomId, outcome, result.p0, result.p1);
}

function recordForfeit(roomId: string, leaverSeat: PlayerId): void {
  const room = rooms.get(roomId);
  const meta = roomMeta.get(roomId);
  if (!room?.state || !meta || meta.matchRecorded) return;
  const p0 = meta.userIds[0];
  const p1 = meta.userIds[1];
  if (!p0 || !p1) return;

  const outcome: MatchOutcome = leaverSeat === 0 ? 'forfeit_p0' : 'forfeit_p1';
  const result = recordMatch(db, {
    roomId,
    p0UserId: p0,
    p1UserId: p1,
    outcome,
  });
  meta.matchRecorded = true;
  sendMatchResults(roomId, outcome, result.p0, result.p1);
}

/** Tear down a room: cancel any pending forfeit timers, drop state + meta. */
function destroyRoom(roomId: string): void {
  const meta = roomMeta.get(roomId);
  if (meta) {
    for (const seat of [0, 1] as const) {
      const timer = meta.disconnectTimers[seat];
      if (timer) {
        clearTimeout(timer);
        meta.disconnectTimers[seat] = null;
      }
    }
  }
  rooms.remove(roomId);
  roomMeta.delete(roomId);
}

/** GC a room for inactivity: tell any connected seats, unbind them, drop it. */
function expireRoom(roomId: string): void {
  const meta = roomMeta.get(roomId);
  if (meta) {
    for (const seat of [0, 1] as const) {
      const ws = meta.seats[seat];
      if (!ws) continue;
      if (ws.readyState === ws.OPEN) send(ws, { t: 'room_expired' });
      const conn = connByWs.get(ws);
      if (conn) {
        conn.seat = null;
        conn.roomId = null;
      }
    }
  }
  destroyRoom(roomId);
}

/** Periodic idle-room sweep: expire stale invite codes and lingering post-game rooms. */
setInterval(() => {
  const now = Date.now();
  for (const [roomId, meta] of roomMeta) {
    const room = rooms.get(roomId);
    if (!room) {
      roomMeta.delete(roomId);
      continue;
    }
    const idle = now - meta.lastActivity;
    if (room.state === null && idle > ROOM_WAIT_MS) expireRoom(roomId);
    else if (room.state?.phase === 'finished' && idle > POSTGAME_MS) expireRoom(roomId);
  }
}, 60_000).unref();

function bindSeat(ws: WebSocket, roomId: string, seat: PlayerId, userId: string, username: string): void {
  let meta = roomMeta.get(roomId);
  if (!meta) {
    meta = {
      userIds: [null, null],
      usernames: [null, null],
      seats: [null, null],
      matchRecorded: false,
      disconnectTimers: [null, null],
      lastActivity: Date.now(),
      rematchVotes: [false, false],
    };
    roomMeta.set(roomId, meta);
  }
  meta.lastActivity = Date.now();
  const timer = meta.disconnectTimers[seat];
  if (timer) {
    clearTimeout(timer);
    meta.disconnectTimers[seat] = null;
  }
  meta.seats[seat] = ws;
  meta.userIds[seat] = userId;
  meta.usernames[seat] = username;
  const conn = connByWs.get(ws)!;
  conn.seat = seat;
  conn.roomId = roomId;
}

function clearSeat(ws: WebSocket, opts: { sendLeave?: boolean } = {}): void {
  const conn = connByWs.get(ws);
  if (!conn || conn.seat === null || !conn.roomId) {
    if (conn) {
      conn.seat = null;
      conn.roomId = null;
    }
    return;
  }

  const roomId = conn.roomId;
  const seat = conn.seat;
  const meta = roomMeta.get(roomId);
  const room = rooms.get(roomId);

  // Forfeit if game had started and result not yet recorded.
  if (room?.state && meta && !meta.matchRecorded) {
    recordForfeit(roomId, seat);
  }

  if (meta && meta.seats[seat] === ws) meta.seats[seat] = null;

  const other = meta?.seats[1 - seat] ?? null;
  if (opts.sendLeave !== false && other && other.readyState === other.OPEN) {
    send(other, { t: 'opponent_left' });
  }

  destroyRoom(roomId);

  conn.seat = null;
  conn.roomId = null;

  if (other && other !== ws) {
    const oc = connByWs.get(other);
    if (oc) {
      oc.seat = null;
      oc.roomId = null;
    }
  }
}

/**
 * Socket dropped without an explicit `leave`.
 * If a started game is in progress, hold the seat for RECONNECT_GRACE_MS
 * so the player can rejoin; otherwise tear down immediately (old behavior).
 */
function handleDisconnect(ws: WebSocket): void {
  const conn = connByWs.get(ws);
  if (!conn || conn.seat === null || !conn.roomId) {
    clearSeat(ws);
    return;
  }
  const roomId = conn.roomId;
  const seat = conn.seat;
  const meta = roomMeta.get(roomId);
  const room = rooms.get(roomId);

  // No active game (waiting for opponent, or already finished/recorded) →
  // no reason to hold the seat.
  if (!room?.state || !meta || meta.matchRecorded) {
    clearSeat(ws);
    return;
  }

  if (meta.seats[seat] === ws) meta.seats[seat] = null;
  conn.seat = null;
  conn.roomId = null;

  const other = meta.seats[1 - seat];
  if (other && other.readyState === other.OPEN) {
    send(other, { t: 'opponent_disconnected', graceMs: RECONNECT_GRACE_MS });
  }

  meta.disconnectTimers[seat] = setTimeout(() => {
    const m = roomMeta.get(roomId);
    if (!m) return;
    m.disconnectTimers[seat] = null;
    if (m.seats[seat]) return; // player rejoined in time
    recordForfeit(roomId, seat);
    const o = m.seats[1 - seat];
    if (o && o.readyState === o.OPEN) send(o, { t: 'opponent_left' });
    const oc = o ? connByWs.get(o) : undefined;
    if (oc) {
      oc.seat = null;
      oc.roomId = null;
    }
    destroyRoom(roomId);
  }, RECONNECT_GRACE_MS);
}

/** Shared rejoin logic — used by the `rejoin` message and as a fallback when a
 *  seated player sends `join_room` for a room they're already part of. */
function rejoinSeat(ws: WebSocket, conn: ConnState, roomId: string): void {
  const meta = roomMeta.get(roomId);
  const room = rooms.get(roomId);
  if (!meta || !room?.state || meta.matchRecorded) {
    error(ws, 'rejoin_failed', 'Game no longer available');
    return;
  }
  const seatIdx = meta.userIds.findIndex((id) => id !== null && id === conn.userId);
  if (seatIdx === -1) {
    error(ws, 'rejoin_failed', 'You are not a player in this room');
    return;
  }
  const seat = seatIdx as PlayerId;
  const existing = meta.seats[seat];
  if (existing && existing !== ws && existing.readyState === existing.OPEN) {
    error(ws, 'rejoin_failed', 'Seat is already connected');
    return;
  }
  bindSeat(ws, roomId, seat, conn.userId!, conn.username!); // cancels forfeit timer
  const oppDeck = room.decks[1 - seat]!;
  send(ws, {
    t: 'joined',
    roomId,
    you: seat,
    opponentFaction: oppDeck.faction,
    opponentUsername: meta.usernames[1 - seat] ?? 'Opponent',
  });
  send(ws, { t: 'state', state: redactState(room.state, seat) });
  const other = meta.seats[1 - seat];
  if (other && other.readyState === other.OPEN) {
    send(other, { t: 'opponent_reconnected' });
  }
}

function requireAuth(ws: WebSocket): ConnState | null {
  const conn = connByWs.get(ws);
  if (!conn?.userId || !conn.username) {
    error(ws, 'auth_required', 'Authenticate first');
    return null;
  }
  return conn;
}

function handleMessage(ws: WebSocket, raw: string): void {
  let msg: ClientMsg;
  try {
    msg = JSON.parse(raw) as ClientMsg;
  } catch {
    error(ws, 'bad_message', 'Invalid JSON');
    return;
  }
  if (!msg || typeof msg !== 'object' || !('t' in msg)) {
    error(ws, 'bad_message', 'Missing message type');
    return;
  }

  switch (msg.t) {
    case 'auth': {
      const user = authByToken(db, msg.token);
      if (!user) {
        error(ws, 'auth_invalid', 'Invalid or expired session');
        return;
      }
      const conn = connByWs.get(ws)!;
      conn.userId = user.id;
      conn.username = user.username;
      send(ws, { t: 'authed', user });
      return;
    }

    case 'create_room': {
      const conn = requireAuth(ws);
      if (!conn) return;
      if (conn.seat !== null) {
        error(ws, 'already_in_room', 'Already in a room');
        return;
      }
      const result = rooms.create(msg.deck);
      if (!result.ok) {
        error(ws, result.code, result.message);
        return;
      }
      bindSeat(ws, result.value.id, 0, conn.userId!, conn.username!);
      send(ws, { t: 'room_created', roomId: result.value.id });
      return;
    }

    case 'join_room': {
      const conn = requireAuth(ws);
      if (!conn) return;
      if (conn.seat !== null) {
        error(ws, 'already_in_room', 'Already in a room');
        return;
      }
      const metaExisting = roomMeta.get(msg.roomId);
      // Reconnecting player used the Join flow with their old room code —
      // treat it as a rejoin instead of failing with room_full.
      if (metaExisting?.userIds.some((id) => id !== null && id === conn.userId)) {
        rejoinSeat(ws, conn, msg.roomId);
        return;
      }
      if (metaExisting?.userIds[0] === conn.userId) {
        error(ws, 'already_in_room', 'Cannot join your own room as opponent');
        return;
      }
      const result = rooms.join(msg.roomId, msg.deck);
      if (!result.ok) {
        error(ws, result.code, result.message);
        return;
      }
      const room = result.value;
      bindSeat(ws, room.id, 1, conn.userId!, conn.username!);

      const meta = roomMeta.get(room.id)!;
      const host = meta.seats[0];
      const deck0 = room.decks[0]!;
      const deck1 = room.decks[1]!;
      const hostName = meta.usernames[0] ?? 'Host';
      const joinName = meta.usernames[1] ?? 'Guest';

      if (host && host.readyState === host.OPEN) {
        send(host, {
          t: 'joined',
          roomId: room.id,
          you: 0,
          opponentFaction: deck1.faction,
          opponentUsername: joinName,
        });
      }
      send(ws, {
        t: 'joined',
        roomId: room.id,
        you: 1,
        opponentFaction: deck0.faction,
        opponentUsername: hostName,
      });
      broadcastState(room.id);
      return;
    }

    case 'action': {
      const conn = connByWs.get(ws);
      if (!conn || conn.seat === null || !conn.roomId) {
        error(ws, 'not_in_room', 'Not in a room');
        return;
      }
      const action = { ...msg.action, player: conn.seat };
      const result = rooms.act(conn.roomId, conn.seat, action);
      if (!result.ok) {
        error(ws, result.code, result.message);
        return;
      }
      const actMeta = roomMeta.get(conn.roomId);
      if (actMeta) actMeta.lastActivity = Date.now();
      broadcastState(conn.roomId);
      maybeRecordNaturalFinish(conn.roomId);
      return;
    }

    case 'rematch': {
      const conn = connByWs.get(ws);
      if (!conn || conn.seat === null || !conn.roomId) {
        error(ws, 'not_in_room', 'Not in a room');
        return;
      }
      const roomId = conn.roomId;
      const room = rooms.get(roomId);
      const meta = roomMeta.get(roomId);
      if (!room?.state || !meta || room.state.phase !== 'finished') {
        error(ws, 'bad_message', 'No finished game to rematch');
        return;
      }
      meta.lastActivity = Date.now();
      if (meta.rematchVotes[conn.seat]) return; // duplicate offer
      meta.rematchVotes[conn.seat] = true;

      const other = meta.seats[1 - conn.seat];
      if (!meta.rematchVotes[1 - conn.seat]) {
        if (other && other.readyState === other.OPEN) send(other, { t: 'rematch_requested' });
        return;
      }

      // Both agreed → fresh game, same decks, new seed.
      const result = rooms.reset(roomId);
      if (!result.ok) {
        error(ws, result.code, result.message);
        return;
      }
      meta.matchRecorded = false;
      meta.rematchVotes = [false, false];
      for (const seat of [0, 1] as const) {
        const s = meta.seats[seat];
        if (s && s.readyState === s.OPEN) send(s, { t: 'rematch_started' });
      }
      broadcastState(roomId);
      return;
    }

    case 'leave': {
      clearSeat(ws);
      return;
    }

    case 'rejoin': {
      const conn = requireAuth(ws);
      if (!conn) return;
      if (conn.seat !== null) {
        error(ws, 'already_in_room', 'Already in a room');
        return;
      }
      rejoinSeat(ws, conn, msg.roomId);
      return;
    }

    default:
      error(ws, 'bad_message', 'Unknown message type');
  }
}

// ---- HTTP helpers ----------------------------------------------------------

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.md': 'text/markdown; charset=utf-8',
};

function json(res: http.ServerResponse, status: number, body: unknown): void {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
  });
  res.end(data);
}

function readBody(req: http.IncomingMessage, limit = 64_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function clientIp(req: http.IncomingMessage): string {
  return req.socket.remoteAddress ?? 'unknown';
}

function bearer(req: http.IncomingMessage): string | null {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  return h.slice(7).trim() || null;
}

async function handleApi(req: http.IncomingMessage, res: http.ServerResponse, url: URL): Promise<boolean> {
  if (!url.pathname.startsWith('/api/')) return false;

  // CORS not needed for same-origin; allow simple preflight if any
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type, authorization',
    });
    res.end();
    return true;
  }

  try {
    if (url.pathname === '/api/register' && req.method === 'POST') {
      if (!rateLimit(clientIp(req))) {
        json(res, 429, { error: 'rate_limited', message: 'Too many requests' });
        return true;
      }
      const body = JSON.parse(await readBody(req)) as { username?: string; password?: string };
      const result = register(db, body.username ?? '', body.password ?? '');
      if (!result.ok) {
        json(res, result.code === 'username_taken' ? 409 : 400, {
          error: result.code,
          message: result.message,
        });
        return true;
      }
      json(res, 201, { token: result.token, user: result.user });
      return true;
    }

    if (url.pathname === '/api/login' && req.method === 'POST') {
      if (!rateLimit(clientIp(req))) {
        json(res, 429, { error: 'rate_limited', message: 'Too many requests' });
        return true;
      }
      const body = JSON.parse(await readBody(req)) as { username?: string; password?: string };
      const result = login(db, body.username ?? '', body.password ?? '');
      if (!result.ok) {
        json(res, 401, { error: result.code, message: result.message });
        return true;
      }
      json(res, 200, { token: result.token, user: result.user });
      return true;
    }

    if (url.pathname === '/api/logout' && req.method === 'POST') {
      const token = bearer(req);
      if (token) logout(db, token);
      json(res, 200, { ok: true });
      return true;
    }

    if (url.pathname === '/api/me' && req.method === 'GET') {
      const token = bearer(req);
      if (!token) {
        json(res, 401, { error: 'auth_invalid', message: 'Missing token' });
        return true;
      }
      const user = authByToken(db, token);
      if (!user) {
        json(res, 401, { error: 'auth_invalid', message: 'Invalid or expired session' });
        return true;
      }
      json(res, 200, { user });
      return true;
    }

    if (url.pathname === '/api/leaderboard' && req.method === 'GET') {
      const limit = Number(url.searchParams.get('limit') ?? 50);
      json(res, 200, { entries: leaderboard(db, Number.isFinite(limit) ? limit : 50) });
      return true;
    }

    json(res, 404, { error: 'not_found', message: 'Unknown API route' });
    return true;
  } catch (e) {
    console.error('API error', e);
    json(res, 400, { error: 'bad_request', message: e instanceof Error ? e.message : 'Bad request' });
    return true;
  }
}

function trySendFile(
  filePath: string,
  res: http.ServerResponse,
  cache: 'immutable' | 'day' | 'none' = 'none',
): boolean {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return false;
  const ext = path.extname(filePath).toLowerCase();
  const headers: Record<string, string> = {
    'content-type': MIME[ext] ?? 'application/octet-stream',
  };
  if (cache === 'immutable') headers['cache-control'] = 'public, max-age=31536000, immutable';
  else if (cache === 'day') headers['cache-control'] = 'public, max-age=86400';
  else headers['cache-control'] = 'no-cache';
  res.writeHead(200, headers);
  fs.createReadStream(filePath).pipe(res);
  return true;
}

function serveStatic(req: http.IncomingMessage, res: http.ServerResponse): void {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  let rel = decodeURIComponent(url.pathname);

  // Card art only (gitignored downloads under assets/cards/).
  // Do NOT claim all of /assets/* — Vite puts JS/CSS at /assets/index-*.js in dist.
  if (rel.startsWith('/assets/cards/')) {
    const assetRel = rel.slice('/assets/'.length); // "cards/..."
    const filePath = path.normalize(path.join(ASSETS_DIR, assetRel));
    if (!filePath.startsWith(path.join(ASSETS_DIR, 'cards'))) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    if (trySendFile(filePath, res, 'day')) return;
    res.writeHead(404).end('Not found');
    return;
  }

  if (!fs.existsSync(STATIC_DIR)) {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(
      `easy-gwent multiplayer server on :${PORT}\n` +
        `WebSocket: ws://<host>:${PORT}\n` +
        `No client build found at ${STATIC_DIR}\n`,
    );
    return;
  }

  if (rel === '/') rel = '/index.html';
  const filePath = path.normalize(path.join(STATIC_DIR, rel));
  if (!filePath.startsWith(STATIC_DIR)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  if (trySendFile(filePath, res, rel.startsWith('/assets/') ? 'immutable' : 'none')) return;
  if (trySendFile(path.join(STATIC_DIR, 'index.html'), res)) return;
  res.writeHead(404).end('Not found');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  if (await handleApi(req, res, url)) return;
  if (req.method === 'GET' || req.method === 'HEAD') {
    serveStatic(req, res);
    return;
  }
  res.writeHead(405).end('Method not allowed');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  connByWs.set(ws, { ws, userId: null, username: null, seat: null, roomId: null });

  ws.on('message', (data) => {
    handleMessage(ws, typeof data === 'string' ? data : data.toString('utf8'));
  });

  ws.on('close', () => {
    handleDisconnect(ws);
    connByWs.delete(ws);
  });

  ws.on('error', () => {
    handleDisconnect(ws);
    connByWs.delete(ws);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`easy-gwent server listening on http://${HOST}:${PORT}`);
  console.log(`  static: ${fs.existsSync(STATIC_DIR) ? STATIC_DIR : '(none)'}`);
  console.log(`  assets: ${fs.existsSync(ASSETS_DIR) ? ASSETS_DIR : '(none)'}`);
  console.log(`  db: ${DB_PATH}`);
});
