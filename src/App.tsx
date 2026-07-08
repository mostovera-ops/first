import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useStore } from './store';
import { useAuth } from './store/auth';
import { useProfile } from './store/profile';
import { useUI } from './store/ui';
import { setDbNamespace, migrateLegacyDataIfNeeded } from './db';
import { Workspace } from './components/workspace/Workspace';
import { Board } from './components/board/Board';
import { TaskModal } from './components/modal/TaskModal';
import { AuthScreen } from './components/auth/AuthScreen';
import { AccountPage } from './components/account/AccountPage';

export default function App() {
  const authStatus = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const recoveryMode = useAuth((s) => s.recoveryMode);
  const initAuth = useAuth((s) => s.init);

  const boardsLoaded = useStore((s) => s.loaded);
  const loadBoards = useStore((s) => s.load);
  const resetBoards = useStore((s) => s.reset);
  const currentProjectId = useStore((s) => s.currentProjectId);

  const loadProfile = useProfile((s) => s.loadProfile);
  const clearProfile = useProfile((s) => s.clear);
  const accountOpen = useUI((s) => s.accountOpen);
  const closeAccount = useUI((s) => s.closeAccount);

  const userId = user?.id ?? null;
  const loadedForUser = useRef<string | null>(null);

  // Initialise auth once.
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // When the signed-in user changes, point IndexedDB at their namespace,
  // migrate any pre-auth boards on first login, then (re)load the boards.
  useEffect(() => {
    let cancelled = false;
    if (authStatus === 'signedIn' && userId) {
      if (loadedForUser.current !== userId) {
        loadedForUser.current = userId;
        resetBoards();
        setDbNamespace(userId);
        if (user) void loadProfile(user);
        void (async () => {
          try {
            await migrateLegacyDataIfNeeded(userId);
          } catch {
            // Migration is best-effort — never block the app on it.
          }
          if (!cancelled) await loadBoards();
        })();
      }
    } else if (loadedForUser.current !== null) {
      loadedForUser.current = null;
      resetBoards();
      setDbNamespace(null);
      clearProfile();
      closeAccount();
    }
    return () => {
      cancelled = true;
    };
  }, [
    authStatus,
    userId,
    user,
    loadBoards,
    resetBoards,
    loadProfile,
    clearProfile,
    closeAccount,
  ]);

  if (authStatus === 'loading') {
    return <FullscreenSpinner />;
  }

  // Auth gate: recovery link or any non-signed-in state → auth screens only.
  if (recoveryMode || authStatus !== 'signedIn') {
    return <AuthScreen />;
  }

  if (!boardsLoaded) {
    return <FullscreenSpinner />;
  }

  if (accountOpen) {
    return <AccountPage />;
  }

  return (
    <div className="h-full">
      {currentProjectId ? <Board projectId={currentProjectId} /> : <Workspace />}
      <TaskModal />
    </div>
  );
}

function FullscreenSpinner() {
  // Escape hatch: the spinner must never appear to hang forever. If loading
  // takes unusually long (e.g. a stalled redirect), offer a clean recovery.
  const [tooLong, setTooLong] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTooLong(true), 7000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-ink-faint">
      <Loader2 size={20} className="animate-spin" />
      {tooLong && (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="max-w-xs text-[13px] text-ink-muted">
            This is taking longer than usual.
          </p>
          <button
            onClick={() => {
              // Drop any leftover auth fragment and reload from a clean URL.
              window.location.replace(
                window.location.origin + window.location.pathname,
              );
            }}
            className="rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Reload
          </button>
        </div>
      )}
    </div>
  );
}
