import type { Row } from '@gwent/data';
import {
  legalActions,
  type Action,
  type GameState,
  type PlayCardAction,
  type ServerMsg,
  type UserPublic,
} from '@gwent/engine';
import { useEffect, useMemo, useState } from 'react';
import { Board } from '../components/Board.tsx';
import { CarouselPicker } from '../components/CarouselPicker.tsx';
import { Hand } from '../components/Hand.tsx';
import { LogPanel, StatusColumn } from '../components/SidePanel.tsx';
import type { MultiplayerSession } from './Lobby.tsx';

export function MultiplayerGameScreen({
  session,
  onExit,
}: {
  session: MultiplayerSession;
  onExit: (updatedUser?: UserPublic) => void;
}) {
  const human = session.you;
  const [state, setState] = useState<GameState | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [matchLine, setMatchLine] = useState<string | null>(null);
  const [updatedUser, setUpdatedUser] = useState<UserPublic | null>(null);
  const [opponentLeft, setOpponentLeft] = useState(false);

  useEffect(() => {
    const onMsg = (msg: ServerMsg) => {
      if (msg.t === 'state') {
        setState(msg.state);
        setSelected(null);
        return;
      }
      if (msg.t === 'error') {
        setBanner(`${msg.code}: ${msg.message}`);
        return;
      }
      if (msg.t === 'opponent_left') {
        setOpponentLeft(true);
        setBanner('Opponent left the game.');
        return;
      }
      if (msg.t === 'match_result') {
        setUpdatedUser(msg.you);
        const stats = `${msg.you.wins}W–${msg.you.losses}L–${msg.you.draws}D`;
        if (msg.result === 'win') setMatchLine(`Victory! (${stats})`);
        else if (msg.result === 'loss') setMatchLine(`Defeat. (${stats})`);
        else setMatchLine(`Draw. (${stats})`);
      }
    };
    session.socket.connect(onMsg);
    return () => {
      session.socket.send({ t: 'leave' });
      session.socket.close();
    };
  }, [session]);

  const me = state?.players[human];
  const myMove =
    !!state &&
    !!me &&
    state.phase === 'play' &&
    !state.pendingChoice &&
    state.turn === human &&
    !me.passed;

  const legal = useMemo<Action[]>(
    () => (state && state.phase !== 'finished' ? legalActions(state, human) : []),
    [state, human],
  );

  const dispatch = (a: Action) => {
    setSelected(null);
    setBanner(null);
    session.socket.send({ t: 'action', action: { ...a, player: human } });
  };

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
    else if (plays.length > 1) setSelected(i);
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

  if (!state || !me) {
    return (
      <div className="menu-screen">
        <p className="menu-note">
          Waiting for game state… vs {session.opponentUsername} (room {session.roomId})
        </p>
        {banner && <p className="menu-error">{banner}</p>}
        <button className="btn" onClick={() => onExit(updatedUser ?? undefined)}>
          Leave
        </button>
      </div>
    );
  }

  const redrawing = state.phase === 'redraw' && me.redrawsLeft > 0;
  const medic =
    state.pendingChoice?.kind === 'medic' && state.pendingChoice.player === human
      ? state.pendingChoice
      : null;

  const finished = state.phase === 'finished';
  const resultText =
    matchLine ??
    (finished
      ? state.drawn
        ? 'Draw!'
        : state.winner === human
          ? 'You won!'
          : 'You lost.'
      : null);

  const showResult = finished || opponentLeft;

  return (
    <div className="game-screen">
      <StatusColumn
        state={state}
        human={human}
        canPlayLeader={!!canLeader}
        onLeader={() => dispatch({ type: 'PLAY_LEADER', player: human })}
        opponentName={session.opponentUsername}
      />
      <div className="game-center">
        {banner && <div className="mp-banner">{banner}</div>}
        <Board
          state={state}
          human={human}
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
          <button
            className="btn btn-pass"
            disabled={!canPass}
            onClick={() => dispatch({ type: 'PASS', player: human })}
          >
            Pass
          </button>
        </div>
      </div>
      <LogPanel state={state} previewCardId={preview} />

      {redrawing && (
        <CarouselPicker
          title={`Redraw up to ${me.redrawsLeft} card${me.redrawsLeft > 1 ? 's' : ''}`}
          cardIds={me.hand}
          onPick={(i) => dispatch({ type: 'REDRAW', player: human, handIndex: i })}
          declineLabel="Keep these cards"
          onDecline={() => dispatch({ type: 'REDRAW', player: human, handIndex: null })}
        />
      )}
      {medic && (
        <CarouselPicker
          title="Medic: choose a card to revive"
          cardIds={medic.options}
          onPick={(i) => dispatch({ type: 'RESOLVE_CHOICE', player: human, cardId: medic.options[i]! })}
          declineLabel="Decline"
          onDecline={() => dispatch({ type: 'RESOLVE_CHOICE', player: human, cardId: null })}
        />
      )}
      {showResult && (
        <div className="carousel-overlay">
          <div className="carousel result-box">
            <h2>{resultText ?? banner}</h2>
            <p className="menu-note">vs {session.opponentUsername}</p>
            {finished && (
              <table className="round-table">
                <tbody>
                  {state.roundHistory.map((r, i) => (
                    <tr key={i}>
                      <td>Round {i + 1}</td>
                      <td>
                        {r.scores[human]} – {r.scores[1 - human]}
                      </td>
                      <td>{r.winner === null ? 'draw' : r.winner === human ? 'you' : 'opponent'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button className="btn" onClick={() => onExit(updatedUser ?? undefined)}>
              Back to menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
