import { chooseEasy } from '@gwent/ai';
import { ALL_CARDS, LEADER_CARDS, type PlayableFaction } from '@gwent/data';
import {
  applyAction,
  createGame,
  createRng,
  IllegalActionError,
  type Action,
  type DeckList,
  type GameState,
  type PlayerId,
} from '@gwent/engine';

export const HUMAN: PlayerId = 0;
export const AI: PlayerId = 1;

/** Build a legal starter deck for a faction: first leader + up to 25 unit copies. */
export function starterDeck(faction: PlayableFaction): DeckList {
  const leader = LEADER_CARDS.find((l) => l.faction === faction)!;
  const cards: string[] = [];
  for (const c of ALL_CARDS) {
    if (c.type !== 'unit') continue;
    if (c.faction !== faction && c.faction !== 'neutral') continue;
    for (let i = 0; i < c.count && cards.length < 25; i++) cards.push(c.id);
    if (cards.length >= 25) break;
  }
  return { faction, leaderId: leader.id, cards };
}

/** Whose action does the engine expect next? */
export function currentActor(s: GameState): PlayerId {
  if (s.phase === 'redraw') return s.players[0].redrawsLeft > 0 ? 0 : 1;
  if (s.pendingChoice) return s.pendingChoice.player;
  return s.turn;
}

export function newLocalGame(seed: number, playerDeck: DeckList, aiDeck: DeckList): GameState {
  return runAi(createGame(seed, [playerDeck, aiDeck]));
}

/** Let the AI act until control returns to the human (or the game ends). */
function runAi(s: GameState): GameState {
  const rng = createRng((s.rngState ^ 0x9e3779b9) >>> 0);
  let steps = 0;
  while (s.phase !== 'finished' && currentActor(s) === AI) {
    if (++steps > 200) throw new Error('AI loop did not terminate');
    s = applyAction(s, chooseEasy(s, AI, rng));
  }
  return s;
}

/**
 * Apply a human action, then let the AI respond until it is the human's move again.
 * Returns the previous state unchanged if the action was illegal.
 */
export function humanAct(s: GameState, action: Action): GameState {
  try {
    return runAi(applyAction(s, action));
  } catch (e) {
    if (e instanceof IllegalActionError) {
      console.warn('Illegal action ignored:', e.message);
      return s;
    }
    throw e;
  }
}
