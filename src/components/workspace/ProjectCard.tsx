import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, Layers } from 'lucide-react';
import type { Project } from '../../types';
import { useStore } from '../../store';
import { InlineEdit } from '../ui/InlineEdit';
import { cn } from '../../lib/utils';

interface ProjectCardProps {
  project: Project;
  listCount: number;
  cardCount: number;
  onOpen: () => void;
  onRequestDelete: () => void;
  startEditing?: boolean;
  onEditingHandled?: () => void;
}

export function ProjectCard({
  project,
  listCount,
  cardCount,
  onOpen,
  onRequestDelete,
  startEditing = false,
  onEditingHandled,
}: ProjectCardProps) {
  const renameProject = useStore((s) => s.renameProject);
  const [editing, setEditing] = useState(startEditing);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex flex-col justify-between rounded-xl border border-line bg-surface p-4 transition-colors',
        'hover:border-line/0 hover:ring-1 hover:ring-white/10 hover:bg-surface-2',
        isDragging && 'z-10 opacity-60 shadow-2xl',
      )}
      onClick={() => !editing && onOpen()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !editing) {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <InlineEdit
            value={project.name}
            editing={editing}
            onEditingChange={(v) => {
              setEditing(v);
              if (!v) onEditingHandled?.();
            }}
            onCommit={(name) => renameProject(project.id, name)}
            ariaLabel="Project name"
            className="block cursor-text truncate text-[15px] font-semibold text-ink"
            inputClassName="text-[15px] font-semibold text-ink px-1.5 py-0.5"
          />
        </div>

        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            aria-label="Rename project"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            className="rounded-md p-1.5 text-ink-faint hover:bg-surface-3 hover:text-ink"
          >
            <Pencil size={14} />
          </button>
          <button
            aria-label="Delete project"
            onClick={(e) => {
              e.stopPropagation();
              onRequestDelete();
            }}
            className="rounded-md p-1.5 text-ink-faint hover:bg-danger/15 hover:text-danger"
          >
            <Trash2 size={14} />
          </button>
          <button
            aria-label="Drag to reorder"
            className="cursor-grab rounded-md p-1.5 text-ink-faint hover:bg-surface-3 hover:text-ink active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <GripVertical size={14} />
          </button>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3 text-[12px] text-ink-faint">
        <span className="inline-flex items-center gap-1.5">
          <Layers size={13} />
          {listCount} {listCount === 1 ? 'list' : 'lists'}
        </span>
        <span className="h-1 w-1 rounded-full bg-ink-faint/40" />
        <span>
          {cardCount} {cardCount === 1 ? 'task' : 'tasks'}
        </span>
      </div>
    </div>
  );
}
