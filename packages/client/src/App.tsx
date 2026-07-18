import type { Difficulty } from '@gwent/ai';
import type { PlayableFaction } from '@gwent/data';
import type { UserPublic } from '@gwent/engine';
import { useCallback, useEffect, useState } from 'react';
import { doLogout, fetchMe, getToken } from './net/auth.ts';
import { AuthScreen } from './screens/Auth.tsx';
import { DeckEditorScreen } from './screens/DeckEditor.tsx';
import { GameScreen } from './screens/Game.tsx';
import { LeaderboardScreen } from './screens/Leaderboard.tsx';
import { LobbyScreen, type MultiplayerSession } from './screens/Lobby.tsx';
import { MenuScreen } from './screens/Menu.tsx';
import { MultiplayerGameScreen } from './screens/MultiplayerGame.tsx';

type Screen =
  | { name: 'menu' }
  | { name: 'deck'; faction: PlayableFaction }
  | { name: 'game'; faction: PlayableFaction; aiFaction: PlayableFaction; difficulty: Difficulty }
  | { name: 'auth'; next: 'lobby' | 'menu' }
  | { name: 'lobby' }
  | { name: 'mp'; session: MultiplayerSession }
  | { name: 'leaderboard' };

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'menu' });
  const [user, setUser] = useState<UserPublic | null>(null);

  useEffect(() => {
    if (!getToken()) return;
    void fetchMe().then((r) => {
      if (r.ok) setUser(r.data.user);
      else void doLogout();
    });
  }, []);

  const onJoined = useCallback((session: MultiplayerSession) => {
    setScreen({ name: 'mp', session });
  }, []);

  const goMultiplayer = () => {
    if (user) setScreen({ name: 'lobby' });
    else setScreen({ name: 'auth', next: 'lobby' });
  };

  const logout = async () => {
    await doLogout();
    setUser(null);
    setScreen({ name: 'menu' });
  };

  if (screen.name === 'game') {
    return (
      <GameScreen
        faction={screen.faction}
        aiFaction={screen.aiFaction}
        difficulty={screen.difficulty}
        onExit={() => setScreen({ name: 'menu' })}
      />
    );
  }
  if (screen.name === 'deck') {
    return <DeckEditorScreen faction={screen.faction} onBack={() => setScreen({ name: 'menu' })} />;
  }
  if (screen.name === 'auth') {
    return (
      <AuthScreen
        onBack={() => setScreen({ name: 'menu' })}
        onSuccess={(u) => {
          setUser(u);
          if (screen.next === 'lobby') setScreen({ name: 'lobby' });
          else setScreen({ name: 'menu' });
        }}
      />
    );
  }
  if (screen.name === 'lobby') {
    return (
      <LobbyScreen
        user={user}
        onBack={() => setScreen({ name: 'menu' })}
        onJoined={onJoined}
      />
    );
  }
  if (screen.name === 'mp') {
    return (
      <MultiplayerGameScreen
        session={screen.session}
        onExit={(updated) => {
          if (updated) setUser(updated);
          setScreen({ name: 'menu' });
        }}
      />
    );
  }
  if (screen.name === 'leaderboard') {
    return <LeaderboardScreen onBack={() => setScreen({ name: 'menu' })} />;
  }

  return (
    <MenuScreen
      user={user}
      onPlayAi={(faction, aiFaction, difficulty) =>
        setScreen({ name: 'game', faction, aiFaction, difficulty })
      }
      onEditDeck={(faction) => setScreen({ name: 'deck', faction })}
      onMultiplayer={goMultiplayer}
      onLeaderboard={() => setScreen({ name: 'leaderboard' })}
      onAccount={() => setScreen({ name: 'auth', next: 'menu' })}
      onLogout={() => void logout()}
    />
  );
}
