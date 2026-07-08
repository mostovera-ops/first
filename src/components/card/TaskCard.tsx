import { useEffect, useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CalendarClock, Pencil, Trash2 } from 'lucide-react';
import type { Task } from '../../types';
import { useStore } from '../../store';
import { cn, deadlineStatus, formatDeadline } from '../../lib/utils';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const openTask = useStore((s) => s.openTask);
  const updateTask = useStore((s) => s.updateTask);
  const deleteTask = useStore((s) => s.deleteTask);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.name);
  const [confirming, setConfirming] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'task', listId: task.listId },
    disabled: editing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const status = deadlineStatus(task.deadline);

  useEffect(() => {
    if (editing) {
      setDraft(task.name);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing, task.name]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== task.name) updateTask(task.id, { name: trimmed });
    setEditing(false);
  };

  // Drag props are only attached when not editing, so the textarea is usable.
  const dragProps = editing ? {} : { ...attributes, ...listeners };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...dragProps}
        onClick={() => !editing && openTask(task.id)}
        className={cn(
          'group relative cursor-pointer rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-left transition-colors',
          'hover:border-white/15 hover:bg-surface-3',
          isDragging && 'opacity-50',
        )}
      >
        {editing ? (
          <textarea
            ref={inputRef}
            value={draft}
            rows={2}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commit();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setDraft(task.name);
                setEditing(false);
              }
            }}
            className="w-full resize-none rounded-md border border-accent/50 bg-surface px-2 py-1 text-[13px] font-medium text-ink outline-none ring-2 ring-accent/20"
          />
        ) : (
          <p className="pr-10 text-[13px] font-medium leading-snug text-ink">
            {task.name}
          </p>
        )}

        {!editing && task.deadline && (
          <div className="mt-2 flex items-center">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium',
                status === 'overdue' && 'bg-danger/15 text-danger',
                status === 'soon' && 'bg-warn/15 text-warn',
                status === 'normal' && 'bg-surface-3 text-ink-faint',
              )}
            >
              <CalendarClock size={11} />
              {formatDeadline(task.deadline)}
            </span>
          </div>
        )}

        {/* Hover controls — do not count as part of the resting card face */}
        {!editing && (
          <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              aria-label="Rename task"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
              className="rounded-md bg-surface/80 p-1 text-ink-faint backdrop-blur hover:bg-surface-3 hover:text-ink"
            >
              <Pencil size={13} />
            </button>
            <button
              aria-label="Delete task"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setConfirming(true);
              }}
              className="rounded-md bg-surface/80 p-1 text-ink-faint backdrop-blur hover:bg-danger/15 hover:text-danger"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {confirming && (
        <ConfirmDialog
          title={`Delete "${task.name}"?`}
          message="This task and its attachments will be permanently deleted."
          onConfirm={() => {
            deleteTask(task.id);
            setConfirming(false);
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
