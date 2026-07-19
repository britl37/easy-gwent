import {
  ALL_CARDS,
  LEADER_CARDS,
  byId,
  getCardText,
  type CardDef,
  type PlayableFaction,
  type Row,
} from '@gwent/data';
import { MAX_SPECIALS, MIN_UNITS, validateDeck, type DeckList } from '@gwent/engine';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/Card.tsx';
import { loadDeckDraft, saveDeck } from '../game/decks.ts';

const FACTION_NAMES: Record<PlayableFaction, string> = {
  northern_realms: 'Northern Realms',
  nilfgaard: 'Nilfgaard',
  scoiatael: "Scoia'tael",
  monsters: 'Monsters',
  skellige: 'Skellige',
};

const ROW_NAMES: Record<Row, string> = {
  melee: 'Melee',
  ranged: 'Ranged',
  siege: 'Siege',
};

type PoolFilter = 'all' | 'units' | 'specials' | 'effects';

const FILTERS: Array<{ id: PoolFilter; label: string }> = [
  { id: 'all', label: 'All cards' },
  { id: 'units', label: 'Units' },
  { id: 'specials', label: 'Specials' },
  { id: 'effects', label: 'With effects' },
];

export function hasCardEffect(card: CardDef): boolean {
  return card.type === 'leader' || card.type === 'special' || Boolean(card.hero) || card.abilities.length > 0;
}

export function cardEffectText(card: CardDef): string | null {
  return hasCardEffect(card) ? getCardText(card).ability : null;
}

function cardTags(card: CardDef): string[] {
  if (card.type === 'special') return ['Special card'];
  if (card.type === 'leader') return ['Leader'];
  return [
    `${card.strength ?? 0} strength`,
    ...(card.rows ?? []).map((row) => ROW_NAMES[row]),
    ...(card.hero ? ['Hero'] : []),
  ];
}

function sortCards(a: CardDef, b: CardDef): number {
  if (a.type !== b.type) return a.type === 'unit' ? -1 : 1;
  const sa = a.strength ?? 0;
  const sb = b.strength ?? 0;
  if (sa !== sb) return sb - sa;
  return a.name.localeCompare(b.name);
}

function CollectionCard({
  card,
  used,
  onAdd,
  locked = false,
}: {
  card: CardDef;
  used: number;
  onAdd?: () => void;
  locked?: boolean;
}) {
  const remaining = Math.max(0, card.count - used);
  const canAdd = !locked && remaining > 0 && onAdd;
  const effect = cardEffectText(card);

  return (
    <article className={`collection-card ${!canAdd ? 'collection-card-unavailable' : ''}`}>
      <div className="collection-card-art">
        <Card cardId={card.id} size="big" onClick={canAdd ? onAdd : undefined} dimmed={!canAdd && !locked} />
        {!locked && <span className="collection-copy-badge">{used}/{card.count}</span>}
      </div>
      <div className="collection-card-copy">
        <div>
          <h3>{card.name}</h3>
          <div className="card-tag-row">
            {cardTags(card).map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        </div>
        {effect ? (
          <p className="collection-effect">{effect}</p>
        ) : (
          <p className="collection-vanilla">No special effect</p>
        )}
        <div className="collection-card-action">
          <span>
            {locked
              ? 'Summoned by another card'
              : remaining > 0
                ? `${remaining} cop${remaining === 1 ? 'y' : 'ies'} available`
                : 'All copies added'}
          </span>
          {!locked && (
            <button type="button" className="btn btn-small" disabled={!canAdd} onClick={onAdd}>
              Add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function DeckCardRow({
  card,
  copies,
  onAdd,
  onRemove,
}: {
  card: CardDef;
  copies: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const effect = cardEffectText(card);
  return (
    <article className="deck-card-row">
      <div className="deck-card-art"><Card cardId={card.id} size="big" /></div>
      <div className="deck-card-copy">
        <div className="deck-card-heading">
          <strong>{card.name}</strong>
          <div className="deck-card-stepper" aria-label={`${copies} copies of ${card.name}`}>
            <button type="button" onClick={onRemove} aria-label={`Remove ${card.name}`}>−</button>
            <span>{copies}</span>
            <button
              type="button"
              onClick={onAdd}
              disabled={copies >= card.count}
              aria-label={`Add ${card.name}`}
            >
              +
            </button>
          </div>
        </div>
        <div className="card-tag-row compact">
          {cardTags(card).map((tag) => <span key={tag}>{tag}</span>)}
        </div>
        {effect && <p className="deck-card-effect">{effect}</p>}
      </div>
    </article>
  );
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
  const [query, setQuery] = useState('');
  const [poolFilter, setPoolFilter] = useState<PoolFilter>('all');

  // Auto-save every edit. Games validate on load and fall back to the starter
  // deck, so persisting an in-progress (invalid) draft is safe.
  useEffect(() => {
    saveDeck(deck);
  }, [deck]);

  const switchFaction = (nextFaction: PlayableFaction) => {
    setFaction(nextFaction);
    setDeck(loadDeckDraft(nextFaction));
    setQuery('');
    setPoolFilter('all');
  };

  // Card pool for this faction (faction cards + neutrals), sorted.
  // count < 1 marks summon-only tokens that can never be deck-built.
  const pool = useMemo(
    () =>
      ALL_CARDS.filter(
        (card) =>
          card.type !== 'leader' &&
          card.count > 0 &&
          (card.faction === faction || card.faction === 'neutral'),
      ).sort(sortCards),
    [faction],
  );
  const leaders = useMemo(() => LEADER_CARDS.filter((leader) => leader.faction === faction), [faction]);

  const triggerCards = useMemo(
    () =>
      ALL_CARDS.filter(
        (card) =>
          card.type !== 'leader' &&
          card.count < 1 &&
          (card.faction === faction || card.faction === 'neutral'),
      ).sort(sortCards),
    [faction],
  );

  const inDeck = useMemo(() => {
    const counts = new Map<string, number>();
    for (const id of deck.cards) counts.set(id, (counts.get(id) ?? 0) + 1);
    return counts;
  }, [deck]);

  const add = (id: string) => {
    const card = byId(id);
    if ((inDeck.get(id) ?? 0) >= card.count) return;
    setDeck((current) => ({ ...current, cards: [...current.cards, id] }));
  };
  const remove = (id: string) => {
    setDeck((current) => {
      const index = current.cards.indexOf(id);
      if (index < 0) return current;
      const cards = [...current.cards];
      cards.splice(index, 1);
      return { ...current, cards };
    });
  };

  const filteredPool = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return pool.filter((card) => {
      if (poolFilter === 'units' && card.type !== 'unit') return false;
      if (poolFilter === 'specials' && card.type !== 'special') return false;
      if (poolFilter === 'effects' && !hasCardEffect(card)) return false;
      if (!needle) return true;
      const searchable = `${card.name} ${cardEffectText(card) ?? ''}`.toLowerCase();
      return searchable.includes(needle);
    });
  }, [pool, poolFilter, query]);

  const stats = useMemo(() => {
    let units = 0;
    let specials = 0;
    let heroes = 0;
    let strength = 0;
    for (const id of deck.cards) {
      const card = byId(id);
      if (card.type === 'unit') {
        units++;
        strength += card.strength ?? 0;
        if (card.hero) heroes++;
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
        .map(([id, copies]) => ({ card: byId(id), copies }))
        .sort((a, b) => sortCards(a.card, b.card)),
    [inDeck],
  );

  return (
    <div className="deck-editor">
      <header className="editor-header">
        <div className="editor-title-row">
          <button type="button" className="btn" onClick={onBack}>← Back</button>
          <div>
            <div className="editor-kicker">Deck workshop</div>
            <h1>{FACTION_NAMES[faction]}</h1>
          </div>
          <div
            className={`save-status ${valid ? 'save-ok' : 'save-bad'}`}
            title={valid ? 'Deck is valid and saved' : errors.map((error) => error.message).join('\n')}
          >
            {valid ? 'Saved and ready' : 'Saved draft — invalid'}
          </div>
        </div>
        <nav className="faction-picker editor-factions" aria-label="Choose faction">
          {(Object.keys(FACTION_NAMES) as PlayableFaction[]).map((item) => (
            <button
              type="button"
              key={item}
              className={`btn ${faction === item ? 'btn-selected' : ''}`}
              onClick={() => switchFaction(item)}
            >
              {FACTION_NAMES[item]}
            </button>
          ))}
        </nav>
      </header>

      <section className="deck-overview" aria-label="Deck statistics">
        <div className={stats.units >= MIN_UNITS ? 'overview-good' : 'overview-warn'}>
          <span>Unit cards</span><strong>{stats.units}</strong><small>minimum {MIN_UNITS}</small>
        </div>
        <div className={stats.specials <= MAX_SPECIALS ? 'overview-good' : 'overview-warn'}>
          <span>Special cards</span><strong>{stats.specials}</strong><small>maximum {MAX_SPECIALS}</small>
        </div>
        <div><span>Heroes</span><strong>{stats.heroes}</strong><small>no limit</small></div>
        <div><span>Base strength</span><strong>{stats.strength}</strong><small>before effects</small></div>
        <div><span>Total cards</span><strong>{deck.cards.length}</strong><small>leader not included</small></div>
      </section>

      {errors.length > 0 && (
        <div className="deck-validation" role="status">
          <strong>Finish the deck before playing:</strong>
          {errors.map((error, index) => <span key={`${error.code}-${index}`}>{error.message}</span>)}
        </div>
      )}

      <main className="editor-workspace">
        <section className="collection-panel">
          <div className="editor-section-heading">
            <div>
              <span className="editor-kicker">Browse and add</span>
              <h2>Card collection</h2>
            </div>
            <span>{filteredPool.length} shown</span>
          </div>
          <div className="collection-toolbar">
            <label className="collection-search">
              <span>Search cards</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name or effect…"
              />
            </label>
            <div className="collection-filters" role="group" aria-label="Filter collection">
              {FILTERS.map((filter) => (
                <button
                  type="button"
                  key={filter.id}
                  className={poolFilter === filter.id ? 'active' : ''}
                  aria-pressed={poolFilter === filter.id}
                  onClick={() => setPoolFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="collection-scroll">
            {filteredPool.length > 0 ? (
              <div className="collection-grid">
                {filteredPool.map((card) => (
                  <CollectionCard
                    key={card.id}
                    card={card}
                    used={inDeck.get(card.id) ?? 0}
                    onAdd={() => add(card.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="collection-empty">No cards match that search and filter.</div>
            )}

            {triggerCards.length > 0 && poolFilter === 'all' && !query && (
              <section className="trigger-section">
                <div className="editor-section-heading compact-heading">
                  <div>
                    <span className="editor-kicker">Reference only</span>
                    <h2>Summoned cards</h2>
                  </div>
                </div>
                <p>These cards enter play through another card's effect and cannot be put directly into a deck.</p>
                <div className="collection-grid">
                  {triggerCards.map((card) => (
                    <CollectionCard key={card.id} card={card} used={0} locked />
                  ))}
                </div>
              </section>
            )}
          </div>
        </section>

        <aside className="deck-panel">
          <section className="leader-section">
            <div className="editor-section-heading compact-heading">
              <div>
                <span className="editor-kicker">Choose one</span>
                <h2>Leader</h2>
              </div>
            </div>
            <div className="leader-card-list">
              {leaders.map((leader) => {
                const selected = deck.leaderId === leader.id;
                return (
                  <button
                    type="button"
                    key={leader.id}
                    className={`leader-choice ${selected ? 'leader-choice-selected' : ''}`}
                    onClick={() => setDeck((current) => ({ ...current, leaderId: leader.id }))}
                  >
                    <div className="leader-choice-art"><Card cardId={leader.id} size="big" /></div>
                    <span className="leader-choice-copy">
                      <strong>{leader.name}</strong>
                      <small>{cardEffectText(leader)}</small>
                    </span>
                    <span className="leader-choice-mark">{selected ? 'Selected' : 'Choose'}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="built-deck-section">
            <div className="editor-section-heading compact-heading">
              <div>
                <span className="editor-kicker">Your choices</span>
                <h2>Deck list</h2>
              </div>
              <span>{deck.cards.length} cards</span>
            </div>
            <div className="deck-list-scroll">
              {deckRows.length > 0 ? (
                deckRows.map(({ card, copies }) => (
                  <DeckCardRow
                    key={card.id}
                    card={card}
                    copies={copies}
                    onAdd={() => add(card.id)}
                    onRemove={() => remove(card.id)}
                  />
                ))
              ) : (
                <div className="collection-empty">Your deck is empty. Add cards from the collection.</div>
              )}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
