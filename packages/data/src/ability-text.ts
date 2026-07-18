import type { CardDef, LeaderAbilityId, SpecialKind, UnitAbility } from './types.ts';
/** Committed ability/flavor blurbs (from wiki). Text is fine in-repo; images are not. */
import cardText from './card-text.json' with { type: 'json' };

type StoredCardText = { ability?: string; flavor?: string };
const STORED = cardText as Record<string, StoredCardText>;

const UNIT_ABILITY: Record<UnitAbility, string> = {
  spy: "Spy: Played on the opponent's side (counts toward their total). Draw 2 cards.",
  medic: 'Medic: Choose a non-hero unit from your discard pile and play it again.',
  muster: 'Muster: Play all cards with the same name from your hand and deck.',
  tight_bond: 'Tight Bond: Place next to a card with the same name to double the strength of both.',
  scorch: "Scorch (unit): If the opposite melee row's strength is 10 or more, destroy the strongest unit(s) there.",
  morale_boost: 'Morale Boost: +1 strength to all units in the row (except self).',
  horn: "Commander's Horn (unit): Doubles the strength of all other units in its row.",
  summon_avenger: 'Summon Avenger: When destroyed, summon a replacement unit from your deck.',
  mardroeme: "Mardroeme: Triggers Berserkers in the row to transform into their stronger forms.",
  berserker: 'Berserker: Transforms into a stronger unit when Mardroeme is played on its row.',
};

const SPECIAL: Record<SpecialKind, string> = {
  decoy: 'Decoy: Swap with a non-hero unit on your side of the board to return it to your hand.',
  horn: "Commander's Horn: Choose a row. Double the strength of all units in that row.",
  scorch: 'Scorch: Destroy the strongest non-hero unit(s) on the board (all sides).',
  frost: 'Biting Frost: Sets the strength of all melee units to 1 for both players.',
  fog: 'Impenetrable Fog: Sets the strength of all ranged units to 1 for both players.',
  rain: 'Torrential Rain: Sets the strength of all siege units to 1 for both players.',
  storm: 'Skellige Storm: Applies fog and rain (ranged and siege set to 1).',
  clear: 'Clear Weather: Removes all active weather effects.',
  mardroeme: "Mardroeme: Choose a row with a Berserker to transform them.",
};

const LEADER: Record<LeaderAbilityId, string> = {
  foltest_steel_forged: 'Clear all weather effects.',
  foltest_siegemaster: 'Play Impenetrable Fog.',
  foltest_kingdom_of_temeria: "Double the strength of your siege row (Commander's Horn effect).",
  foltest_lord_commander: "Destroy the enemy's strongest siege unit(s) if their siege row totals 10 or more.",
  foltest_son_of_medell: "Destroy the enemy's strongest ranged unit(s) if their ranged row totals 10 or more.",
  emhyr_imperial_majesty: 'Play Torrential Rain.',
  emhyr_emperor_of_nilfgaard: "Look at 3 random cards from the opponent's hand.",
  emhyr_the_white_flame: "Cancel the opponent's leader ability (passive).",
  emhyr_his_imperial_majesty: 'Play Torrential Rain.',
  emhyr_invader_of_the_north: "Draw a card from the opponent's discard pile.",
  francesca_daisy_of_the_valley: 'Draw an extra card at the start of the battle (passive).',
  francesca_pureblood_elf: 'Play Biting Frost.',
  francesca_queen_of_dol_blathanna: "Destroy the enemy's strongest melee unit(s) if their melee row totals 10 or more.",
  francesca_beautiful: "Double the strength of your ranged row (Commander's Horn effect).",
  francesca_hope_of_the_aen_seidhe: "Double the strength of your melee row (Commander's Horn effect).",
  eredin_commander_of_red_riders: 'Play a weather card from your deck.',
  eredin_bringer_of_death: 'Restore a card from your discard pile to your hand.',
  eredin_destroyer_of_worlds: 'Discard 2 cards, then draw 1 from your deck.',
  eredin_king_of_the_wild_hunt: 'Pick any weather card from your deck and play it.',
  eredin_treacherous: 'Doubles the strength of spy cards (passive).',
  crach_an_craite: "Shuffle both players' discard piles back into their decks.",
  bran_tuirseach: 'Units only lose half their strength under weather (passive).',
};

export interface CardText {
  /** Short rules text for the panel. */
  ability: string;
  /** Optional flavor quote (often from wiki caption). */
  flavor?: string;
  /** Source of ability string. */
  source: 'generated' | 'wiki';
}

/** Rules text derived from our engine card definition (always matches gameplay). */
export function generatedCardText(def: CardDef): CardText {
  const parts: string[] = [];

  if (def.type === 'unit') {
    const rows = (def.rows ?? []).join(' / ');
    parts.push(`${def.hero ? 'Hero unit' : 'Unit'} · ${rows} · strength ${def.strength ?? 0}`);
    if (def.hero) parts.push('Hero: Not affected by special cards, abilities, or weather.');
    for (const a of def.abilities) {
      if (UNIT_ABILITY[a]) parts.push(UNIT_ABILITY[a]);
    }
    if (def.abilities.length === 0 && !def.hero) {
      parts.push('No special ability.');
    }
  } else if (def.type === 'special' && def.special) {
    parts.push(SPECIAL[def.special] ?? `Special: ${def.special}`);
  } else if (def.type === 'leader' && def.leaderAbility) {
    parts.push(LEADER[def.leaderAbility] ?? `Leader ability: ${def.leaderAbility}`);
  }

  return { ability: parts.join('\n\n'), source: 'generated' };
}

function isUsableAbility(s: string): boolean {
  if (s.length < 3 || s.length > 500) return false;
  if (/https?:\/\//i.test(s)) return false;
  if (/expired|My Rewards|\{\{|}}/i.test(s)) return false;
  return true;
}

/**
 * Card panel text from committed `card-text.json` (wiki-sourced, held in repo).
 * Falls back to engine-generated rules when a blurb is missing or unusable.
 * Images are never stored in git — only this text + URL manifest.
 */
export function getCardText(def: CardDef): CardText {
  const gen = generatedCardText(def);
  const stored = STORED[def.id];
  if (!stored) return gen;

  const wikiAbility = stored.ability?.trim();
  const ability = wikiAbility && isUsableAbility(wikiAbility) ? wikiAbility : gen.ability;
  return {
    ability,
    flavor: stored.flavor?.trim() || undefined,
    source: wikiAbility && isUsableAbility(wikiAbility) ? 'wiki' : 'generated',
  };
}
