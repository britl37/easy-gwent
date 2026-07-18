import type { ClientMsg, GameState, ServerMsg } from '@gwent/engine';

export type ServerHandler = (msg: ServerMsg) => void;

function defaultWsUrl(): string {
  const env = (import.meta as ImportMeta & { env?: { VITE_WS_URL?: string } }).env?.VITE_WS_URL;
  if (env) return env;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}`;
}

/**
 * Thin WebSocket wrapper with auto-reopen.
 * When the socket re-opens after an unintended drop, `onReconnect` fires so the
 * owner can re-authenticate and (mid-game) send `rejoin` — the server holds a
 * disconnected seat for a grace period before forfeiting.
 * Last `state` is buffered so the game screen does not miss the first snapshot during navigation.
 */
export class GwentSocket {
  private ws: WebSocket | null = null;
  private handler: ServerHandler | null = null;
  private closedByUser = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private lastState: GameState | null = null;
  private everOpened = false;
  /** Called after the socket re-opens following an unintended disconnect. */
  onReconnect: (() => void) | null = null;
  readonly url: string;

  constructor(url: string = defaultWsUrl()) {
    this.url = url;
  }

  /** Attach/replace message handler. Replays the last state if any. */
  connect(handler: ServerHandler): void {
    this.handler = handler;
    this.closedByUser = false;
    if (this.lastState) handler({ t: 'state', state: this.lastState });
    this.open();
  }

  private open(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      const isReconnect = this.everOpened;
      this.everOpened = true;
      if (isReconnect) this.onReconnect?.();
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as ServerMsg;
        if (msg.t === 'state') this.lastState = msg.state;
        this.handler?.(msg);
      } catch (e) {
        console.warn('Bad server message', e);
      }
    };
    ws.onclose = () => {
      this.ws = null;
      if (!this.closedByUser) {
        this.reconnectTimer = setTimeout(() => this.open(), 1500);
      }
    };
    ws.onerror = () => {
      /* onclose will fire */
    };
  }

  send(msg: ClientMsg): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('Socket not open; dropping', msg.t);
      return;
    }
    this.ws.send(JSON.stringify(msg));
  }

  get ready(): boolean {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  close(): void {
    this.closedByUser = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.onReconnect = null;
    this.ws?.close();
    this.ws = null;
    this.lastState = null;
  }
}
