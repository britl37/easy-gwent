import { ALL_CARDS, LEADER_CARDS, byId, type CardDef, type PlayableFaction } from '@gwent/data';
import { MAX_HEROES, MAX_SPECIALS, MIN_UNITS, validateDeck, type DeckList } from '@gwent/engine';
import { useMemo, useState } from 'react';
import { loadDeckDraft, saveDeck } from '../game/decks.ts';

const FACTION_NAMES: Record<PlayableFaction, string> = {
  northern_realms: 'Northern Realms',
  nilfgaard: 'Nilfgaard',
  scoiatael: "Scoia'tael",
  monsters: 'Monsters',
  skellige: 'Skellige',
};

function cardLabel(c: CardDef): string {
  const bits: string[] = [];
  if (c.type === 'unit') {
    bits.push(String(c.strength ?? 0));
    if (c.hero) bits.push('hero');
    if (c.abilities.length > 0) bits.push(c.abilities.join(', '));
  } else if (c.special) {
    bits.push(c.special);
  }
  return bits.join(' · ');
}

function sortCards(a: CardDef, b: CardDef): number {
  if (a.type !== b.type) return a.type === 'unit' ? -1 : 1;
  const sa = a.strength ?? 0;
  const sb = b.strength ?? 0;
  if (sa !== sb) return sb - sa;
  return a.name.localeCompare(b.name);
}

export function DeckEditorScreen({
  faction: initialFaction,
  onBack,
}: {
  faction: PlayableFaction;
  onBack: () => void;
}) {
  const [faction, setFaction] = useState<PlayableFaction>(initialFaction);
  const [deck, setDeck] = useState<DeckList>(() => loadDeckDraft(initialFaction));
  const [savedFlash, setSavedFlash] = useState(false);

  const switchFaction = (f: PlayableFaction) => {
    setFaction(f);
    setDeck(loadDeckDraft(f));
    setSavedFlash(false);
  };

  // Card pool for this faction (faction cards + neutrals), sorted.
  const pool = useMemo(
    () =>
      ALL_CARDS.filter((c) => c.type !== 'leader' && (c.faction === faction || c.faction === 'neutral')).sort(
        sortCards,
      ),
    [faction],
  );
  const leaders = useMemo(() => LEADER_CARDS.filter((l) => l.faction === faction), [faction]);

  const inDeck = useMemo(() => {
    const m = new Map<string, number>();
    for (const id of deck.cards) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [deck]);

  const add = (id: string) => {
    const c = byId(id);
    if ((inDeck.get(id) ?? 0) >= c.count) return;
    setDeck((d) => ({ ...d, cards: [...d.cards, id] }));
    setSavedFlash(false);
  };
  const remove = (id: string) => {
    setDeck((d) => {
      const i = d.cards.indexOf(id);
      if (i < 0) return d;
      const cards = [...d.cards];
      cards.splice(i, 1);
      return { ...d, cards };
    });
    setSavedFlash(false);
  };

  // Stats + validation.
  const stats = useMemo(() => {
    let units = 0;
    let specials = 0;
    let heroes = 0;
    let strength = 0;
    for (const id of deck.cards) {
      const c = byId(id);
      if (c.type === 'unit') {
        units++;
        strength += c.strength ?? 0;
        if (c.hero) heroes++;
      } else {
        specials++;
      }
    }
    return { units, specials, heroes, strength };
  }, [deck]);
  const errors = useMemo(() => validateDeck(deck), [deck]);
  const valid = errors.length === 0;

  const deckRows = useMemo(
    () =>
      [...inDeck.entries()]
        .map(([id, n]) => ({ card: byId(id), n }))
        .sort((a, b) => sortCards(a.card, b.card)),
    [inDeck],
  );

  return (
    <div className="deck-editor">
      <div className="editor-topbar">
        <button className="btn" onClick={onBack}>
          ← Back
        </button>
        <div className="faction-picker">
          {(Object.keys(FACTION_NAMES) as PlayableFaction[]).map((f) => (
            <button
              key={f}
              className={`btn ${faction === f ? 'btn-selected' : ''}`}
              onClick={() => switchFaction(f)}
            >
              {FACTION_NAMES[f]}
            </button>
          ))}
        </div>
        <button
          className="btn btn-primary"
          disabled={!valid}
          title={valid ? 'Save deck' : errors.map((e) => e.message).join('\n')}
          onClick={() => {
            saveDeck(deck);
            setSavedFlash(true);
          }}
        >
          {savedFlash ? 'Saved ✓' : 'Save deck'}
        </button>
      </div>

      <div className="editor-columns">
        <section className="editor-pane">
          <h3>Collection — {FACTION_NAMES[faction]} + Neutral</h3>
          <ul className="ed-list">
            {pool.map((c) => {
              const used = inDeck.get(c.id) ?? 0;
              const left = c.count - used;
              return (
                <li key={c.id} className={`ed-row ${left === 0 ? 'ed-row-dim' : ''}`}>
                  <button className="ed-add" disabled={left === 0} onClick={() => add(c.id)}>
                    +
                  </button>
                  <span className="ed-name">{c.name}</span>
                  <span className="ed-meta">{cardLabel(c)}</span>
                  <span className="ed-count">
                    {left}/{c.count}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="editor-pane">
          <h3>Leader</h3>
          <ul className="ed-list leader-list">
            {leaders.map((l) => (
              <li key={l.id} className="ed-row">
                <button
                  className={`ed-add ${deck.leaderId === l.id ? 'btn-selected' : ''}`}
                  onClick={() => {
                    setDeck((d) => ({ ...d, leaderId: l.id }));
                    setSavedFlash(false);
                  }}
                >
                  {deck.leaderId === l.id ? '✓' : ' '}
                </button>
                <span className="ed-name">{l.name}</span>
              </li>
            ))}
          </ul>

          <h3>
            Deck <span className="deck-stats">
              units {stats.units}/{MIN_UNITS}+ · specials {stats.specials}/{MAX_SPECIALS} · heroes{' '}
              {stats.heroes}/{MAX_HEROES} · str {stats.strength}
            </span>
          </h3>
          {errors.length > 0 && (
            <ul className="deck-errors">
              {errors.map((e, i) => (
                <li key={i}>{e.message}</li>
              ))}
            </ul>
          )}
          <ul className="ed-list">
            {deckRows.map(({ card: c, n }) => (
              <li key={c.id} className="ed-row">
                <button className="ed-add" onClick={() => remove(c.id)}>
                  −
                </button>
                <span className="ed-name">
                  {c.name}
                  {n > 1 ? ` ×${n}` : ''}
                </span>
                <span className="ed-meta">{cardLabel(c)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
