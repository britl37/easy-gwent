import type { Action, PlayCardAction } from '@gwent/engine';

/**
 * Resolve the safe double-click fast path for one hand card. Row/target choices
 * remain interactive; only a single non-targeted legal action can auto-play.
 */
export function immediateHandPlay(actions: Action[], handIndex: number): PlayCardAction | null {
  const plays = actions.filter(
    (action): action is PlayCardAction => action.type === 'PLAY_CARD' && action.handIndex === handIndex,
  );
  if (plays.length !== 1 || plays[0]!.targetInstanceId) return null;
  return plays[0]!;
}
