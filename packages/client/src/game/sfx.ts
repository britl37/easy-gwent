/**
 * Tiny synthesized sound effects — no audio assets, just Web Audio.
 * All sounds are short, quiet, and gated by the master mute setting
 * (read live from `document.documentElement.dataset.muted`, which
 * `applySettingsToDom` keeps in sync).
 */

let ctx: AudioContext | null = null;

function muted(): boolean {
  return document.documentElement.dataset.muted === '1';
}

/** Lazily create/resume the context. Must be called from (or after) a user gesture. */
function getCtx(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Browsers block audio until a gesture; call once from a global listener. */
export function unlockAudio(): void {
  if (!muted()) getCtx();
}

interface Note {
  /** Frequency in Hz. */
  f: number;
  /** Start offset in seconds. */
  at: number;
  /** Duration in seconds. */
  d: number;
  /** Peak gain (0..1). */
  g?: number;
  type?: OscillatorType;
}

function play(notes: Note[]): void {
  if (muted()) return;
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  for (const n of notes) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = n.type ?? 'triangle';
    osc.frequency.value = n.f;
    const t0 = now + n.at;
    const peak = n.g ?? 0.08;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.d);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + n.d + 0.02);
  }
}

/** Soft low thump — a card landing on the board. */
export function sfxCardPlay(): void {
  play([
    { f: 160, at: 0, d: 0.12, g: 0.1, type: 'sine' },
    { f: 90, at: 0.01, d: 0.16, g: 0.07, type: 'sine' },
  ]);
}

/** Short two-note chime — your turn. */
export function sfxYourTurn(): void {
  play([
    { f: 523.25, at: 0, d: 0.12, g: 0.06 },
    { f: 783.99, at: 0.11, d: 0.2, g: 0.06 },
  ]);
}

/** Single low note — opponent's turn (subtler than yours). */
export function sfxOpponentTurn(): void {
  play([{ f: 261.63, at: 0, d: 0.14, g: 0.04 }]);
}

/** Descending pair — a round has ended. */
export function sfxRoundEnd(): void {
  play([
    { f: 392.0, at: 0, d: 0.16, g: 0.06 },
    { f: 293.66, at: 0.15, d: 0.24, g: 0.06 },
  ]);
}

/** Four-beat rising sting — winning a round ("dun da da DAA"). */
export function sfxRoundVictory(): void {
  play([
    { f: 196.0, at: 0, d: 0.16, g: 0.08, type: 'sine' },
    { f: 293.66, at: 0.18, d: 0.13, g: 0.07 },
    { f: 392.0, at: 0.34, d: 0.15, g: 0.075 },
    { f: 523.25, at: 0.52, d: 0.55, g: 0.085 },
    { f: 659.25, at: 0.52, d: 0.55, g: 0.045 },
  ]);
}

/** Rising fanfare — you won the match. */
export function sfxVictory(): void {
  play([
    { f: 392.0, at: 0, d: 0.14, g: 0.07 },
    { f: 523.25, at: 0.13, d: 0.14, g: 0.07 },
    { f: 659.25, at: 0.26, d: 0.14, g: 0.07 },
    { f: 783.99, at: 0.39, d: 0.34, g: 0.08 },
  ]);
}

/** Low falling pair — you lost (or drew). */
export function sfxDefeat(): void {
  play([
    { f: 233.08, at: 0, d: 0.22, g: 0.06, type: 'sine' },
    { f: 174.61, at: 0.2, d: 0.38, g: 0.06, type: 'sine' },
  ]);
}
