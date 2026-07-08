import { useEffect, useRef, useState } from 'react';
import { Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../store/auth';
import { useProfile } from '../../store/profile';
import { useUI } from '../../store/ui';
import { Avatar } from '../avatar/Avatar';
import { displayName } from '../../lib/avatar';

export function UserMenu() {
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);
  const profile = useProfile((s) => s.profile);
  const openAccount = useUI((s) => s.openAccount);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center rounded-full outline-none ring-offset-2 ring-offset-bg transition hover:ring-2 hover:ring-white/15 focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <Avatar profile={profile} user={user} size={30} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-56 overflow-hidden rounded-xl border border-line bg-elevated shadow-2xl">
          <div className="flex items-center gap-2.5 border-b border-line px-3 py-3">
            <Avatar profile={profile} user={user} size={34} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-ink">
                {displayName(profile, user?.email ?? undefined)}
              </p>
              <p className="truncate text-[11px] text-ink-faint">
                {user?.email ?? profile?.email}
              </p>
            </div>
          </div>
          <div className="p-1">
            <button
              onClick={() => {
                setOpen(false);
                openAccount();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <Settings size={15} />
              Account settings
            </button>
            <button
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <LogOut size={15} />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
