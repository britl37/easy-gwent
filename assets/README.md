# Card assets

Downloaded card art is **not** redistributed with this repository.
Images are copyright CD Projekt Red / their respective owners.

## Setup

```bash
# Resolve wiki URLs (once; result is committed as scripts/asset-manifest.json)
npx tsx scripts/build-asset-manifest.ts

# Download images into assets/cards/ (gitignored)
npm run fetch-assets
```

The app serves `/assets/cards/{id}.{webp,png,jpg}` when present and falls back to generated SVG placeholders otherwise.
