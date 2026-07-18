import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { applySettingsToDom, loadSettings } from './game/settings.ts';
import { unlockAudio } from './game/sfx.ts';
import './styles/global.css';

applySettingsToDom(loadSettings());

// Browsers require a user gesture before audio can start; unlock on the first one.
window.addEventListener('pointerdown', unlockAudio, { once: true });

createRoot(document.getElementById('root')!).render(<App />);
