import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { applySettingsToDom, loadSettings } from './game/settings.ts';
import './styles/global.css';

applySettingsToDom(loadSettings());

createRoot(document.getElementById('root')!).render(<App />);
