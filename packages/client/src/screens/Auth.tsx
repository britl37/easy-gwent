import type { UserPublic } from '@gwent/engine';
import { useState } from 'react';
import { login, register } from '../net/auth.ts';

export function AuthScreen({
  onSuccess,
  onBack,
}: {
  onSuccess: (user: UserPublic) => void;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const r = mode === 'login' ? await login(username.trim(), password) : await register(username.trim(), password);
      if (!r.ok) {
        setError(r.message);
        return;
      }
      onSuccess(r.data.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="menu-screen">
      <h1 className="title">{mode === 'login' ? 'LOGIN' : 'REGISTER'}</h1>
      <div className="menu-box">
        <p className="menu-note">Required for multiplayer. AI games do not need an account.</p>
        <label className="field-label">
          Username
          <input
            className="text-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            maxLength={20}
          />
        </label>
        <label className="field-label">
          Password
          <input
            className="text-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </label>
        {error && <p className="menu-error">{error}</p>}
        <button className="btn btn-primary" disabled={busy} onClick={() => void submit()}>
          {mode === 'login' ? 'Log in' : 'Create account'}
        </button>
        <button
          className="btn"
          disabled={busy}
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
          }}
        >
          {mode === 'login' ? 'Need an account? Register' : 'Have an account? Log in'}
        </button>
        <button className="btn" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
