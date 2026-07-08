import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useStore } from './store';
import { useAuth } from './store/auth';
import { setDbNamespace, migrateLegacyDataIfNeeded } from './db';
import { Workspace } from './components/workspace/Workspace';
import { Board } from './components/board/Board';
import { TaskModal } from './components/modal/TaskModal';
import { AuthScreen } from './components/auth/AuthScreen';

export default function App() {
  const authStatus = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const recoveryMode = useAuth((s) => s.recoveryMode);
  const initAuth = useAuth((s) => s.init);

  const boardsLoaded = useStore((s) => s.loaded);
  const loadBoards = useStore((s) => s.load);
  const resetBoards = useStore((s) => s.reset);
  const currentProjectId = useStore((s) => s.currentProjectId);

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
        void (async () => {
          await migrateLegacyDataIfNeeded(userId);
          if (!cancelled) await loadBoards();
        })();
      }
    } else if (loadedForUser.current !== null) {
      loadedForUser.current = null;
      resetBoards();
      setDbNamespace(null);
    }
    return () => {
      cancelled = true;
    };
  }, [authStatus, userId, loadBoards, resetBoards]);

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

  return (
    <div className="h-full">
      {currentProjectId ? <Board projectId={currentProjectId} /> : <Workspace />}
      <TaskModal />
    </div>
  );
}

function FullscreenSpinner() {
  return (
    <div className="flex h-full items-center justify-center text-ink-faint">
      <Loader2 size={20} className="animate-spin" />
    </div>
  );
}
