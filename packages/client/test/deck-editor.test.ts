import { describe, expect, it } from 'vitest';
import { ALL_CARDS, LEADER_CARDS, byId, type PlayableFaction } from '@gwent/data';
import {
  cardEffectText,
  collectionCardsForFaction,
  filterCollection,
  hasCardEffect,
} from '../src/screens/DeckEditor.tsx';

const FACTIONS: PlayableFaction[] = [
  'northern_realms',
  'nilfgaard',
  'scoiatael',
  'monsters',
  'skellige',
];

describe('deck editor card descriptions', () => {
  it('does not label an ordinary unit as having an effect', () => {
    const card = byId('nr_redanian_foot');

    expect(hasCardEffect(card)).toBe(false);
    expect(cardEffectText(card)).toBeNull();
  });

  it('shows rules text for unit abilities and special cards', () => {
    const spy = byId('nr_thaler');
    const decoy = byId('ne_decoy');

    expect(hasCardEffect(spy)).toBe(true);
    expect(cardEffectText(spy)).toMatch(/spy|draw/i);
    expect(hasCardEffect(decoy)).toBe(true);
    expect(cardEffectText(decoy)).toMatch(/decoy|swap/i);
  });

  it('shows the selected leader ability text', () => {
    const leader = LEADER_CARDS[0]!;

    expect(hasCardEffect(leader)).toBe(true);
    expect(cardEffectText(leader)).toBeTruthy();
  });

  it.each(FACTIONS)('includes every legal %s and neutral card in the collection', (faction) => {
    const expected = ALL_CARDS.filter(
      (card) =>
        card.type !== 'leader' &&
        card.count > 0 &&
        (card.faction === faction || card.faction === 'neutral'),
    );
    const collection = collectionCardsForFaction(faction);

    expect(new Set(collection.map((card) => card.id))).toEqual(new Set(expected.map((card) => card.id)));
    for (const card of collection) {
      expect(filterCollection(collection, 'all', card.name).map((result) => result.id)).toContain(card.id);
    }
  });

  it('finds both Gaunter cards with the common Guanter transposition', () => {
    const collection = collectionCardsForFaction('northern_realms');
    const matches = filterCollection(collection, 'all', 'guanter o dimm').map((card) => card.id);

    expect(matches).toContain('ne_gaunter_odimm');
    expect(matches).toContain('ne_gaunter_darkness');
  });

  it.each(['melee', 'ranged', 'siege'] as const)('filters units that can play in the %s row', (row) => {
    const collection = collectionCardsForFaction('scoiatael');
    const expected = collection.filter((card) => card.type === 'unit' && card.rows?.includes(row));
    const filtered = filterCollection(collection, row, '');

    expect(new Set(filtered.map((card) => card.id))).toEqual(new Set(expected.map((card) => card.id)));
    expect(filtered.length).toBeGreaterThan(0);
  });

  it('includes agile units in each row filter they can occupy', () => {
    const collection = collectionCardsForFaction('scoiatael');
    const agile = collection.find((card) => card.type === 'unit' && card.rows?.length === 2);

    expect(agile).toBeDefined();
    for (const row of agile!.rows ?? []) {
      expect(filterCollection(collection, row, '').map((card) => card.id)).toContain(agile!.id);
    }
  });

  it('filters hero units independently of their combat row', () => {
    const collection = collectionCardsForFaction('northern_realms');
    const filtered = filterCollection(collection, 'heroes', '');

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((card) => card.type === 'unit' && card.hero)).toBe(true);
  });
});
