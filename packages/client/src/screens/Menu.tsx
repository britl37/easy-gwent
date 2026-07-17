import type { PlayableFaction } from '@gwent/data';
import { useState } from 'react';

const FACTIONS: Array<{ id: PlayableFaction; name: string }> = [
  { id: 'northern_realms', name: 'Northern Realms' },
  { id: 'nilfgaard', name: 'Nilfgaard' },
  { id: 'scoiatael', name: "Scoia'tael" },
  { id: 'monsters', name: 'Monsters' },
  { id: 'skellige', name: 'Skellige' },
];

export function MenuScreen({
  onPlayAi,
}: {
  onPlayAi: (faction: PlayableFaction, aiFaction: PlayableFaction) => void;
}) {
  const [faction, setFaction] = useState<PlayableFaction>('northern_realms');
  const [aiFaction, setAiFaction] = useState<PlayableFaction>('nilfgaard');

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
        <h3>Your faction</h3>
        {picker(faction, setFaction)}
        <h3>Opponent faction</h3>
        {picker(aiFaction, setAiFaction)}
        <button className="btn btn-primary" onClick={() => onPlayAi(faction, aiFaction)}>
          Play vs AI (easy)
        </button>
        <p className="menu-note">Deck editor, difficulties and multiplayer coming in later phases.</p>
      </div>
    </div>
  );
}
