import { byId, type Row } from '@gwent/data';
import { effectiveStrength, rowScore, scores, type GameState, type PlayerId } from '@gwent/engine';
import { Card } from './Card.tsx';

const ROW_ORDER_TOP: Row[] = ['siege', 'ranged', 'melee'];
const ROW_ORDER_BOTTOM: Row[] = ['melee', 'ranged', 'siege'];

export interface BoardProps {
  state: GameState;
  human: PlayerId;
  /** Rows the human may currently target (row-select mode). */
  targetRows?: Row[];
  onRowClick?: (row: Row) => void;
  /** Own-unit targeting (decoy). */
  targetInstanceIds?: string[];
  onUnitClick?: (instanceId: string) => void;
  onHover?: (cardId: string | null) => void;
}

function BoardRow({
  state,
  player,
  row,
  mine,
  targetable,
  onRowClick,
  targetInstanceIds,
  onUnitClick,
  onHover,
}: {
  state: GameState;
  player: PlayerId;
  row: Row;
  mine: boolean;
  targetable: boolean;
  onRowClick?: (row: Row) => void;
  targetInstanceIds?: string[];
  onUnitClick?: (instanceId: string) => void;
  onHover?: (cardId: string | null) => void;
}) {
  const rs = state.players[player].rows[row];
  return (
    <div
      className={`board-row row-${row} ${mine ? 'row-mine' : 'row-theirs'} ${targetable ? 'row-targetable' : ''}`}
      onClick={targetable ? () => onRowClick?.(row) : undefined}
    >
      <div className={`row-badge ${rs.hornActive ? 'horn' : ''}`}>{rowScore(state, player, row)}</div>
      <div className="row-units">
        {rs.units.map((u) => {
          const canTarget = mine && targetInstanceIds?.includes(u.instanceId);
          return (
            <Card
              key={u.instanceId}
              cardId={u.cardId}
              strength={byId(u.cardId).type === 'unit' ? effectiveStrength(state, player, row, u) : undefined}
              selected={canTarget}
              onClick={canTarget ? () => onUnitClick?.(u.instanceId) : undefined}
              onHover={onHover}
            />
          );
        })}
      </div>
    </div>
  );
}

export function Board({ state, human, targetRows, onRowClick, targetInstanceIds, onUnitClick, onHover }: BoardProps) {
  const opp: PlayerId = human === 0 ? 1 : 0;
  const [s0, s1] = scores(state);
  const [oppScore, myScore] = human === 0 ? [s1, s0] : [s0, s1];

  return (
    <div className="board">
      <div className="board-half board-opponent">
        <div className="half-score">{oppScore}</div>
        {ROW_ORDER_TOP.map((row) => (
          <BoardRow key={row} state={state} player={opp} row={row} mine={false} targetable={false} onHover={onHover} />
        ))}
      </div>
      <div className="board-divider" />
      <div className="board-half board-mine">
        {ROW_ORDER_BOTTOM.map((row) => (
          <BoardRow
            key={row}
            state={state}
            player={human}
            row={row}
            mine
            targetable={!!targetRows?.includes(row)}
            onRowClick={onRowClick}
            targetInstanceIds={targetInstanceIds}
            onUnitClick={onUnitClick}
            onHover={onHover}
          />
        ))}
        <div className="half-score">{myScore}</div>
      </div>
    </div>
  );
}
