import { useEffect } from 'react';
import { useStore } from './store';
import { Workspace } from './components/workspace/Workspace';
import { Board } from './components/board/Board';
import { TaskModal } from './components/modal/TaskModal';

export default function App() {
  const loaded = useStore((s) => s.loaded);
  const load = useStore((s) => s.load);
  const currentProjectId = useStore((s) => s.currentProjectId);

  useEffect(() => {
    void load();
  }, [load]);

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-ink-faint">
        Loading…
      </div>
    );
  }

  return (
    <div className="h-full">
      {currentProjectId ? <Board projectId={currentProjectId} /> : <Workspace />}
      <TaskModal />
    </div>
  );
}
