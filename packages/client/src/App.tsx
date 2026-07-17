import type { PlayableFaction } from '@gwent/data';
import { useState } from 'react';
import { GameScreen } from './screens/Game.tsx';
import { MenuScreen } from './screens/Menu.tsx';

type Screen =
  | { name: 'menu' }
  | { name: 'game'; faction: PlayableFaction; aiFaction: PlayableFaction };

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'menu' });

  if (screen.name === 'game') {
    return (
      <GameScreen
        faction={screen.faction}
        aiFaction={screen.aiFaction}
        onExit={() => setScreen({ name: 'menu' })}
      />
    );
  }
  return <MenuScreen onPlayAi={(faction, aiFaction) => setScreen({ name: 'game', faction, aiFaction })} />;
}
