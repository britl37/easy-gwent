import { useState } from 'react';
import { applySettingsToDom, loadSettings, saveSettings, type GameSettings } from '../game/settings.ts';

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [s, setS] = useState<GameSettings>(() => loadSettings());

  const update = (patch: Partial<GameSettings>) => {
    const next = { ...s, ...patch };
    setS(next);
    saveSettings(next);
    applySettingsToDom(next);
  };

  return (
    <div className="menu-screen">
      <h1 className="title">SETTINGS</h1>
      <div className="menu-box settings-box">
        <label className="toggle-row">
          <span>Mute sound</span>
          <input type="checkbox" checked={s.muted} onChange={(e) => update({ muted: e.target.checked })} />
        </label>
        <p className="menu-note">SFX hooks are ready; no audio assets yet.</p>

        <label className="toggle-row">
          <span>Show card art</span>
          <input
            type="checkbox"
            checked={s.showCardArt}
            onChange={(e) => update({ showCardArt: e.target.checked })}
          />
        </label>
        <p className="menu-note">When off, always use generated placeholders (even if images are installed).</p>

        <label className="toggle-row">
          <span>Reduce motion</span>
          <input
            type="checkbox"
            checked={s.reduceMotion}
            onChange={(e) => update({ reduceMotion: e.target.checked })}
          />
        </label>

        <button className="btn" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
