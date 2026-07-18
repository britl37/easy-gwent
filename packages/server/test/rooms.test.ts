import { describe, expect, it } from 'vitest';
import { testDeck } from '../../engine/test/helpers.ts';
import { currentActor, Rooms } from '../src/rooms.ts';

describe('Rooms', () => {
  it('creates a room with a short id and validates decks', () => {
    const rooms = new Rooms(() => 1);
    const bad = rooms.create({ faction: 'northern_realms', leaderId: 'nope', cards: [] });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.code).toBe('invalid_deck');

    const ok = rooms.create(testDeck('northern_realms'));
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value.id.length).toBeGreaterThanOrEqual(3);
      expect(ok.value.state).toBeNull();
      expect(ok.value.decks[1]).toBeNull();
    }
  });

  it('starts the game when the second player joins', () => {
    const rooms = new Rooms(() => 42);
    const a = rooms.create(testDeck('northern_realms'));
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    const join = rooms.join(a.value.id, testDeck('nilfgaard'));
    expect(join.ok).toBe(true);
    if (!join.ok) return;
    expect(join.value.state).not.toBeNull();
    expect(join.value.state!.phase).toBe('redraw');
  });

  it('rejects join when room is full or missing', () => {
    const rooms = new Rooms(() => 1);
    const a = rooms.create(testDeck('northern_realms'));
    if (!a.ok) throw new Error('create failed');
    expect(rooms.join(a.value.id, testDeck('nilfgaard')).ok).toBe(true);
    const full = rooms.join(a.value.id, testDeck('monsters'));
    expect(full.ok).toBe(false);
    if (!full.ok) expect(full.code).toBe('room_full');
    const missing = rooms.join('zzzzz', testDeck('monsters'));
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.code).toBe('room_not_found');
  });

  it('enforces turn order on act', () => {
    const rooms = new Rooms(() => 7);
    const a = rooms.create(testDeck('northern_realms'));
    if (!a.ok) throw new Error('create failed');
    const j = rooms.join(a.value.id, testDeck('nilfgaard'));
    if (!j.ok || !j.value.state) throw new Error('join failed');

    const actor = currentActor(j.value.state);
    const other = (1 - actor) as 0 | 1;
    const bad = rooms.act(a.value.id, other, { type: 'PASS', player: other });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.code).toBe('not_your_turn');

    // Finish redraws for both if needed, then pass on turn.
    let state = j.value.state;
    while (state.phase === 'redraw') {
      const p = currentActor(state);
      const r = rooms.act(a.value.id, p, { type: 'REDRAW', player: p, handIndex: null });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      state = r.value;
    }
    if (state.phase === 'play') {
      const p = currentActor(state);
      const r = rooms.act(a.value.id, p, { type: 'PASS', player: p });
      expect(r.ok).toBe(true);
    }
  });

  it('allows both players to redraw independently and starts play when both finish', () => {
    const rooms = new Rooms(() => 7);
    const a = rooms.create(testDeck('northern_realms'));
    if (!a.ok) throw new Error('create failed');
    const j = rooms.join(a.value.id, testDeck('nilfgaard'));
    if (!j.ok || !j.value.state) throw new Error('join failed');

    // Joiner (seat 1) acts first, before the host has redrawn anything.
    const swap = rooms.act(a.value.id, 1, { type: 'REDRAW', player: 1, handIndex: 0 });
    expect(swap.ok).toBe(true);
    const keep1 = rooms.act(a.value.id, 1, { type: 'REDRAW', player: 1, handIndex: null });
    expect(keep1.ok).toBe(true);
    if (!keep1.ok) return;
    expect(keep1.value.phase).toBe('redraw'); // host still deciding

    // Seat 1 is done — further redraws from them are rejected.
    const extra = rooms.act(a.value.id, 1, { type: 'REDRAW', player: 1, handIndex: 0 });
    expect(extra.ok).toBe(false);

    // A spoofed player field is rejected.
    const spoof = rooms.act(a.value.id, 0, { type: 'REDRAW', player: 1, handIndex: null });
    expect(spoof.ok).toBe(false);
    if (!spoof.ok) expect(spoof.code).toBe('illegal_action');

    const keep0 = rooms.act(a.value.id, 0, { type: 'REDRAW', player: 0, handIndex: null });
    expect(keep0.ok).toBe(true);
    if (keep0.ok) expect(keep0.value.phase).toBe('play');
  });

  it('reset starts a fresh game reusing both decks (rematch)', () => {
    let seed = 1;
    const rooms = new Rooms(() => seed++);
    const a = rooms.create(testDeck('northern_realms'));
    if (!a.ok) throw new Error('create failed');
    const j = rooms.join(a.value.id, testDeck('nilfgaard'));
    if (!j.ok || !j.value.state) throw new Error('join failed');

    const before = j.value.state;
    const reset = rooms.reset(a.value.id);
    expect(reset.ok).toBe(true);
    if (!reset.ok) return;
    const after = reset.value.state!;
    expect(after).not.toBe(before);
    expect(after.phase).toBe('redraw');
    // Same decks are reused across the rematch.
    expect(reset.value.decks[0]).toEqual(testDeck('northern_realms'));
    expect(reset.value.decks[1]).toEqual(testDeck('nilfgaard'));
  });

  it('reset fails for a waiting or missing room', () => {
    const rooms = new Rooms(() => 1);
    const a = rooms.create(testDeck('northern_realms'));
    if (!a.ok) throw new Error('create failed');
    const waiting = rooms.reset(a.value.id); // only one deck present
    expect(waiting.ok).toBe(false);
    if (!waiting.ok) expect(waiting.code).toBe('room_not_found');
    const missing = rooms.reset('zzzzz');
    expect(missing.ok).toBe(false);
  });
});
