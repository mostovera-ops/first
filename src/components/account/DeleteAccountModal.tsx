import { useEffect, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../store/auth';

const CONFIRM_WORD = 'delete';

export function DeleteAccountModal({ onCancel }: { onCancel: () => void }) {
  const deleteAccount = useAuth((s) => s.deleteAccount);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = text.trim().toLowerCase() === CONFIRM_WORD && !busy;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  const confirm = async () => {
    if (!canDelete) return;
    setBusy(true);
    setError(null);
    const res = await deleteAccount();
    if (!res.ok) {
      setBusy(false);
      setError(res.message ?? 'Could not delete your account.');
    }
    // On success the auth gate unmounts this and returns to the sign-in screen.
  };

  return (
    <div
      className="animate-overlay-in fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      onMouseDown={() => !busy && onCancel()}
    >
      <div
        className="animate-modal-in w-full max-w-md rounded-2xl border border-danger/30 bg-elevated p-5 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger/15 text-danger">
            <AlertTriangle size={16} />
          </span>
          <h2 className="text-[15px] font-semibold text-ink">
            Delete your account
          </h2>
        </div>

        <p className="text-[13px] leading-relaxed text-ink-muted">
          This is permanent. Your account, profile, and uploaded avatar will be
          deleted and can’t be recovered. Your boards on this device will also
          become inaccessible.
        </p>

        <label className="mt-4 block text-[12px] font-medium text-ink-muted">
          Type <span className="font-semibold text-ink">{CONFIRM_WORD}</span> to
          confirm
        </label>
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canDelete) void confirm();
          }}
          placeholder={CONFIRM_WORD}
          className="mt-1.5 w-full rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-danger/50 focus:ring-2 focus:ring-danger/20"
        />

        {error && (
          <p className="mt-2 rounded-md border border-danger/25 bg-danger/10 px-3 py-2 text-[12px] text-danger">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-md border border-line bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={!canDelete}
            className="inline-flex items-center gap-2 rounded-md bg-danger px-3 py-1.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
}
