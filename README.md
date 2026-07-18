# Easy Gwent

Browser clone of the Witcher 3 Gwent mini-game: local AI, deck editor, and
online multiplayer with accounts + leaderboard.

**Live:** https://easygwent.online

## Monorepo

| Package | Role |
|---------|------|
| `@gwent/data` | Card definitions |
| `@gwent/engine` | Pure game rules + multiplayer protocol types |
| `@gwent/ai` | Easy / medium / hard heuristics |
| `@gwent/client` | React UI (Vite) |
| `@gwent/server` | HTTP + WebSocket + SQLite (auth, rooms, stats) |

## Card art (no copyrighted binaries in git)

Art is fetched **at build time** from Witcher wiki URLs listed in
`scripts/asset-manifest.json`. Only that URL map is committed.

```bash
npm run build          # fetch-assets (wiki → assets/cards/) then build packages
npm run build:code     # packages only, skip download
npm run fetch-assets   # download only (resumable)
npm run build-manifest # regenerate URL map after adding cards (commit the JSON)
```

`assets/cards/*` is gitignored. The UI falls back to SVG placeholders if a file
is missing.

## Develop

```bash
npm install
npm test
npm run dev:server   # terminal 1 — :8787
npm run dev          # terminal 2 — Vite :5173 (proxies /api + WS)
```

Optional: `npm run fetch-assets` once so local play shows real card faces.

## Deploy (VPS)

```bash
git pull
npm install
npm run build          # pulls art from wiki, then vite build
sudo systemctl restart easy-gwent
```

App binds `127.0.0.1:8787`; Caddy terminates TLS for `easygwent.online`.
Do not commit anything under `assets/cards/`.
