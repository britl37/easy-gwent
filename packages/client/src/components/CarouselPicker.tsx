import { Card } from './Card.tsx';

export interface CarouselPickerProps {
  title: string;
  cardIds: string[];
  onPick: (index: number) => void;
  /** Label for the decline/finish button; omit to hide it. */
  declineLabel?: string;
  onDecline?: () => void;
}

/** W3-style modal card carousel used for redraw / medic / deck browsing. */
export function CarouselPicker({ title, cardIds, onPick, declineLabel, onDecline }: CarouselPickerProps) {
  return (
    <div className="carousel-overlay">
      <div className="carousel">
        <h2>{title}</h2>
        <div className="carousel-cards">
          {cardIds.length === 0 && <p className="carousel-empty">No cards available</p>}
          {cardIds.map((id, i) => (
            <Card key={`${id}-${i}`} cardId={id} size="big" onClick={() => onPick(i)} />
          ))}
        </div>
        {declineLabel && onDecline && (
          <button className="btn" onClick={onDecline}>
            {declineLabel}
          </button>
        )}
      </div>
    </div>
  );
}
