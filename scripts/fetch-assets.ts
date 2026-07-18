/**
 * Build-time download of card art from the Witcher wiki (URLs in asset-manifest.json).
 *
 * Copyrighted image binaries are written only to the local disk (assets/cards/) and
 * must never be committed. Invoked automatically by `npm run build`.
 *
 * Env:
 *   SKIP_FETCH_ASSETS=1  — no-op (used for offline code-only builds)
 *
 * Usage: npm run fetch-assets
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const UA = 'easy-gwent/0.1 (https://easygwent.online; asset fetch; contact via site)';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.join(__dirname, 'asset-manifest.json');
const OUT_DIR = path.join(ROOT, 'assets', 'cards');

const DELAY_MS = 1000;
const RETRIES = 3;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function extFor(buf: Buffer, url: string): string {
  // WebP: RIFF....WEBP
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return '.webp';
  }
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return '.png';
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg';
  // fall back to URL path
  const u = url.toLowerCase();
  if (u.includes('.webp')) return '.webp';
  if (u.includes('.jpg') || u.includes('.jpeg')) return '.jpg';
  return '.png';
}

function alreadyHave(id: string): boolean {
  for (const ext of ['.webp', '.png', '.jpg']) {
    if (fs.existsSync(path.join(OUT_DIR, id + ext))) return true;
  }
  return false;
}

async function download(url: string): Promise<Buffer> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': UA, accept: 'image/*,*/*' },
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ab = await res.arrayBuffer();
      const buf = Buffer.from(ab);
      if (buf.length < 100) throw new Error('file too small');
      // reject HTML error pages
      const head = buf.subarray(0, 64).toString('utf8').toLowerCase();
      if (head.includes('<!doctype') || head.includes('<html')) throw new Error('got HTML');
      return buf;
    } catch (e) {
      lastErr = e;
      await sleep(500 * attempt);
    }
  }
  throw lastErr;
}

async function main() {
  if (process.env.SKIP_FETCH_ASSETS === '1' || process.env.SKIP_FETCH_ASSETS === 'true') {
    console.log('SKIP_FETCH_ASSETS set — not downloading card art');
    return;
  }
  if (!fs.existsSync(MANIFEST)) {
    console.error(`Missing ${MANIFEST}. Run: npm run build-manifest`);
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as Record<string, string>;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  // licensing note for downloaders
  const readme = path.join(ROOT, 'assets', 'README.md');
  if (!fs.existsSync(readme)) {
    fs.writeFileSync(
      readme,
      `# Card assets\n\n` +
        `Downloaded card art is **not** redistributed with this repository.\n` +
        `Images are copyright CD Projekt Red / their respective owners.\n` +
        `Run \`npm run fetch-assets\` on your machine or VPS after generating the manifest.\n` +
        `The app falls back to generated placeholders when a file is missing.\n`,
    );
  }

  const entries = Object.entries(manifest);
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  const failures: string[] = [];

  for (let i = 0; i < entries.length; i++) {
    const [id, url] = entries[i]!;
    if (alreadyHave(id)) {
      skipped++;
      continue;
    }
    process.stdout.write(`[${i + 1}/${entries.length}] ${id}… `);
    try {
      const buf = await download(url);
      const ext = extFor(buf, url);
      fs.writeFileSync(path.join(OUT_DIR, id + ext), buf);
      downloaded++;
      console.log(`OK (${ext} ${buf.length}b)`);
    } catch (e) {
      failed++;
      failures.push(id);
      console.log('FAIL', e instanceof Error ? e.message : e);
    }
    await sleep(DELAY_MS);
  }

  console.log(`\nDone. downloaded=${downloaded} skipped=${skipped} failed=${failed}`);
  if (failures.length) console.log('Failed ids:', failures.join(', '));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
