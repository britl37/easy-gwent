export interface GameSettings {
  /** Master mute for future SFX. */
  muted: boolean;
  /** Prefer real card art when files exist. */
  showCardArt: boolean;
  /** Reduce non-essential motion. */
  reduceMotion: boolean;
}

const KEY = 'gwent.settings.v1';

const DEFAULTS: GameSettings = {
  muted: false,
  showCardArt: true,
  reduceMotion: false,
};

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s: GameSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function applySettingsToDom(s: GameSettings): void {
  document.documentElement.classList.toggle('reduce-motion', s.reduceMotion);
  document.documentElement.classList.toggle('no-card-art', !s.showCardArt);
  document.documentElement.dataset.muted = s.muted ? '1' : '0';
}
