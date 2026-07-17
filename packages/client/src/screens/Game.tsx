import { byId, type PlayableFaction, type Row } from '@gwent/data';
import { legalActions, type Action, type GameState, type PlayCardAction } from '@gwent/engine';
import { useMemo, useState } from 'react';
import { Board } from '../components/Board.tsx';
import { CarouselPicker } from '../components/CarouselPicker.tsx';
import { Hand } from '../components/Hand.tsx';
import { LogPanel, StatusColumn } from '../components/SidePanel.tsx';
import { loadDeck } from '../game/decks.ts';
import { HUMAN, humanAct, newLocalGame, starterDeck } from '../game/localGame.ts';

export interface GameScreenProps {
  faction: PlayableFaction;
  aiFaction: PlayableFaction;
  onExit: () => void;
}

export function GameScreen({ faction, aiFaction, onExit }: GameScreenProps) {
  const [state, setState] = useState<GameState>(() =>
    newLocalGame(Date.now() >>> 0, loadDeck(faction), starterDeck(aiFaction)),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const me = state.players[HUMAN];
  const myMove =
    state.phase === 'play' &&
    !state.pendingChoice &&
    state.turn === HUMAN &&
    !me.passed;

  const legal = useMemo<Action[]>(
    () => (state.phase === 'finished' ? [] : legalActions(state, HUMAN)),
    [state],
  );

  const dispatch = (a: Action) => {
    setSelected(null);
    setState((s) => humanAct(s, a));
  };

  // Legal PLAY_CARD actions for the currently selected hand card.
  const selectedPlays = useMemo<PlayCardAction[]>(() => {
    if (selected === null) return [];
    return legal.filter((a): a is PlayCardAction => a.type === 'PLAY_CARD' && a.handIndex === selected);
  }, [legal, selected]);

  const playableIndexes = useMemo(() => {
    const set = new Set<number>();
    if (myMove) for (const a of legal) if (a.type === 'PLAY_CARD') set.add(a.handIndex);
    return set;
  }, [legal, myMove]);

  const onHandClick = (i: number) => {
    if (!myMove) return;
    if (selected === i) {
      setSelected(null);
      return;
    }
    const plays = legal.filter((a): a is PlayCardAction => a.type === 'PLAY_CARD' && a.handIndex === i);
    if (plays.length === 1) dispatch(plays[0]!);
    else if (plays.length > 1) setSelected(i); // needs a row / decoy target
  };

  const targetRows = useMemo<Row[]>(() => {
    const rows = new Set<Row>();
    for (const a of selectedPlays) if (a.row && a.targetInstanceId === undefined) rows.add(a.row);
    return [...rows];
  }, [selectedPlays]);

  const targetInstanceIds = useMemo(
    () => selectedPlays.flatMap((a) => (a.targetInstanceId ? [a.targetInstanceId] : [])),
    [selectedPlays],
  );

  const canPass = myMove && legal.some((a) => a.type === 'PASS');
  const canLeader = myMove && legal.some((a) => a.type === 'PLAY_LEADER');

  // ---- modal choices -------------------------------------------------------

  const redrawing = state.phase === 'redraw' && me.redrawsLeft > 0;
  const medic = state.pendingChoice?.kind === 'medic' && state.pendingChoice.player === HUMAN ? state.pendingChoice : null;

  const finished = state.phase === 'finished';
  const resultText = finished
    ? state.drawn
      ? 'Draw!'
      : state.winner === HUMAN
        ? 'You won!'
        : 'You lost.'
    : null;

  return (
    <div className="game-screen">
      <StatusColumn
        state={state}
        human={HUMAN}
        canPlayLeader={canLeader}
        onLeader={() => dispatch({ type: 'PLAY_LEADER', player: HUMAN })}
      />
      <div className="game-center">
        <Board
          state={state}
          human={HUMAN}
          targetRows={targetRows}
          onRowClick={(row) => {
            const a = selectedPlays.find((p) => p.row === row && p.targetInstanceId === undefined);
            if (a) dispatch(a);
          }}
          targetInstanceIds={targetInstanceIds}
          onUnitClick={(instanceId) => {
            const a = selectedPlays.find((p) => p.targetInstanceId === instanceId);
            if (a) dispatch(a);
          }}
          onHover={setPreview}
        />
        <div className="hand-bar">
          <Hand
            cardIds={me.hand}
            playableIndexes={playableIndexes}
            selectedIndex={selected}
            onCardClick={onHandClick}
            onHover={setPreview}
          />
          <button className="btn btn-pass" disabled={!canPass} onClick={() => dispatch({ type: 'PASS', player: HUMAN })}>
            Pass
          </button>
        </div>
      </div>
      <LogPanel state={state} previewCardId={preview} />

      {redrawing && (
        <CarouselPicker
          title={`Redraw up to ${me.redrawsLeft} card${me.redrawsLeft > 1 ? 's' : ''}`}
          cardIds={me.hand}
          onPick={(i) => dispatch({ type: 'REDRAW', player: HUMAN, handIndex: i })}
          declineLabel="Keep these cards"
          onDecline={() => dispatch({ type: 'REDRAW', player: HUMAN, handIndex: null })}
        />
      )}
      {medic && (
        <CarouselPicker
          title="Medic: choose a card to revive"
          cardIds={medic.options}
          onPick={(i) => dispatch({ type: 'RESOLVE_CHOICE', player: HUMAN, cardId: medic.options[i]! })}
          declineLabel="Decline"
          onDecline={() => dispatch({ type: 'RESOLVE_CHOICE', player: HUMAN, cardId: null })}
        />
      )}
      {finished && (
        <div className="carousel-overlay">
          <div className="carousel result-box">
            <h2>{resultText}</h2>
            <table className="round-table">
              <tbody>
                {state.roundHistory.map((r, i) => (
                  <tr key={i}>
                    <td>Round {i + 1}</td>
                    <td>
                      {r.scores[HUMAN]} – {r.scores[1 - HUMAN]}
                    </td>
                    <td>{r.winner === null ? 'draw' : r.winner === HUMAN ? 'you' : 'opponent'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn" onClick={onExit}>
              Back to menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
