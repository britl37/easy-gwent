# Easy Gwent

Browser clone of the Witcher 3 Gwent mini-game: local AI, deck editor, and
online multiplayer with accounts + leaderboard.

**Live:** https://easygwent.online

## Monorepo

| Package | Role |
|---------|------|
| `@gwent/data` | Card definitions + **committed ability/flavor text** |
| `@gwent/engine` | Pure game rules + multiplayer protocol types |
| `@gwent/ai` | Easy / medium / hard heuristics |
| `@gwent/client` | React UI (Vite) |
| `@gwent/server` | HTTP + WebSocket + SQLite (auth, rooms, stats) |

## Card text vs card art

| | In git? | Notes |
|--|---------|--------|
| **Ability / flavor text** | **Yes** — `packages/data/src/card-text.json` | Plain text. Refresh rarely with `npm run build-card-text` (not part of build). |
| **Card images** | **No** | Fetched at **build time** via `scripts/asset-manifest.json` → `assets/cards/` (gitignored). |

```bash
npm run build            # fetch missing images + build packages
npm run build:code       # packages only (skip image download)
npm run fetch-assets     # images only
npm run build-manifest   # rare: regenerate image URL map
npm run build-card-text  # rare: refresh text JSON from wiki, then commit it
```

Missing images → SVG placeholders. Missing text → engine-generated ability rules.

## Develop

```bash
npm install
npm test
npm run dev:server   # :8787
npm run dev          # Vite :5173
```

## Deploy (VPS)

```bash
git pull
npm install
npm run build
sudo systemctl restart easy-gwent
```

App binds `127.0.0.1:8787`; Caddy terminates TLS for `easygwent.online`.
