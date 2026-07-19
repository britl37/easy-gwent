/**
 * Resolve Witcher wiki file URLs for every card and write scripts/asset-manifest.json.
 * Only URLs are committed — never the image binaries.
 *
 * Usage: npx tsx scripts/build-asset-manifest.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_CARDS } from '../packages/data/src/index.ts';

const UA = 'easy-gwent/0.1 (https://easygwent.online; asset manifest builder; contact via site)';
const API = 'https://witcher.fandom.com/api.php';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'asset-manifest.json');

interface ImageInfo {
  url: string;
}

/** Wiki filenames that cannot be derived reliably from the displayed card name. */
const FILE_TITLE_OVERRIDES: Partial<Record<string, string>> = {
  ne_gaunter_odimm: 'File:Tw3 gwent card face Gaunt ODimm.png',
};

async function api(params: Record<string, string>): Promise<unknown> {
  const q = new URLSearchParams({ format: 'json', ...params });
  const res = await fetch(`${API}?${q}`, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Name variants to try as File:Tw3 gwent card face X.png */
function nameCandidates(name: string): string[] {
  const clean = name
    .replace(/[''ʼ]/g, '')
    .replace(/[""]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const noApos = name.replace(/[''ʼ]/g, '').replace(/\s+/g, ' ').trim();
  const beforeColon = clean.split(':')[0]!.trim();
  const words = clean.split(/\s+/);
  const out = new Set<string>([
    clean,
    noApos,
    clean.replace(/&/g, 'and'),
    beforeColon,
    // Common wiki short names
    words[0]!,
    words.slice(0, 2).join(' '),
    words.slice(0, 3).join(' '),
  ]);
  // "Emiel Regis Rohellec Terzieff" → "Emiel Regis"
  if (words.length > 2 && words[0] === 'Emiel') out.add('Emiel Regis');
  // "Zoltan Chivay" → "Zoltan"
  if (words[0] === 'Zoltan') out.add('Zoltan');
  // "Triss Merigold" → "Triss"
  if (words[0] === 'Triss') out.add('Triss');
  // "Cirilla Fiona Elen Riannon" → "Ciri"
  if (clean.startsWith('Cirilla')) out.add('Ciri');
  // "Geralt of Rivia" stays; "Mysterious Elf" ok
  if (clean.includes('Avallac')) {
    out.add("Avallac'h");
    out.add('Avallach');
  }
  if (clean.startsWith('Gaunter')) out.add("Gaunter O'Dimm");
  return [...out].filter(Boolean);
}

async function imageUrlForTitle(fileTitle: string): Promise<string | null> {
  const data = (await api({
    action: 'query',
    titles: fileTitle.startsWith('File:') ? fileTitle : `File:${fileTitle}`,
    prop: 'imageinfo',
    iiprop: 'url',
  })) as {
    query: { pages: Record<string, { missing?: string; imageinfo?: ImageInfo[] }> };
  };
  const page = Object.values(data.query.pages)[0];
  if (!page || page.missing !== undefined) return null;
  return page.imageinfo?.[0]?.url ?? null;
}

async function searchFace(query: string): Promise<string | null> {
  const data = (await api({
    action: 'query',
    list: 'search',
    srsearch: `Tw3 gwent card face ${query}`,
    srnamespace: '6',
    srlimit: '10',
  })) as { query: { search: Array<{ title: string }> } };

  const hits = data.query.search ?? [];
  const lower = query.toLowerCase().replace(/['']/g, '');
  const ranked = [...hits].sort((a, b) => {
    const score = (t: string) => {
      const x = t.toLowerCase();
      let s = 0;
      if (x.includes('tw3 gwent card face')) s += 10;
      if (x.includes(' alt')) s -= 3; // prefer primary face
      if (x.includes(lower)) s += 5;
      if (x.endsWith('.png')) s += 1;
      return s;
    };
    return score(b.title) - score(a.title);
  });

  for (const hit of ranked) {
    const url = await imageUrlForTitle(hit.title);
    if (url) return url;
    await sleep(150);
  }
  return null;
}

async function resolveCard(id: string, name: string): Promise<string | null> {
  const override = FILE_TITLE_OVERRIDES[id];
  if (override) return imageUrlForTitle(override);

  const cands = nameCandidates(name);
  for (const cand of cands) {
    const title = `File:Tw3 gwent card face ${cand}.png`;
    const url = await imageUrlForTitle(title);
    if (url) return url;
    await sleep(120);
  }
  // Search with progressive query shortening
  for (const cand of cands) {
    const url = await searchFace(cand);
    if (url) return url;
    await sleep(200);
  }
  return null;
}

async function main() {
  const manifest: Record<string, string> = {};
  let ok = 0;
  let fail = 0;

  // Optional: resume existing
  if (fs.existsSync(OUT)) {
    try {
      Object.assign(manifest, JSON.parse(fs.readFileSync(OUT, 'utf8')) as Record<string, string>);
      console.log(`Loaded ${Object.keys(manifest).length} existing entries`);
    } catch {
      /* ignore */
    }
  }

  for (let i = 0; i < ALL_CARDS.length; i++) {
    const card = ALL_CARDS[i]!;
    if (manifest[card.id]) {
      ok++;
      continue;
    }
    process.stdout.write(`[${i + 1}/${ALL_CARDS.length}] ${card.id} (${card.name})… `);
    try {
      const url = await resolveCard(card.id, card.name);
      if (url) {
        manifest[card.id] = url;
        ok++;
        console.log('OK');
      } else {
        fail++;
        console.log('MISSING');
      }
    } catch (e) {
      fail++;
      console.log('ERR', e instanceof Error ? e.message : e);
    }
    // throttle wiki
    await sleep(350);
    // checkpoint every 15 cards
    if (i % 15 === 0) {
      fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n');
    }
  }

  fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\nWrote ${OUT}`);
  console.log(`Resolved: ${ok}, missing: ${fail}, total cards: ${ALL_CARDS.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
