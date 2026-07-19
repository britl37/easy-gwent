/**
 * Cache the Witcher Wiki's complete The Witcher 3 Gwent category tree.
 *
 * Raw wikitext is saved for fast local search and faithful rule auditing.
 * The cache is intentionally gitignored: it is third-party CC BY-SA content,
 * not application source. Run with `npm run refresh-wiki-cache`.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://witcher.fandom.com/api.php';
const ROOT_CATEGORY = 'Category:The Witcher 3 gwent';
const UA = 'easy-gwent/0.1 (https://easygwent.online; offline Witcher 3 Gwent reference cache)';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../.wiki-cache/witcher3-gwent');
const PAGES_OUT = path.join(OUT, 'pages');

interface CategoryMember {
  pageid: number;
  ns: number;
  title: string;
}

interface CachedPage {
  pageId: number;
  title: string;
  sourceUrl: string;
  revisionId: number;
  revisionTimestamp: string;
  file: string;
}

interface RevisionPage {
  pageid: number;
  ns: number;
  title: string;
  missing?: boolean;
  revisions?: Array<{
    revid: number;
    timestamp: string;
    slots: { main: { content?: string } };
  }>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function api(params: Record<string, string>): Promise<Record<string, unknown>> {
  const query = new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(`${API}?${query}`, { headers: { 'user-agent': UA } });
      if (!response.ok) throw new Error(`Witcher Wiki API returned ${response.status}`);
      return await response.json() as Record<string, unknown>;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(attempt * 750);
    }
  }
  throw lastError;
}

async function categoryMembers(category: string): Promise<CategoryMember[]> {
  const members: CategoryMember[] = [];
  let continuation: string | undefined;
  do {
    const data = await api({
      action: 'query',
      list: 'categorymembers',
      cmtitle: category,
      cmnamespace: '0|14',
      cmtype: 'page|subcat',
      cmlimit: 'max',
      ...(continuation ? { cmcontinue: continuation } : {}),
    }) as {
      query?: { categorymembers?: CategoryMember[] };
      continue?: { cmcontinue?: string };
    };
    members.push(...(data.query?.categorymembers ?? []));
    continuation = data.continue?.cmcontinue;
  } while (continuation);
  return members;
}

async function discoverPages(): Promise<{ pages: Map<number, CategoryMember>; categories: string[] }> {
  const pages = new Map<number, CategoryMember>();
  const seenCategories = new Set<string>();
  const queue = [ROOT_CATEGORY];

  while (queue.length) {
    const category = queue.shift()!;
    if (seenCategories.has(category)) continue;
    seenCategories.add(category);
    process.stdout.write(`Discovering ${category}... `);
    const members = await categoryMembers(category);
    console.log(`${members.length} members`);
    for (const member of members) {
      if (member.ns === 14) {
        if (!seenCategories.has(member.title)) queue.push(member.title);
      } else if (member.ns === 0) {
        pages.set(member.pageid, member);
      }
    }
    await sleep(150);
  }

  return { pages, categories: [...seenCategories].sort() };
}

function fileName(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90) || 'page';
  const suffix = createHash('sha1').update(title).digest('hex').slice(0, 8);
  return `${slug}-${suffix}.wiki`;
}

function sourceUrl(title: string): string {
  return `https://witcher.fandom.com/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
}

async function fetchBatch(members: CategoryMember[]): Promise<CachedPage[]> {
  const data = await api({
    action: 'query',
    prop: 'revisions',
    rvprop: 'ids|timestamp|content',
    rvslots: 'main',
    titles: members.map((member) => member.title).join('|'),
  }) as { query?: { pages?: RevisionPage[] } };

  const cached: CachedPage[] = [];
  for (const page of data.query?.pages ?? []) {
    const revision = page.revisions?.[0];
    const content = revision?.slots.main.content;
    if (page.missing || !revision || content === undefined) {
      console.warn(`Skipping unavailable page: ${page.title}`);
      continue;
    }
    const file = fileName(page.title);
    fs.writeFileSync(path.join(PAGES_OUT, file), content.endsWith('\n') ? content : `${content}\n`);
    cached.push({
      pageId: page.pageid,
      title: page.title,
      sourceUrl: sourceUrl(page.title),
      revisionId: revision.revid,
      revisionTimestamp: revision.timestamp,
      file: `pages/${file}`,
    });
  }
  return cached;
}

async function main(): Promise<void> {
  fs.mkdirSync(PAGES_OUT, { recursive: true });
  const discovered = await discoverPages();
  const members = [...discovered.pages.values()].sort((a, b) => a.title.localeCompare(b.title));
  const cached: CachedPage[] = [];

  for (let i = 0; i < members.length; i += 25) {
    const batch = members.slice(i, i + 25);
    process.stdout.write(`Fetching pages ${i + 1}-${Math.min(i + batch.length, members.length)} of ${members.length}... `);
    const result = await fetchBatch(batch);
    cached.push(...result);
    console.log(`${result.length} saved`);
    await sleep(250);
  }

  cached.sort((a, b) => a.title.localeCompare(b.title));
  const fetchedAt = new Date().toISOString();
  const index = {
    source: 'Witcher Wiki (Fandom)',
    license: 'CC BY-SA; see https://www.fandom.com/licensing',
    scope: ROOT_CATEGORY,
    fetchedAt,
    categoryCount: discovered.categories.length,
    pageCount: cached.length,
    categories: discovered.categories,
    pages: cached,
  };
  fs.writeFileSync(path.join(OUT, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
  fs.writeFileSync(
    path.join(OUT, 'README.md'),
    `# Witcher 3 Gwent Wiki Cache\n\n` +
      `Fetched: ${fetchedAt}\n\n` +
      `Scope: [${ROOT_CATEGORY}](${sourceUrl(ROOT_CATEGORY)}) and its subcategories. ` +
      `This intentionally excludes standalone GWENT categories.\n\n` +
      `Pages are raw wiki revision text for local search and rule auditing. ` +
      `See \`index.json\` for source URLs and exact revision IDs. Content is from ` +
      `[Witcher Wiki](https://witcher.fandom.com/) under CC BY-SA.\n\n` +
      `Refresh from the repository root with \`npm run refresh-wiki-cache\`.\n`,
  );

  console.log(`\nCached ${cached.length} pages from ${discovered.categories.length} categories in ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
