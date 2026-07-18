import { byId } from '@gwent/data';
import { Card } from './Card.tsx';
import type { RevealEvent } from '../game/reveal.ts';

export interface PlayRevealProps {
  reveal: RevealEvent | null;
  turnToast: boolean;
  /** True when the revealed play belongs to the local player. */
  mine: (r: RevealEvent) => boolean;
  /** Display name for the opponent ("Opponent" in single-player). */
  opponentName: string;
}

const ROW_LABEL: Record<string, string> = {
  melee: 'melee',
  ranged: 'ranged',
  siege: 'siege',
};

/**
 * Presentational overlays: a center-screen spotlight for each card played and
 * a "Your turn" toast. Pointer events pass through — never blocks input.
 */
export function PlayReveal({ reveal, turnToast, mine, opponentName }: PlayRevealProps) {
  return (
    <>
      {reveal && (
        <div className="play-reveal" key={reveal.key} aria-live="polite">
          <div className={`play-reveal-inner ${mine(reveal) ? 'play-reveal-mine' : 'play-reveal-theirs'}`}>
            <Card cardId={reveal.cardId} size="big" />
            <div className="play-reveal-label">
              <strong>{mine(reveal) ? 'You play' : `${opponentName} plays`}</strong>
              <span>
                {byId(reveal.cardId).name} → {ROW_LABEL[reveal.row] ?? reveal.row}
              </span>
            </div>
          </div>
        </div>
      )}
      {turnToast && !reveal && (
        <div className="turn-toast" aria-live="polite">
          Your turn
        </div>
      )}
    </>
  );
}
