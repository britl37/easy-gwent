# Card assets (build-time only — never in git)

Card art is **copyright CD Projekt Red** (and related rights holders). This repository
**must not** contain those image binaries.

## What *is* in git

| Path | Purpose |
|------|---------|
| `scripts/asset-manifest.json` | Map of `cardId → public wiki image URL` (links only) |
| `scripts/build-asset-manifest.ts` | Regenerates the URL map via the Witcher wiki API |
| `scripts/fetch-assets.ts` | Downloads images into `assets/cards/` at **build/deploy** time |
| `assets/cards/.gitkeep` | Keeps the empty directory in git |

## What is *not* in git

- `assets/cards/*.{webp,png,jpg}` — downloaded on the machine that builds/runs the app  
  (see `.gitignore`)

## Build pipeline

```bash
# Production / VPS deploy (default `npm run build`):
# 1) fetch images from wiki URLs in the committed manifest
# 2) build client (and other packages)
npm run build

# Code-only build (no network fetch), e.g. quick local UI work:
npm run build:code

# Refresh URL map after adding cards (rare; commit the updated JSON):
npm run build-manifest
```

`fetch-assets` is **resumable**: existing files are skipped, so rebuilds only pull missing art.

## Runtime

The server serves `/assets/cards/{id}.{webp,png,jpg}` from disk. If a file is missing,
the client uses generated SVG placeholders — the game never requires art in the repo.
