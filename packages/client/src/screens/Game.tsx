import type { PlayableFaction, Row } from '@gwent/data';
import { legalActions, type Action, type GameState, type PlayCardAction } from '@gwent/engine';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Board } from '../components/Board.tsx';
import { CarouselPicker } from '../components/CarouselPicker.tsx';
import { Hand } from '../components/Hand.tsx';
import { PlayReveal } from '../components/PlayReveal.tsx';
import { LogPanel, StatusColumn } from '../components/SidePanel.tsx';
import { loadDeck } from '../game/decks.ts';
import { HUMAN, humanActSequence, newLocalGame, starterDeck, type Difficulty } from '../game/localGame.ts';
import { FIRST_STEP_MS, STEP_MS, usePlayReveals } from '../game/reveal.ts';

export interface GameScreenProps {
  faction: PlayableFaction;
  aiFaction: PlayableFaction;
  difficulty: Difficulty;
  onExit: () => void;
}

export function GameScreen({ faction, aiFaction, difficulty, onExit }: GameScreenProps) {
  const [state, setState] = useState<GameState>(() =>
    newLocalGame(Date.now() >>> 0, loadDeck(faction), starterDeck(aiFaction), difficulty),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

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

  // Paced AI: apply the human action instantly, then step the AI's responses
  // one state at a time so each play is visible.
  const pendingRef = useRef<GameState[]>([]);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [animating, setAnimating] = useState(false);

  const stepPending = () => {
    const next = pendingRef.current.shift();
    if (!next) {
      stepTimerRef.current = null;
      setAnimating(false);
      return;
    }
    setState(next);
    stepTimerRef.current = setTimeout(stepPending, STEP_MS);
  };

  useEffect(
    () => () => {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    },
    [],
  );

  const dispatch = (a: Action) => {
    if (animating) return;
    setSelected(null);
    setState((s) => {
      const seq = humanActSequence(s, a, difficulty);
      if (seq.length > 1) {
        pendingRef.current = seq.slice(1);
        setAnimating(true);
        // Hold after the human's play, then a beat before the AI responds.
        stepTimerRef.current = setTimeout(stepPending, FIRST_STEP_MS);
      }
      return seq[0]!;
    });
  };

  const { reveal, turnBanner } = usePlayReveals(state, HUMAN);

  const selectedPlays = useMemo<PlayCardAction[]>(() => {
    if (selected === null) return [];
    return legal.filter((a): a is PlayCardAction => a.type === 'PLAY_CARD' && a.handIndex === selected);
  }, [legal, selected]);

  const playableIndexes = useMemo(() => {
    const set = new Set<number>();
    if (myMove) for (const a of legal) if (a.type === 'PLAY_CARD') set.add(a.handIndex);
    return set;
  }, [legal, myMove]);

  /** First click: select + show panel. Never auto-plays. */
  const onHandClick = (i: number) => {
    if (selected === i) {
      setSelected(null);
      return;
    }
    setSelected(i);
  };

  const multiRow =
    selectedPlays.length > 1 && selectedPlays.every((p) => p.row && !p.targetInstanceId);
  const decoyTargets = selectedPlays.some((p) => p.targetInstanceId);

  // Exactly one legal play with no decoy target → confirm from the big preview.
  const canPlaySelected =
    myMove && selected !== null && selectedPlays.length === 1 && !selectedPlays[0]!.targetInstanceId;

  const playHint =
    selected === null
      ? null
      : !myMove
        ? 'Not your turn'
        : selectedPlays.length === 0
          ? 'This card cannot be played right now'
          : decoyTargets
            ? 'Click one of your non-hero units to decoy'
            : multiRow
              ? 'Click a highlighted row to place this card'
              : selectedPlays.length === 1
                ? 'Click the card art (or Play) to confirm'
                : 'Click a highlighted target on the board';

  const confirmPlay = () => {
    if (!canPlaySelected || !selectedPlays[0]) return;
    dispatch(selectedPlays[0]);
  };

  const targetRows = useMemo<Row[]>(() => {
    if (selected === null || !myMove) return [];
    const rows = new Set<Row>();
    for (const a of selectedPlays) if (a.row && a.targetInstanceId === undefined) rows.add(a.row);
    return [...rows];
  }, [selectedPlays, selected, myMove]);

  const targetInstanceIds = useMemo(
    () => (myMove ? selectedPlays.flatMap((a) => (a.targetInstanceId ? [a.targetInstanceId] : [])) : []),
    [selectedPlays, myMove],
  );

  const canPass = myMove && legal.some((a) => a.type === 'PASS');
  const canLeader = myMove && legal.some((a) => a.type === 'PLAY_LEADER');

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

  const panelCardId = selected !== null ? me.hand[selected]! : hoverId;

  return (
    <div className="game-screen">
      <PlayReveal
        reveal={reveal}
        turnBanner={turnBanner}
        mine={(r) => r.player === HUMAN}
        opponentName="Opponent"
      />
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
          onHover={setHoverId}
        />
        <div className="hand-bar">
          <Hand
            cardIds={me.hand}
            playableIndexes={playableIndexes}
            selectedIndex={selected}
            onCardClick={onHandClick}
            onHover={setHoverId}
          />
          <button className="btn btn-pass" disabled={!canPass} onClick={() => dispatch({ type: 'PASS', player: HUMAN })}>
            Pass
          </button>
        </div>
      </div>
      <LogPanel
        state={state}
        previewCardId={panelCardId}
        selected={selected !== null}
        canPlaySelected={canPlaySelected}
        playHint={playHint}
        onConfirmPlay={canPlaySelected ? confirmPlay : undefined}
      />

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
