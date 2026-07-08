import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, LogOut, Check, Loader2, Mail, Trash2 } from 'lucide-react';
import { useAuth } from '../../store/auth';
import { useProfile, providerLabel } from '../../store/profile';
import { useUI } from '../../store/ui';
import { DeleteAccountModal } from './DeleteAccountModal';
import { AvatarPicker } from '../avatar/AvatarPicker';
import { AvatarUploadButton } from '../avatar/AvatarUploadButton';
import { displayName } from '../../lib/avatar';
import { cn } from '../../lib/utils';

export function AccountPage() {
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);
  const profile = useProfile((s) => s.profile);
  const closeAccount = useUI((s) => s.closeAccount);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div className="min-h-full">
      <header className="flex items-center gap-3 border-b border-line px-5 py-3">
        <button
          onClick={closeAccount}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <ArrowLeft size={15} />
          Back to workspace
        </button>
        <span className="text-ink-faint/60">/</span>
        <h1 className="text-[14px] font-semibold text-ink">Account</h1>
      </header>

      <div className="mx-auto max-w-xl px-6 py-8">
        {/* Identity header — click the avatar to upload a photo */}
        <div className="mb-8 flex items-center gap-4">
          <AvatarUploadButton profile={profile} user={user} size={64} />
          <div className="min-w-0">
            <p className="truncate text-[17px] font-semibold text-ink">
              {displayName(profile, user?.email ?? undefined)}
            </p>
            <p className="truncate text-[13px] text-ink-muted">
              {user?.email ?? profile?.email}
            </p>
          </div>
        </div>

        {/* Email */}
        <Section title="Email">
          <div className="flex items-center justify-between rounded-lg border border-line bg-surface-2 px-3 py-2.5">
            <span className="flex items-center gap-2 text-[13px] text-ink">
              <Mail size={14} className="text-ink-faint" />
              {user?.email ?? profile?.email ?? '—'}
            </span>
            <span className="rounded-md bg-surface-3 px-2 py-0.5 text-[11px] font-medium text-ink-muted">
              {providerLabel(user)}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-ink-faint">
            Your email is managed by your sign-in provider and can’t be changed
            here.
          </p>
        </Section>

        {/* Name */}
        <Section title="Name">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NameField field="first_name" label="First name" />
            <NameField field="last_name" label="Last name" />
          </div>
        </Section>

        {/* Avatar */}
        <Section title="Avatar">
          <AvatarPicker />
        </Section>

        {/* Session */}
        <div className="mt-8 border-t border-line pt-6">
          <button
            onClick={() => void signOut()}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-[13px] font-medium text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <LogOut size={15} />
            Log out
          </button>
        </div>

        {/* Danger zone */}
        <div className="mt-8 rounded-xl border border-danger/25 bg-danger/[0.04] p-4">
          <h2 className="text-[13px] font-semibold text-ink">Danger zone</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
            Permanently delete your account, profile, and uploaded avatar. This
            can’t be undone.
          </p>
          <button
            onClick={() => setConfirmingDelete(true)}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] font-medium text-danger transition-colors hover:bg-danger/15"
          >
            <Trash2 size={15} />
            Delete account
          </button>
        </div>
      </div>

      {confirmingDelete && (
        <DeleteAccountModal onCancel={() => setConfirmingDelete(false)} />
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
        {title}
      </h2>
      {children}
    </section>
  );
}

type Status = 'idle' | 'saving' | 'saved';

function NameField({
  field,
  label,
}: {
  field: 'first_name' | 'last_name';
  label: string;
}) {
  const profile = useProfile((s) => s.profile);
  const updateProfile = useProfile((s) => s.updateProfile);

  const [value, setValue] = useState(profile?.[field] ?? '');
  const [status, setStatus] = useState<Status>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Keep in sync if the profile loads/changes underneath us.
  useEffect(() => {
    setValue(profile?.[field] ?? '');
  }, [profile, field]);

  const persist = async (next: string) => {
    const trimmed = next.trim();
    if (trimmed === (profile?.[field] ?? '')) return;
    setStatus('saving');
    try {
      await updateProfile({ [field]: trimmed || null });
      setStatus('saved');
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setStatus('idle'), 1500);
    } catch {
      setStatus('idle');
    }
  };

  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-[12px] font-medium text-ink-muted">
        {label}
        <StatusHint status={status} />
      </span>
      <input
        value={value}
        placeholder={label}
        onChange={(e) => {
          setValue(e.target.value);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => void persist(e.target.value), 600);
        }}
        onBlur={() => {
          clearTimeout(timer.current);
          void persist(value);
        }}
        className={cn(
          'w-full rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-[13px] text-ink outline-none transition-colors',
          'placeholder:text-ink-faint focus:border-accent/50 focus:ring-2 focus:ring-accent/20',
        )}
      />
    </label>
  );
}

function StatusHint({ status }: { status: Status }) {
  if (status === 'saving')
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-ink-faint">
        <Loader2 size={11} className="animate-spin" />
        Saving
      </span>
    );
  if (status === 'saved')
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-accent">
        <Check size={11} />
        Saved
      </span>
    );
  return null;
}
