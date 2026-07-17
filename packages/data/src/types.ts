export type Faction =
  | 'neutral'
  | 'northern_realms'
  | 'nilfgaard'
  | 'scoiatael'
  | 'monsters'
  | 'skellige';

export type PlayableFaction = Exclude<Faction, 'neutral'>;

export type Row = 'melee' | 'ranged' | 'siege';

/** Rows a unit may be placed on. Agile units list two. */
export type RowSpec = Row[];

export type UnitAbility =
  | 'medic'
  | 'muster'
  | 'tight_bond'
  | 'spy'
  | 'scorch' // unit-scorch: on play, destroys strongest enemy unit(s) on opposite melee row if its total >= 10
  | 'morale_boost'
  | 'horn' // commander's horn as a unit ability (e.g. Dandelion)
  | 'summon_avenger'
  | 'mardroeme'
  | 'berserker';

export type SpecialKind =
  | 'decoy'
  | 'horn'
  | 'scorch'
  | 'frost'
  | 'fog'
  | 'rain'
  | 'storm' // Skellige Storm: fog + rain
  | 'clear'
  | 'mardroeme';

export type LeaderAbilityId =
  // Northern Realms
  | 'foltest_steel_forged' // clear weather
  | 'foltest_siegemaster' // play fog
  | 'foltest_kingdom_of_temeria' // horn on siege row
  | 'foltest_lord_commander' // clear weather (variant: destroy enemy siege if >=10)
  | 'foltest_son_of_medell' // destroy strongest enemy ranged if row >= 10
  // Nilfgaard
  | 'emhyr_imperial_majesty' // play rain
  | 'emhyr_emperor_of_nilfgaard' // look at 3 random cards in opponent hand
  | 'emhyr_the_white_flame' // cancel opponent leader ability (passive)
  | 'emhyr_his_imperial_majesty' // pick a decoy-like: restore card from opp graveyard? (uses torrential rain variant)
  | 'emhyr_invader_of_the_north' // draw card from opponent's discard pile
  // Scoia'tael
  | 'francesca_daisy_of_the_valley' // draw extra card at start (passive)
  | 'francesca_pureblood_elf' // play frost
  | 'francesca_queen_of_dol_blathanna' // destroy strongest enemy melee if row >= 10
  | 'francesca_beautiful' // horn on ranged row
  | 'francesca_hope_of_the_aen_seidhe' // move agile units to optimize rows (simplified: horn melee)
  // Monsters
  | 'eredin_commander_of_red_riders' // double spy strength? no: restore unit from graveyard to hand? (simplified per W3: play weather from deck)
  | 'eredin_bringer_of_death' // restore a card from your discard pile to your hand
  | 'eredin_destroyer_of_worlds' // discard 2 cards, draw 1 of your choice from deck
  | 'eredin_king_of_the_wild_hunt' // double strength of all spy cards? no — pick any weather card from deck and play it
  | 'eredin_treacherous' // doubles spy strength (passive)
  // Skellige
  | 'crach_an_craite' // shuffle all graveyard cards back into decks
  | 'bran_tuirseach'; // units only lose half strength in bad weather (passive)

export interface CardDef {
  /** Stable id, e.g. 'nr_vernon_roche'. Prefix by faction: ne_, nr_, nf_, sc_, mo_, sk_. */
  id: string;
  name: string;
  faction: Faction;
  type: 'unit' | 'special' | 'leader';
  /** Unit only. One row, or two rows for agile units. */
  rows?: RowSpec;
  /** Unit only. Base strength. */
  strength?: number;
  /** Unit only. Heroes are immune to abilities and weather. */
  hero?: boolean;
  abilities: UnitAbility[];
  /** Special cards only. */
  special?: SpecialKind;
  /** Cards in the same muster group are summoned together. */
  musterGroup?: string;
  /** Cards in the same bond group multiply each other's strength. */
  bondGroup?: string;
  /** Berserker transform target id (mardroeme flips this card into target). */
  transformsInto?: string;
  /** Max copies allowed in a deck (and available in collection). */
  count: number;
  /** Leader cards only. */
  leaderAbility?: LeaderAbilityId;
}
