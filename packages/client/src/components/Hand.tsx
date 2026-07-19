import { Card } from './Card.tsx';

export interface HandProps {
  cardIds: string[];
  /** Hand indexes that currently have at least one legal play. */
  playableIndexes: Set<number>;
  selectedIndex: number | null;
  /** Always called on click — selection / inspect, not auto-play. */
  onCardClick: (index: number) => void;
  /** Fast play when a double-click resolves to one unambiguous action. */
  onCardDoubleClick?: (index: number) => void;
  onHover?: (cardId: string | null) => void;
}

export function Hand({ cardIds, playableIndexes, selectedIndex, onCardClick, onCardDoubleClick, onHover }: HandProps) {
  return (
    <div className="hand">
      {cardIds.map((id, i) => (
        <Card
          key={`${id}-${i}`}
          cardId={id}
          size="hand"
          selected={selectedIndex === i}
          dimmed={!playableIndexes.has(i)}
          onClick={() => onCardClick(i)}
          onDoubleClick={onCardDoubleClick ? () => onCardDoubleClick(i) : undefined}
          onHover={onHover}
        />
      ))}
    </div>
  );
}
