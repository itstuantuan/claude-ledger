'use client';
import { useState, useRef, useEffect } from 'react';
type Mode = 'form' | 'email' | 'google';
export function LoginForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>('form');
  const input = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { if (mode !== 'form') heading.current?.focus(); }, [mode]);
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(email.trim() ? 'Please enter a valid email address.' : 'Please enter your email address.');
      input.current?.focus(); return;
    }
    setError(''); setBusy(true);
    timer.current = setTimeout(() => { setBusy(false); setMode('email'); }, 700);
  }
  function back() { setMode('form'); requestAnimationFrame(() => input.current?.focus()); }
  return <section className="login-card" aria-label="Sign in">
    {mode === 'form' ? <>
      <button className="button secondary" type="button" disabled={busy} onClick={() => setMode('google')}><img src="/logos/google.svg" width="20" height="20" alt="" />Continue with Google</button>
      <p className="divider">OR</p>
      <form noValidate onSubmit={submit}>
        <div className="field"><input ref={input} type="email" aria-label="Email" autoComplete="email" placeholder="Enter your email" value={email} disabled={busy} aria-invalid={!!error} aria-describedby={error ? 'email-error' : undefined} onChange={e => { setEmail(e.target.value); if (error) setError(''); }} />
        {error && <p id="email-error" role="alert" className="error">{error}</p>}</div>
        <button className="button primary" type="submit" disabled={busy} aria-busy={busy}>{busy ? <><span className="spinner" />Continuing…</> : 'Continue with email'}</button>
      </form>
      <p className="legal">By continuing, you agree to Anthropic’s <a href="https://www.anthropic.com/legal/commercial-terms" target="_blank" rel="noreferrer">Commercial Terms</a> and <a href="https://www.anthropic.com/legal/aup" target="_blank" rel="noreferrer">Usage Policy</a>, and acknowledge our <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</p>
    </> : <div className="auth-preview">
      <span className="preview-icon" aria-hidden="true">{mode === 'email' ? '✉' : <img src="/logos/google.svg" alt="" width="28" height="28" />}</span>
      <h2 ref={heading} tabIndex={-1}>{mode === 'email' ? 'Continue with email' : 'Continue with Google'}</h2>
      {mode === 'email' && <p className="email-value">{email.trim()}</p>}
      <p>This is a local interface preview. {mode === 'email' ? 'No email has been sent.' : 'Google sign-in is not connected yet.'}</p>
      <p className="preview-note">Authentication will be connected to your bookkeeping account.</p>
      <a className="button primary" href="/dashboard">Explore workspace preview</a><button className="button secondary" onClick={back}>Back to sign in</button>
    </div>}
  </section>;
}

