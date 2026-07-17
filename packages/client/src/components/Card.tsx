import { byId } from '@gwent/data';
import { useState } from 'react';
import { placeholderArt } from '../assets/placeholder.ts';

export interface CardProps {
  cardId: string;
  /** Effective strength to display (falls back to base strength). */
  strength?: number;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  onHover?: (cardId: string | null) => void;
  size?: 'row' | 'hand' | 'big';
}

export function Card({ cardId, strength, selected, dimmed, onClick, onHover, size = 'row' }: CardProps) {
  const [failed, setFailed] = useState(false);
  const def = byId(cardId);
  const src = failed ? placeholderArt(cardId) : `/assets/cards/${cardId}.png`;
  const shown = strength ?? def.strength;
  const boosted = def.type === 'unit' && shown !== undefined && def.strength !== undefined && shown !== def.strength;

  return (
    <div
      className={[
        'card',
        `card-${size}`,
        def.hero ? 'card-hero' : '',
        selected ? 'card-selected' : '',
        dimmed ? 'card-dimmed' : '',
        onClick ? 'card-clickable' : '',
      ].join(' ')}
      title={def.name}
      onClick={onClick}
      onMouseEnter={() => onHover?.(cardId)}
      onMouseLeave={() => onHover?.(null)}
    >
      <img src={src} alt={def.name} draggable={false} onError={() => setFailed(true)} />
      {def.type === 'unit' && shown !== undefined && (
        <span className={`card-strength ${boosted ? (shown > (def.strength ?? 0) ? 'buffed' : 'debuffed') : ''}`}>
          {shown}
        </span>
      )}
    </div>
  );
}
