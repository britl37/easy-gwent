import type { Difficulty } from '@gwent/ai';
import type { PlayableFaction } from '@gwent/data';
import type { UserPublic } from '@gwent/engine';
import { useState } from 'react';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

const FACTIONS: Array<{ id: PlayableFaction; name: string }> = [
  { id: 'northern_realms', name: 'Northern Realms' },
  { id: 'nilfgaard', name: 'Nilfgaard' },
  { id: 'scoiatael', name: "Scoia'tael" },
  { id: 'monsters', name: 'Monsters' },
  { id: 'skellige', name: 'Skellige' },
];

export function MenuScreen({
  user,
  onPlayAi,
  onEditDeck,
  onMultiplayer,
  onLeaderboard,
  onAccount,
  onLogout,
}: {
  user: UserPublic | null;
  onPlayAi: (faction: PlayableFaction, aiFaction: PlayableFaction, difficulty: Difficulty) => void;
  onEditDeck: (faction: PlayableFaction) => void;
  onMultiplayer: () => void;
  onLeaderboard: () => void;
  onAccount: () => void;
  onLogout: () => void;
}) {
  const [faction, setFaction] = useState<PlayableFaction>('northern_realms');
  const [aiFaction, setAiFaction] = useState<PlayableFaction>('nilfgaard');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');

  const picker = (value: PlayableFaction, set: (f: PlayableFaction) => void) => (
    <div className="faction-picker">
      {FACTIONS.map((f) => (
        <button key={f.id} className={`btn ${value === f.id ? 'btn-selected' : ''}`} onClick={() => set(f.id)}>
          {f.name}
        </button>
      ))}
    </div>
  );

  return (
    <div className="menu-screen">
      <h1 className="title">GWENT</h1>
      <div className="menu-box">
        {user ? (
          <p className="menu-note user-stats">
            {user.username} · {user.wins}W–{user.losses}L–{user.draws}D
            <button className="btn btn-small" onClick={onLogout}>
              Log out
            </button>
          </p>
        ) : (
          <p className="menu-note">
            Not signed in
            <button className="btn btn-small" onClick={onAccount}>
              Account
            </button>
          </p>
        )}

        <h3>Your faction</h3>
        {picker(faction, setFaction)}
        <h3>Opponent faction (AI)</h3>
        {picker(aiFaction, setAiFaction)}
        <h3>Difficulty</h3>
        <div className="faction-picker">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              className={`btn ${difficulty === d ? 'btn-selected' : ''}`}
              onClick={() => setDifficulty(d)}
            >
              {d[0]!.toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => onPlayAi(faction, aiFaction, difficulty)}>
          Play vs AI
        </button>
        <button className="btn btn-primary" onClick={onMultiplayer}>
          Multiplayer
        </button>
        <button className="btn" onClick={onLeaderboard}>
          Leaderboard
        </button>
        <button className="btn" onClick={() => onEditDeck(faction)}>
          Edit deck
        </button>
      </div>
    </div>
  );
}
