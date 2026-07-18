import { byId, type CardDef, type Faction } from '@gwent/data';

const FACTION_COLORS: Record<Faction, [string, string, string]> = {
  neutral: ['#5a4a36', '#2b2519', '#c9a227'],
  northern_realms: ['#3a6a94', '#132638', '#7eb6e8'],
  nilfgaard: ['#4a4a4a', '#0e0e0e', '#c9a227'],
  scoiatael: ['#4a6e32', '#1c2b12', '#9ccc65'],
  monsters: ['#7a2828', '#2b0d0d', '#e06c5c'],
  skellige: ['#4e3870', '#1c1230', '#b39ddb'],
};

const ROW_ICON: Record<string, string> = {
  melee: '⚔',
  ranged: '🏹',
  siege: '🎯',
};

const cache = new Map<string, string>();

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Generated SVG stand-in used when /assets/cards/{id}.* is missing. */
export function placeholderArt(cardId: string): string {
  const hit = cache.get(cardId);
  if (hit) return hit;

  let def: CardDef | null = null;
  try {
    def = byId(cardId);
  } catch {
    /* unknown id */
  }
  const [top, bottom, accent] = FACTION_COLORS[def?.faction ?? 'neutral'];
  const name = def?.name ?? '?';
  const strength =
    def?.type === 'unit' ? String(def.strength ?? 0) : def?.type === 'leader' ? 'L' : (def?.special ?? 'S');
  const hero = def?.hero ?? false;
  const rows = def?.rows ?? [];
  const rowMark = rows.map((r) => ROW_ICON[r] ?? '').join('') || (def?.type === 'special' ? '✦' : def?.type === 'leader' ? '♛' : '');
  const abilities = (def?.abilities ?? []).slice(0, 3).join(' · ');

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="284" viewBox="0 0 200 284">` +
    `<defs>` +
    `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/>` +
    `</linearGradient>` +
    `<linearGradient id="shine" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#ffffff22"/><stop offset="0.5" stop-color="#00000000"/><stop offset="1" stop-color="#00000044"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect width="200" height="284" rx="12" fill="url(#g)" stroke="${hero ? accent : '#6b5a3e'}" stroke-width="${hero ? 6 : 3}"/>` +
    `<rect x="8" y="8" width="184" height="268" rx="8" fill="url(#shine)" stroke="#ffffff11" stroke-width="1"/>` +
    `<circle cx="34" cy="34" r="24" fill="${hero ? accent : '#20180f'}" stroke="#6b5a3e" stroke-width="2"/>` +
    `<text x="34" y="42" font-size="20" font-family="Cinzel,Georgia,serif" font-weight="bold" text-anchor="middle" fill="${hero ? '#20180f' : '#e8dcc0'}">${esc(String(strength)).slice(0, 5)}</text>` +
    `<text x="100" y="130" font-size="36" text-anchor="middle" fill="#ffffff22">${esc(rowMark)}</text>` +
    `<text x="100" y="230" font-size="13" font-family="IM Fell English,Georgia,serif" text-anchor="middle" fill="#e8dcc0">` +
    `${esc(name.length > 22 ? name.slice(0, 20) + '…' : name)}</text>` +
    (abilities
      ? `<text x="100" y="252" font-size="10" font-family="Georgia,serif" text-anchor="middle" fill="#b8a988">${esc(abilities)}</text>`
      : '') +
    `</svg>`;

  const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  cache.set(cardId, url);
  return url;
}
