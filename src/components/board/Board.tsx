import { ArrowLeft } from 'lucide-react';
import { useStore } from '../../store';

interface BoardProps {
  projectId: string;
}

export function Board({ projectId }: BoardProps) {
  const project = useStore((s) =>
    s.projects.find((p) => p.id === projectId),
  );
  const closeProject = useStore((s) => s.closeProject);

  if (!project) return null;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-line px-5 py-3">
        <button
          onClick={closeProject}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-ink-muted hover:bg-surface-2 hover:text-ink"
        >
          <ArrowLeft size={15} />
          Projects
        </button>
        <span className="text-ink-faint">/</span>
        <h1 className="text-[14px] font-semibold text-ink">{project.name}</h1>
      </header>
      <div className="flex flex-1 items-center justify-center text-[13px] text-ink-faint">
        Board coming next…
      </div>
    </div>
  );
}
