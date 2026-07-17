import { byId, type CardDef, type Faction } from '@gwent/data';

const FACTION_COLORS: Record<Faction, [string, string]> = {
  neutral: ['#4a4033', '#2b2519'],
  northern_realms: ['#274b6d', '#132638'],
  nilfgaard: ['#3a3a3a', '#141414'],
  scoiatael: ['#3d5a2b', '#1c2b12'],
  monsters: ['#5c1f1f', '#2b0d0d'],
  skellige: ['#3f2b5c', '#1c1230'],
};

const cache = new Map<string, string>();

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Generated SVG stand-in used when /assets/cards/{id}.png is missing. */
export function placeholderArt(cardId: string): string {
  const hit = cache.get(cardId);
  if (hit) return hit;

  let def: CardDef | null = null;
  try {
    def = byId(cardId);
  } catch {
    /* unknown id: generic back */
  }
  const [top, bottom] = FACTION_COLORS[def?.faction ?? 'neutral'];
  const name = def?.name ?? '?';
  const strength = def?.type === 'unit' ? String(def.strength ?? 0) : (def?.special ?? 'L');
  const hero = def?.hero ?? false;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="284" viewBox="0 0 200 284">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/>` +
    `</linearGradient></defs>` +
    `<rect width="200" height="284" rx="10" fill="url(#g)" stroke="${hero ? '#c9a227' : '#6b5a3e'}" stroke-width="${hero ? 6 : 3}"/>` +
    `<circle cx="30" cy="30" r="22" fill="${hero ? '#c9a227' : '#20180f'}" stroke="#6b5a3e" stroke-width="2"/>` +
    `<text x="30" y="37" font-size="18" font-family="Georgia,serif" font-weight="bold" text-anchor="middle" fill="${hero ? '#20180f' : '#e8dcc0'}">${esc(String(strength)).slice(0, 5)}</text>` +
    `<text x="100" y="255" font-size="14" font-family="Georgia,serif" text-anchor="middle" fill="#e8dcc0">${esc(name).slice(0, 24)}</text>` +
    `</svg>`;

  const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  cache.set(cardId, url);
  return url;
}
