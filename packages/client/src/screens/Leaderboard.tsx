import type { LeaderboardEntry } from '@gwent/engine';
import { useEffect, useState } from 'react';
import { fetchLeaderboard } from '../net/auth.ts';

export function LeaderboardScreen({ onBack }: { onBack: () => void }) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const r = await fetchLeaderboard(50);
      if (!r.ok) {
        setError(r.message);
        setEntries([]);
        return;
      }
      setEntries(r.data.entries);
    })();
  }, []);

  return (
    <div className="menu-screen">
      <h1 className="title">LEADERBOARD</h1>
      <div className="menu-box leaderboard-box">
        <p className="menu-note">Multiplayer ranked results only (AI games excluded).</p>
        {error && <p className="menu-error">{error}</p>}
        {entries === null && <p className="menu-note">Loading…</p>}
        {entries && entries.length === 0 && !error && <p className="menu-note">No matches recorded yet.</p>}
        {entries && entries.length > 0 && (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>W</th>
                <th>L</th>
                <th>D</th>
                <th>WR</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.username}>
                  <td>{e.rank}</td>
                  <td>{e.username}</td>
                  <td>{e.wins}</td>
                  <td>{e.losses}</td>
                  <td>{e.draws}</td>
                  <td>{Math.round(e.winRate * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button className="btn" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
