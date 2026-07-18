/**
 * OPTIONAL maintenance tool — not part of `npm run build`.
 *
 * Regenerates packages/data/src/card-text.json from Witcher wiki gwent pages
 * (ability + flavor text only). Commit the JSON when you add cards or refresh copy.
 * Card art images stay build-time only (copyright); text is held in the repo.
 *
 * Usage: npm run build-card-text
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_CARDS } from '../packages/data/src/index.ts';

const UA = 'easy-gwent/0.1 (https://easygwent.online; card text maintainer)';
const API = 'https://witcher.fandom.com/api.php';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../packages/data/src/card-text.json');

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function stripWiki(s: string): string {
  return s
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/'{2,}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCandidates(name: string): string[] {
  const base = name.replace(/ /g, '_');
  return [`${base}_(gwent_card)`, base];
}

async function fetchPage(title: string): Promise<string | null> {
  const q = new URLSearchParams({
    action: 'query',
    prop: 'revisions',
    rvprop: 'content',
    titles: title,
    format: 'json',
  });
  const res = await fetch(`${API}?${q}`, { headers: { 'user-agent': UA } });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    query: { pages: Record<string, { missing?: string; revisions?: Array<{ '*': string }> }> };
  };
  const page = Object.values(data.query.pages)[0];
  if (!page || page.missing !== undefined || !page.revisions?.[0]) return null;
  return page.revisions[0]['*'];
}

function field(wikitext: string, name: string): string | null {
  const m = wikitext.match(new RegExp(`\\|${name}\\s*=\\s*(.+)`));
  if (!m) return null;
  const line = m[1]!.split('\n')[0]!;
  const cleaned = stripWiki(line);
  return cleaned || null;
}

export type StoredCardText = { ability?: string; flavor?: string };

async function main() {
  const out: Record<string, StoredCardText> = fs.existsSync(OUT)
    ? (JSON.parse(fs.readFileSync(OUT, 'utf8')) as Record<string, StoredCardText>)
    : {};

  let ok = 0;
  let miss = 0;

  for (let i = 0; i < ALL_CARDS.length; i++) {
    const card = ALL_CARDS[i]!;
    if (out[card.id]?.ability || out[card.id]?.flavor) {
      ok++;
      continue;
    }
    process.stdout.write(`[${i + 1}/${ALL_CARDS.length}] ${card.id}… `);
    let found: StoredCardText | null = null;
    for (const title of titleCandidates(card.name)) {
      try {
        const wt = await fetchPage(title);
        if (!wt) continue;
        const ability = field(wt, 'spec_ability');
        const flavor = field(wt, 'caption');
        if (ability || flavor) {
          found = {};
          if (ability) found.ability = ability;
          if (flavor) found.flavor = flavor;
          break;
        }
      } catch {
        /* try next title */
      }
      await sleep(150);
    }
    if (found) {
      out[card.id] = found;
      ok++;
      console.log('OK');
    } else {
      miss++;
      console.log('MISS (will use generated fallback)');
    }
    await sleep(250);
    if (i % 20 === 0) fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  }

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`\nWrote ${OUT}`);
  console.log(`Entries: ${Object.keys(out).length}. Missing this run: ${miss}.`);
  console.log('Commit this file. Do not run this during npm run build.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
