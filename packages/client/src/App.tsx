import type { Difficulty } from '@gwent/ai';
import type { PlayableFaction } from '@gwent/data';
import { useState } from 'react';
import { DeckEditorScreen } from './screens/DeckEditor.tsx';
import { GameScreen } from './screens/Game.tsx';
import { MenuScreen } from './screens/Menu.tsx';

type Screen =
  | { name: 'menu' }
  | { name: 'deck'; faction: PlayableFaction }
  | { name: 'game'; faction: PlayableFaction; aiFaction: PlayableFaction; difficulty: Difficulty };

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'menu' });

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
  return (
    <MenuScreen
      onPlayAi={(faction, aiFaction, difficulty) =>
        setScreen({ name: 'game', faction, aiFaction, difficulty })
      }
      onEditDeck={(faction) => setScreen({ name: 'deck', faction })}
    />
  );
}
