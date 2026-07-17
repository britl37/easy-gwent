import { byId } from '@gwent/data';
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
}: {
  state: GameState;
  human: PlayerId;
  canPlayLeader: boolean;
  onLeader: () => void;
}) {
  const opp: PlayerId = human === 0 ? 1 : 0;
  const weather = (Object.keys(state.weather) as WeatherKind[]).filter((w) => state.weather[w]);

  const seat = (p: PlayerId, mine: boolean) => {
    const ps = state.players[p];
    return (
      <div className={`seat ${mine ? 'seat-mine' : ''} ${state.turn === p && state.phase === 'play' ? 'seat-active' : ''}`}>
        <div className="seat-name">{mine ? 'You' : 'Opponent'}</div>
        <div className="seat-gems">{'◆'.repeat(ps.gems)}{'◇'.repeat(Math.max(0, 2 - ps.gems))}</div>
        <div className="seat-info">
          Hand {ps.hand.length} · Deck {ps.deck.length}
          {ps.passed && <span className="passed"> · PASSED</span>}
        </div>
        <div className="seat-leader">
          {byId(ps.leaderId).name}
          {ps.leaderUsed ? ' (used)' : mine && canPlayLeader ? (
            <button className="btn btn-small" onClick={onLeader}>
              Use
            </button>
          ) : null}
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

export function LogPanel({ state, previewCardId }: { state: GameState; previewCardId: string | null }) {
  return (
    <div className="side-panel">
      <div className="preview-slot">{previewCardId && <Card cardId={previewCardId} size="big" />}</div>
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
