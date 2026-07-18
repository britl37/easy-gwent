import {
  applyAction,
  createGame,
  IllegalActionError,
  validateDeck,
  type Action,
  type DeckList,
  type GameState,
  type PlayerId,
  type ProtocolErrorCode,
} from '@gwent/engine';

export interface Room {
  id: string;
  decks: [DeckList, DeckList | null];
  state: GameState | null; // null until second player joins
}

export type RoomResult<T> = { ok: true; value: T } | { ok: false; code: ProtocolErrorCode; message: string };

const err = (code: ProtocolErrorCode, message: string): { ok: false; code: ProtocolErrorCode; message: string } => ({
  ok: false,
  code,
  message,
});

/** Whose action does the engine expect next? */
export function currentActor(s: GameState): PlayerId {
  if (s.phase === 'redraw') return s.players[0].redrawsLeft > 0 ? 0 : 1;
  if (s.pendingChoice) return s.pendingChoice.player;
  return s.turn;
}

/** In-memory room registry. Pure state management — no sockets. */
export class Rooms {
  private rooms = new Map<string, Room>();
  private nextSeed: () => number;

  constructor(nextSeed: () => number = () => Date.now() >>> 0) {
    this.nextSeed = nextSeed;
  }

  create(deck: DeckList): RoomResult<Room> {
    const deckErrors = validateDeck(deck);
    if (deckErrors.length > 0) return err('invalid_deck', deckErrors[0]!.message);
    let id: string;
    do {
      id = Math.floor(Math.random() * 0xffffff).toString(36).padStart(5, '0');
    } while (this.rooms.has(id));
    const room: Room = { id, decks: [deck, null], state: null };
    this.rooms.set(id, room);
    return { ok: true, value: room };
  }

  join(roomId: string, deck: DeckList): RoomResult<Room> {
    const room = this.rooms.get(roomId);
    if (!room) return err('room_not_found', `No room ${roomId}`);
    if (room.decks[1] !== null) return err('room_full', `Room ${roomId} already has two players`);
    const deckErrors = validateDeck(deck);
    if (deckErrors.length > 0) return err('invalid_deck', deckErrors[0]!.message);
    room.decks[1] = deck;
    room.state = createGame(this.nextSeed(), [room.decks[0], deck]);
    return { ok: true, value: room };
  }

  act(roomId: string, player: PlayerId, action: Action): RoomResult<GameState> {
    const room = this.rooms.get(roomId);
    if (!room || !room.state) return err('room_not_found', `No active game in room ${roomId}`);
    if (currentActor(room.state) !== player) return err('not_your_turn', 'Not your turn');
    try {
      room.state = applyAction(room.state, action);
      return { ok: true, value: room.state };
    } catch (e) {
      if (e instanceof IllegalActionError) return err('illegal_action', e.message);
      throw e;
    }
  }

  /** Start a fresh game in an existing room, reusing both decks with a new seed. */
  reset(roomId: string): RoomResult<Room> {
    const room = this.rooms.get(roomId);
    if (!room || room.decks[1] === null) return err('room_not_found', `No completed game in room ${roomId}`);
    room.state = createGame(this.nextSeed(), [room.decks[0], room.decks[1]]);
    return { ok: true, value: room };
  }

  remove(roomId: string): void {
    this.rooms.delete(roomId);
  }

  get(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }
}
