import { Card } from './Card.tsx';

export interface HandProps {
  cardIds: string[];
  /** Hand indexes that currently have at least one legal play. */
  playableIndexes: Set<number>;
  selectedIndex: number | null;
  onCardClick: (index: number) => void;
  onHover?: (cardId: string | null) => void;
}

export function Hand({ cardIds, playableIndexes, selectedIndex, onCardClick, onHover }: HandProps) {
  return (
    <div className="hand">
      {cardIds.map((id, i) => (
        <Card
          key={`${id}-${i}`}
          cardId={id}
          size="hand"
          selected={selectedIndex === i}
          dimmed={!playableIndexes.has(i)}
          onClick={playableIndexes.has(i) ? () => onCardClick(i) : undefined}
          onHover={onHover}
        />
      ))}
    </div>
  );
}
