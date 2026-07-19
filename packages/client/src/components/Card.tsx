import { byId } from '@gwent/data';
import { useEffect, useState } from 'react';
import { placeholderArt } from '../assets/placeholder.ts';

export interface CardProps {
  cardId: string;
  /** Effective strength to display (falls back to base strength). */
  strength?: number;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onHover?: (cardId: string | null) => void;
  size?: 'row' | 'hand' | 'big';
}

const EXTS = ['.webp', '.png', '.jpg'] as const;
export const CARD_ART_REVISION = '20260719-2';

export function cardArtUrl(cardId: string, extension: (typeof EXTS)[number]): string {
  return `/assets/cards/${cardId}${extension}?v=${CARD_ART_REVISION}`;
}

export function Card({ cardId, strength, selected, dimmed, onClick, onDoubleClick, onHover, size = 'row' }: CardProps) {
  const [extIndex, setExtIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setExtIndex(0);
    setFailed(false);
  }, [cardId]);

  const def = byId(cardId);
  const forcePlaceholder =
    typeof document !== 'undefined' && document.documentElement.classList.contains('no-card-art');
  const src =
    forcePlaceholder || failed || extIndex >= EXTS.length
      ? placeholderArt(cardId)
      : cardArtUrl(cardId, EXTS[extIndex]!);

  const shown = strength ?? def.strength;
  const boosted = def.type === 'unit' && shown !== undefined && def.strength !== undefined && shown !== def.strength;

  const onImgError = () => {
    if (extIndex + 1 < EXTS.length) setExtIndex((i) => i + 1);
    else setFailed(true);
  };

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
      onDoubleClick={onDoubleClick}
      onMouseEnter={() => onHover?.(cardId)}
      onMouseLeave={() => onHover?.(null)}
    >
      <img
        src={src}
        alt={def.name}
        draggable={false}
        onError={forcePlaceholder ? undefined : onImgError}
      />
      {def.type === 'unit' && shown !== undefined && (
        <span className={`card-strength ${boosted ? (shown > (def.strength ?? 0) ? 'buffed' : 'debuffed') : ''}`}>
          {shown}
        </span>
      )}
    </div>
  );
}
