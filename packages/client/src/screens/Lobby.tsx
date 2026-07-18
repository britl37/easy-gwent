import type { PlayableFaction } from '@gwent/data';
import type { ServerMsg, UserPublic } from '@gwent/engine';
import { useEffect, useRef, useState } from 'react';
import { loadDeck } from '../game/decks.ts';
import { clearActiveRoom, getActiveRoom, saveActiveRoom } from '../net/activeRoom.ts';
import { getToken } from '../net/auth.ts';
import { GwentSocket } from '../net/socket.ts';

const FACTIONS: Array<{ id: PlayableFaction; name: string }> = [
  { id: 'northern_realms', name: 'Northern Realms' },
  { id: 'nilfgaard', name: 'Nilfgaard' },
  { id: 'scoiatael', name: "Scoia'tael" },
  { id: 'monsters', name: 'Monsters' },
  { id: 'skellige', name: 'Skellige' },
];

export interface MultiplayerSession {
  socket: GwentSocket;
  roomId: string;
  you: 0 | 1;
  opponentFaction: PlayableFaction;
  opponentUsername: string;
}

export function LobbyScreen({
  user,
  onBack,
  onJoined,
}: {
  user: UserPublic | null;
  onBack: () => void;
  onJoined: (session: MultiplayerSession) => void;
}) {
  const [faction, setFaction] = useState<PlayableFaction>('northern_realms');
  const [joinCode, setJoinCode] = useState('');
  const [status, setStatus] = useState<string>('Connecting…');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [resumeRoom, setResumeRoom] = useState<string | null>(getActiveRoom());
  const socketRef = useRef<GwentSocket | null>(null);
  const joinedRef = useRef(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError('Not logged in');
      setStatus('Authentication required');
      return;
    }

    const sock = new GwentSocket();
    socketRef.current = sock;
    sock.connect((msg: ServerMsg) => {
      if (msg.t === 'error') {
        if (msg.code === 'rejoin_failed') {
          // The stored game is gone (finished, forfeited, or GC'd).
          clearActiveRoom();
          setResumeRoom(null);
          setError('That game is no longer available.');
          setStatus('Connected. Create a room or join with a code.');
          return;
        }
        setError(`${msg.code}: ${msg.message}`);
        return;
      }
      if (msg.t === 'authed') {
        setAuthed(true);
        setStatus('Connected. Create a room or join with a code.');
        setError(null);
        return;
      }
      if (msg.t === 'room_created') {
        setRoomId(msg.roomId);
        setStatus(`Room ${msg.roomId} — waiting for opponent…`);
        setError(null);
        return;
      }
      if (msg.t === 'joined') {
        if (joinedRef.current) return;
        joinedRef.current = true;
        saveActiveRoom(msg.roomId);
        onJoined({
          socket: sock,
          roomId: msg.roomId,
          you: msg.you,
          opponentFaction: msg.opponentFaction,
          opponentUsername: msg.opponentUsername,
        });
      }
    });

    // Re-authenticate if the socket drops and reopens while in the lobby.
    sock.onReconnect = () => {
      setAuthed(false);
      setStatus('Reconnecting…');
      sock.send({ t: 'auth', token });
    };

    // Auth as soon as the socket is open (poll briefly).
    const tryAuth = () => {
      if (sock.ready) {
        sock.send({ t: 'auth', token });
        return;
      }
      setTimeout(tryAuth, 50);
    };
    tryAuth();

    return () => {
      if (!joinedRef.current) sock.close();
    };
  }, [onJoined]);

  const create = () => {
    setError(null);
    const deck = loadDeck(faction);
    socketRef.current?.send({ t: 'create_room', deck });
    setStatus('Creating room…');
  };

  const resume = () => {
    if (!resumeRoom) return;
    setError(null);
    socketRef.current?.send({ t: 'rejoin', roomId: resumeRoom });
    setStatus(`Resuming ${resumeRoom}…`);
  };

  const join = () => {
    setError(null);
    const id = joinCode.trim().toLowerCase();
    if (!id) {
      setError('Enter a room code');
      return;
    }
    const deck = loadDeck(faction);
    socketRef.current?.send({ t: 'join_room', roomId: id, deck });
    setStatus(`Joining ${id}…`);
  };

  return (
    <div className="menu-screen">
      <h1 className="title">MULTIPLAYER</h1>
      <div className="menu-box">
        {user && (
          <p className="menu-note user-stats">
            {user.username} · {user.wins}W–{user.losses}L–{user.draws}D
          </p>
        )}
        <h3>Your faction (uses saved deck)</h3>
        <div className="faction-picker">
          {FACTIONS.map((f) => (
            <button
              key={f.id}
              className={`btn ${faction === f.id ? 'btn-selected' : ''}`}
              onClick={() => setFaction(f.id)}
            >
              {f.name}
            </button>
          ))}
        </div>

        {resumeRoom && (
          <button className="btn btn-primary" onClick={resume} disabled={!!roomId || !authed}>
            Resume game ({resumeRoom})
          </button>
        )}

        <button className="btn btn-primary" onClick={create} disabled={!!roomId || !authed}>
          Create room
        </button>

        {roomId && (
          <p className="room-code">
            Invite code: <strong>{roomId}</strong>
          </p>
        )}

        <h3>Or join</h3>
        <div className="join-row">
          <input
            className="code-input"
            placeholder="room code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            maxLength={8}
            disabled={!!roomId || !authed}
          />
          <button className="btn" onClick={join} disabled={!!roomId || !authed}>
            Join
          </button>
        </div>

        <p className="menu-note">{status}</p>
        {error && <p className="menu-error">{error}</p>}

        <button
          className="btn"
          onClick={() => {
            socketRef.current?.close();
            onBack();
          }}
        >
          Back
        </button>
      </div>
    </div>
  );
}
