import { byId } from '@gwent/data';
import {
  applyAction,
  legalActions,
  next,
  scores,
  type Action,
  type GameState,
  type PlayerId,
  type Rng,
} from '@gwent/engine';

export type Difficulty = 'easy' | 'medium' | 'hard';

interface Weights {
  /** Value of one card of hand advantage, in board-strength points. */
  hand: number;
  /** Random noise added to each action's value (0 = perfectly greedy). */
  noise: number;
  /** Whether the AI mulligans during redraw. */
  mulligan: boolean;
}

const MEDIUM: Weights = { hand: 4, noise: 6, mulligan: false };
const HARD: Weights = { hand: 6, noise: 0, mulligan: true };

function scoreDiff(s: GameState, player: PlayerId): number {
  const [s0, s1] = scores(s);
  return player === 0 ? s0 - s1 : s1 - s0;
}

/** Rounds won by `player` = gems the opponent has lost (everyone starts with 2). */
function roundsWon(s: GameState, player: PlayerId): number {
  return 2 - s.players[player === 0 ? 1 : 0].gems;
}

/** Simulate an action, greedily resolving any follow-up choice (e.g. medic) for `player`. */
function simulate(s: GameState, player: PlayerId, a: Action): GameState {
  let t = applyAction(s, a);
  let guard = 0;
  while (t.pendingChoice && t.pendingChoice.player === player) {
    if (++guard > 20) break;
    let best: { a: Action; v: number } | null = null;
    for (const o of legalActions(t, player)) {
      const v = scoreDiff(applyAction(t, o), player);
      if (!best || v > best.v) best = { a: o, v };
    }
    if (!best) break;
    t = applyAction(t, best.a);
  }
  return t;
}

/** Value of taking action `a` in state `s`, in board points. */
function actionValue(s: GameState, player: PlayerId, a: Action, w: Weights): number {
  const t = simulate(s, player, a);
  const before = scoreDiff(s, player);
  const after = scoreDiff(t, player);
  // A normal play costs 1 card from hand; spies/draw effects recoup it.
  const handDelta = t.players[player].hand.length - (s.players[player].hand.length - 1);
  return after - before + handDelta * w.hand;
}

/** Rough upper bound on strength the opponent could still add this round. */
function oppPotential(s: GameState, player: PlayerId): number {
  const opp = s.players[player === 0 ? 1 : 0];
  return opp.passed ? 0 : opp.hand.length * 8;
}

/** How much a card in hand is worth keeping (used for mulligans). */
function keepValue(cardId: string, seen: Set<string>): number {
  const def = byId(cardId);
  if (def.type !== 'unit') return seen.has(cardId) ? 0 : 50; // duplicate specials are dead weight
  let v = def.strength ?? 0;
  if (def.abilities.length > 0) v += 10;
  if (def.hero) v += 100;
  return v;
}

function chooseRedraw(s: GameState, player: PlayerId, actions: Action[], w: Weights): Action {
  const done = actions.find((a) => a.type === 'REDRAW' && a.handIndex === null);
  if (!w.mulligan) return done ?? actions[0]!;
  // Mulligan the weakest card if it is dead weight (duplicate special or vanilla <= 3).
  const seen = new Set<string>();
  let worst: { idx: number; v: number } | null = null;
  s.players[player].hand.forEach((id, idx) => {
    const v = keepValue(id, seen);
    seen.add(id);
    if (worst === null || v < worst.v) worst = { idx, v };
  });
  const w2 = worst as { idx: number; v: number } | null;
  if (w2 && w2.v <= 3) {
    const redraw = actions.find((a) => a.type === 'REDRAW' && a.handIndex === w2.idx);
    if (redraw) return redraw;
  }
  return done ?? actions[0]!;
}

function shouldPass(s: GameState, player: PlayerId, w: Weights): boolean {
  const me = s.players[player];
  const opp = s.players[player === 0 ? 1 : 0];
  const lead = scoreDiff(s, player);
  if (me.hand.length === 0) return true;
  if (opp.passed) {
    // Opponent locked in: pass if we're ahead (round is banked).
    if (lead > 0) return true;
    // Concede if catching up is impossible with what we hold.
    const deficit = -lead;
    if (deficit > me.hand.length * 8) return true;
    // Hard AI: concede round cheaply when flipping costs 3+ cards and we hold card parity.
    if (w === HARD && roundsWon(s, player) === roundsWon(s, player === 0 ? 1 : 0)) {
      if (Math.ceil(deficit / 8) >= 3 && me.hand.length <= opp.hand.length + 1) return true;
    }
    return false;
  }
  // Match point + lead bigger than anything they can realistically add: bank it.
  if (w === HARD && roundsWon(s, player) === 1 && lead > oppPotential(s, player)) return true;
  // Don't dump the whole hand into a lost round while at card disadvantage.
  if (lead < -30 && me.hand.length < opp.hand.length && roundsWon(s, player === 0 ? 1 : 0) === 0)
    return true;
  return false;
}

function chooseHeuristic(s: GameState, player: PlayerId, rng: Rng, w: Weights): Action {
  const actions = legalActions(s, player);
  if (actions.length === 0) throw new Error('AI asked to act with no legal actions');
  if (actions.length === 1) return actions[0]!;

  if (s.phase === 'redraw') return chooseRedraw(s, player, actions, w);

  // Pending choice: pick the option that maximizes resulting board lead.
  if (s.pendingChoice) {
    let best: { a: Action; v: number } | null = null;
    for (const a of actions) {
      const v = scoreDiff(applyAction(s, a), player);
      if (!best || v > best.v) best = { a, v };
    }
    return best!.a;
  }

  const passAction = actions.find((a) => a.type === 'PASS');
  if (passAction && shouldPass(s, player, w)) return passAction;

  const nonPass = actions.filter((a) => a.type !== 'PASS');
  if (nonPass.length === 0) return actions[0]!;

  let best: { a: Action; v: number } | null = null;
  for (const a of nonPass) {
    let v = actionValue(s, player, a, w);
    if (w.noise > 0) v += next(rng) * w.noise;
    if (!best || v > best.v) best = { a, v };
  }
  // If even the best play hurts us overall while we lead, prefer passing.
  if (passAction && best!.v < -w.hand && scoreDiff(s, player) > 0) return passAction;
  return best!.a;
}

export function chooseMedium(s: GameState, player: PlayerId, rng: Rng): Action {
  return chooseHeuristic(s, player, rng, MEDIUM);
}

export function chooseHard(s: GameState, player: PlayerId, rng: Rng): Action {
  return chooseHeuristic(s, player, rng, HARD);
}
