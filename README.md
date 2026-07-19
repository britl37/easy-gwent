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

## Current interface

- Artwork-first deck editor with card rules text, name/effect search, filters,
  visual leader selection, deck validation, and a tabbed mobile workspace.
- Local games against easy, medium, or hard AI.
- Online rooms with reconnect/resume, rematches, accounts, stats, and a
  leaderboard.
- Turn/pass banners and synthesized sound effects, including distinct round
  and match win cues. Sound and card art can be disabled in Settings.

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

## Documentation

- [`docs/ROADMAP.md`](docs/ROADMAP.md): completed work and remaining release
  verification.
- [`docs/RUNBOOK.md`](docs/RUNBOOK.md): deployment, services, backup, restore,
  and production verification procedures.
- [`AGENTS.md`](AGENTS.md): repository conventions for contributors and coding
  agents.
