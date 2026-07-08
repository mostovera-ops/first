import { useState } from 'react';
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../store/auth';
import { cn } from '../../lib/utils';

type Mode = 'signin' | 'signup' | 'forgot' | 'reset';

export function AuthScreen() {
  const configured = useAuth((s) => s.configured);
  const recoveryMode = useAuth((s) => s.recoveryMode);

  const [mode, setMode] = useState<Mode>('signin');
  const effectiveMode: Mode = recoveryMode ? 'reset' : mode;

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <Wordmark />
          <p className="mt-3 text-[13px] text-ink-muted">
            {effectiveMode === 'reset'
              ? 'Choose a new password'
              : 'Your minimal Kanban workspace'}
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-xl">
          {!configured && <NotConfiguredBanner />}
          <AuthForm mode={effectiveMode} setMode={setMode} />
        </div>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-ink-faint">
          By continuing you agree to keep things tidy. Your boards stay in your
          browser.
        </p>
      </div>
    </div>
  );
}

function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-[15px] font-bold text-white">
        F
      </div>
      <span className="text-[18px] font-semibold tracking-tight text-ink">
        Flux
      </span>
    </div>
  );
}

function NotConfiguredBanner() {
  return (
    <div className="mb-4 rounded-lg border border-warn/25 bg-warn/10 px-3 py-2.5 text-[12px] leading-relaxed text-warn">
      Authentication isn’t configured yet. Add your Supabase keys to{' '}
      <code className="rounded bg-black/20 px-1">.env.local</code> — see{' '}
      <code className="rounded bg-black/20 px-1">SETUP.md</code>. The screens
      below are a live preview.
    </div>
  );
}

function AuthForm({
  mode,
  setMode,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
}) {
  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    sendPasswordReset,
    updatePassword,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reset = () => {
    setError(null);
    setNotice(null);
  };

  const switchMode = (m: Mode) => {
    reset();
    setPassword('');
    setConfirm('');
    setMode(m);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();

    if (mode === 'reset') {
      if (password.length < 8)
        return setError('Password must be at least 8 characters.');
      if (password !== confirm) return setError('Passwords don’t match.');
    }
    if (mode === 'signup' && password.length < 8)
      return setError('Password must be at least 8 characters.');

    setBusy(true);
    let res;
    if (mode === 'signin') res = await signInWithEmail(email, password);
    else if (mode === 'signup') res = await signUpWithEmail(email, password);
    else if (mode === 'forgot') res = await sendPasswordReset(email);
    else res = await updatePassword(password);
    setBusy(false);

    if (!res.ok) setError(res.message ?? 'Something went wrong.');
    else if (res.message) setNotice(res.message);
  };

  const google = async () => {
    reset();
    setBusy(true);
    const res = await signInWithGoogle();
    if (!res.ok) {
      setBusy(false);
      setError(res.message ?? 'Could not start Google sign-in.');
    }
    // On success the browser redirects away.
  };

  // Success info panel (check-email / reset-sent / password-updated).
  if (notice) {
    return (
      <div className="flex flex-col items-center py-2 text-center">
        <div className="mb-3 rounded-full bg-accent-soft p-2.5 text-accent">
          {mode === 'signup' || mode === 'forgot' ? (
            <Mail size={20} />
          ) : (
            <CheckCircle2 size={20} />
          )}
        </div>
        <p className="text-[13px] leading-relaxed text-ink-muted">{notice}</p>
        <button
          onClick={() => switchMode('signin')}
          className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"
        >
          <ArrowLeft size={14} />
          Back to sign in
        </button>
      </div>
    );
  }

  const titles: Record<Mode, string> = {
    signin: 'Sign in',
    signup: 'Create your account',
    forgot: 'Reset your password',
    reset: 'Set a new password',
  };

  return (
    <div>
      <h1 className="mb-4 text-[15px] font-semibold text-ink">
        {titles[mode]}
      </h1>

      {(mode === 'signin' || mode === 'signup') && (
        <>
          <button
            type="button"
            onClick={google}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-surface-3 disabled:opacity-60"
          >
            <GoogleIcon />
            Continue with Google
          </button>
          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-[11px] uppercase tracking-wide text-ink-faint">
              or
            </span>
            <div className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      <form onSubmit={submit} className="flex flex-col gap-3">
        {mode !== 'reset' && (
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            required
          />
        )}

        {mode !== 'forgot' && (
          <Field
            label={mode === 'reset' ? 'New password' : 'Password'}
            type="password"
            autoComplete={
              mode === 'signin' ? 'current-password' : 'new-password'
            }
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            required
            hint={
              mode === 'signup' || mode === 'reset'
                ? 'At least 8 characters'
                : undefined
            }
          />
        )}

        {mode === 'reset' && (
          <Field
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={setConfirm}
            placeholder="••••••••"
            required
          />
        )}

        {mode === 'signin' && (
          <button
            type="button"
            onClick={() => switchMode('forgot')}
            className="-mt-1 self-end text-[12px] text-ink-faint hover:text-ink"
          >
            Forgot password?
          </button>
        )}

        {error && (
          <p className="rounded-md border border-danger/25 bg-danger/10 px-3 py-2 text-[12px] text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy && <Loader2 size={15} className="animate-spin" />}
          {mode === 'signin' && 'Sign in'}
          {mode === 'signup' && 'Create account'}
          {mode === 'forgot' && 'Send reset link'}
          {mode === 'reset' && 'Update password'}
        </button>
      </form>

      <div className="mt-4 text-center text-[12px] text-ink-faint">
        {mode === 'signin' && (
          <>
            Don’t have an account?{' '}
            <SwitchLink onClick={() => switchMode('signup')}>
              Sign up
            </SwitchLink>
          </>
        )}
        {mode === 'signup' && (
          <>
            Already have an account?{' '}
            <SwitchLink onClick={() => switchMode('signin')}>
              Sign in
            </SwitchLink>
          </>
        )}
        {mode === 'forgot' && (
          <SwitchLink onClick={() => switchMode('signin')}>
            Back to sign in
          </SwitchLink>
        )}
      </div>
    </div>
  );
}

function SwitchLink({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-medium text-accent hover:underline"
    >
      {children}
    </button>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  ...rest
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-[12px] font-medium text-ink-muted">
        {label}
        {hint && <span className="text-[11px] text-ink-faint">{hint}</span>}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-[13px] text-ink outline-none transition-colors',
          'placeholder:text-ink-faint focus:border-accent/50 focus:ring-2 focus:ring-accent/20',
        )}
        {...rest}
      />
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5C29.6 34.9 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.5 5.5C40.9 36.3 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
