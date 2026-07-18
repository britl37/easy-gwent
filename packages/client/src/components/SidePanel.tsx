import { byId, getCardText } from '@gwent/data';
import type { GameState, PlayerId, WeatherKind } from '@gwent/engine';
import { Card } from './Card.tsx';

const WEATHER_LABEL: Record<WeatherKind, string> = {
  frost: 'Biting Frost',
  fog: 'Impenetrable Fog',
  rain: 'Torrential Rain',
};

export function StatusColumn({
  state,
  human,
  canPlayLeader,
  onLeader,
  opponentName,
}: {
  state: GameState;
  human: PlayerId;
  canPlayLeader: boolean;
  onLeader: () => void;
  opponentName?: string;
}) {
  const opp: PlayerId = human === 0 ? 1 : 0;
  const weather = (Object.keys(state.weather) as WeatherKind[]).filter((w) => state.weather[w]);

  const seat = (p: PlayerId, mine: boolean) => {
    const ps = state.players[p];
    return (
      <div className={`seat ${mine ? 'seat-mine' : ''} ${state.turn === p && state.phase === 'play' ? 'seat-active' : ''}`}>
        <div className="seat-name">{mine ? 'You' : opponentName ?? 'Opponent'}</div>
        <div className="seat-gems">{'◆'.repeat(ps.gems)}{'◇'.repeat(Math.max(0, 2 - ps.gems))}</div>
        <div className="seat-info">
          Hand {ps.hand.length} · Deck {ps.deck.length}
          {ps.passed && <span className="passed"> · PASSED</span>}
        </div>
        <div className="seat-leader">
          <div className="seat-leader-row">
            {byId(ps.leaderId).name}
            {ps.leaderUsed ? ' (used)' : mine && canPlayLeader ? (
              <button className="btn btn-small" onClick={onLeader}>
                Use
              </button>
            ) : null}
          </div>
          <div className="seat-leader-ability">{getCardText(byId(ps.leaderId)).ability}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="status-col">
      {seat(opp, false)}
      <div className="weather-box">
        {weather.length === 0 ? <span className="weather-clear">Clear skies</span> : weather.map((w) => <span key={w}>{WEATHER_LABEL[w]}</span>)}
      </div>
      <div className="round-info">Round {state.round}</div>
      {seat(human, true)}
    </div>
  );
}

export function LogPanel({
  state,
  previewCardId,
  selected,
  canPlaySelected,
  playHint,
  onConfirmPlay,
}: {
  state: GameState;
  previewCardId: string | null;
  /** True when a hand card is actively selected (not just hovered). */
  selected?: boolean;
  /** Selected card has a legal play and can be confirmed. */
  canPlaySelected?: boolean;
  /** e.g. "Click a highlighted row" */
  playHint?: string | null;
  /** Click the big card art to confirm play when possible. */
  onConfirmPlay?: () => void;
}) {
  const def = previewCardId
    ? (() => {
        try {
          return byId(previewCardId);
        } catch {
          return null;
        }
      })()
    : null;
  const text = def ? getCardText(def) : null;
  const confirmable = !!(selected && canPlaySelected && onConfirmPlay);

  return (
    <div className="side-panel">
      <div className={`preview-slot ${confirmable ? 'preview-confirmable' : ''} ${selected ? 'preview-selected' : ''}`}>
        {previewCardId && (
          <Card
            cardId={previewCardId}
            size="big"
            onClick={confirmable ? onConfirmPlay : undefined}
          />
        )}
        {!previewCardId && <div className="preview-empty">Hover or select a card</div>}
      </div>

      {def && text && (
        <div className="card-info">
          <div className="card-info-name">{def.name}</div>
          {text.flavor && <div className="card-info-flavor">“{text.flavor}”</div>}
          <div className="card-info-ability">{text.ability}</div>
          {selected && (
            <div className="card-info-hint">
              {canPlaySelected
                ? playHint ?? 'Click the card art above to play'
                : playHint ?? 'Cannot play this card right now'}
            </div>
          )}
          {confirmable && (
            <button className="btn btn-primary btn-play-confirm" onClick={onConfirmPlay}>
              Play card
            </button>
          )}
        </div>
      )}

      <div className="log">
        {state.log.slice(-30).map((e, i) => (
          <div key={i} className="log-entry">
            {e.text}
          </div>
        ))}
      </div>
    </div>
  );
}
