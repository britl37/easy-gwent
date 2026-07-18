# Easy Gwent — Ops Runbook

Production host serves https://easygwent.online via Caddy → the `easy-gwent`
systemd service (Node server on `127.0.0.1:8787`, static client from
`packages/client/dist`, WebSocket MP + SQLite persistence).

## Deploy

```sh
cd ~/easy-gwent
git pull                                   # if deploying from a fresh clone
npx vitest run && npx tsc --noEmit         # 56 tests + typecheck must pass
npm run build --workspace=@gwent/client    # vite build → packages/client/dist
sudo systemctl restart easy-gwent
curl -sf http://127.0.0.1:8787/ >/dev/null && echo OK
```

Note: a restart drops live WS connections. Clients auto-reconnect within the
grace window (`RECONNECT_GRACE_MS`), but avoid restarting during active games
when possible.

## Services

| Unit                 | What                                      |
| -------------------- | ----------------------------------------- |
| `easy-gwent.service` | Game server (user `brit`, sandboxed)      |
| `gwent-backup.timer` | Daily DB backup, 04:30 EDT (+0–10 min)    |
| `caddy`              | TLS + reverse proxy for easygwent.online  |

Logs: `journalctl -u easy-gwent -f` (or `-u gwent-backup.service`).

## Database

- Live DB: `packages/server/data/gwent.sqlite` (WAL mode; `-shm`/`-wal`
  sidecars are normal).
- Backups: `~/gwent-backups/gwent-<timestamp>.sqlite.gz`, newest 14 kept.
- Manual backup any time (WAL-safe while the server runs):

  ```sh
  node packages/server/scripts/backup-db.mjs
  ```

### Restore

```sh
sudo systemctl stop easy-gwent
cd ~/easy-gwent/packages/server/data
mv gwent.sqlite gwent.sqlite.bad 2>/dev/null; rm -f gwent.sqlite-shm gwent.sqlite-wal
gunzip -c ~/gwent-backups/gwent-<timestamp>.sqlite.gz > gwent.sqlite
sudo systemctl start easy-gwent
```

Backups are integrity-checked (`PRAGMA integrity_check`) at creation time.

## Env vars (easy-gwent.service)

| Var                  | Default        | Meaning                                |
| -------------------- | -------------- | -------------------------------------- |
| `GWENT_DB`           | `data/gwent.sqlite` | SQLite path                       |
| `RECONNECT_GRACE_MS` | `60000`        | MP disconnect grace before forfeit     |
| `GWENT_ROOM_WAIT_MS` | (see code)     | Idle room GC wait                      |
| `GWENT_POSTGAME_MS`  | (see code)     | Post-game room lifetime                |

## TLS / domain

Caddy manages certs automatically (`certbot.timer` is unrelated/system-level).
Config: `/etc/caddy/Caddyfile`. Reload with `sudo systemctl reload caddy`.
