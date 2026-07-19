import { describe, expect, it } from 'vitest';
import { LEADER_CARDS, byId } from '@gwent/data';
import { cardEffectText, hasCardEffect } from '../src/screens/DeckEditor.tsx';

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
});
