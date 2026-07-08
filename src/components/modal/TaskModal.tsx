import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Trash2, CalendarClock } from 'lucide-react';
import { useStore } from '../../store';
import { AutoTextarea } from '../ui/AutoTextarea';
import { Attachments } from './Attachments';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { cn, deadlineStatus, formatDeadline } from '../../lib/utils';

export function TaskModal() {
  const openTaskId = useStore((s) => s.openTaskId);
  const task = useStore((s) =>
    s.tasks.find((t) => t.id === s.openTaskId),
  );
  const closeTask = useStore((s) => s.closeTask);
  const updateTask = useStore((s) => s.updateTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const listName = useStore((s) => {
    const t = s.tasks.find((x) => x.id === s.openTaskId);
    return t ? s.lists.find((l) => l.id === t.listId)?.name : undefined;
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Hydrate local drafts when a new task opens.
  useEffect(() => {
    if (task) {
      setName(task.name);
      setDescription(task.description);
      setNotes(task.notes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTaskId]);

  const debouncedSave = useCallback(
    (key: string, patch: Parameters<typeof updateTask>[1]) => {
      if (!openTaskId) return;
      clearTimeout(timers.current[key]);
      timers.current[key] = setTimeout(() => {
        updateTask(openTaskId, patch);
      }, 350);
    },
    [openTaskId, updateTask],
  );

  const flush = useCallback(() => {
    if (!openTaskId) return;
    for (const key of Object.keys(timers.current)) {
      clearTimeout(timers.current[key]);
    }
    updateTask(openTaskId, { name: name.trim() || 'Untitled', description, notes });
  }, [openTaskId, name, description, notes, updateTask]);

  const handleClose = useCallback(() => {
    flush();
    closeTask();
  }, [flush, closeTask]);

  // Esc to close.
  useEffect(() => {
    if (!openTaskId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirming) {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openTaskId, confirming, handleClose]);

  if (!openTaskId || !task) return null;

  const status = deadlineStatus(task.deadline);

  return (
    <div
      className="animate-overlay-in fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8"
      onMouseDown={handleClose}
    >
      <div
        className="animate-modal-in my-auto w-full max-w-2xl rounded-2xl border border-line bg-elevated shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            {listName && (
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                {listName}
              </p>
            )}
            <textarea
              value={name}
              rows={1}
              placeholder="Task name"
              aria-label="Task name"
              onChange={(e) => {
                setName(e.target.value);
                debouncedSave('name', {
                  name: e.target.value.trim() || 'Untitled',
                });
              }}
              onBlur={flush}
              className="w-full resize-none bg-transparent text-[18px] font-semibold leading-snug text-ink outline-none placeholder:text-ink-faint"
            />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              aria-label="Delete task"
              onClick={() => setConfirming(true)}
              className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-danger/15 hover:text-danger"
            >
              <Trash2 size={16} />
            </button>
            <button
              aria-label="Close"
              onClick={handleClose}
              className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-surface-3 hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-5 py-5">
          {/* Deadline */}
          <Field label="Deadline">
            <div className="flex items-center gap-2">
              <div className="relative inline-flex items-center">
                <CalendarClock
                  size={14}
                  className="pointer-events-none absolute left-2.5 text-ink-faint"
                />
                <input
                  type="date"
                  value={task.deadline ?? ''}
                  onChange={(e) =>
                    updateTask(task.id, {
                      deadline: e.target.value || null,
                    })
                  }
                  className="rounded-lg border border-line bg-surface-2 py-1.5 pl-8 pr-2.5 text-[13px] text-ink outline-none transition-colors focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
                />
              </div>
              {task.deadline && (
                <>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium',
                      status === 'overdue' && 'bg-danger/15 text-danger',
                      status === 'soon' && 'bg-warn/15 text-warn',
                      status === 'normal' && 'bg-surface-3 text-ink-muted',
                    )}
                  >
                    {formatDeadline(task.deadline)}
                    {status === 'overdue' && ' · overdue'}
                  </span>
                  <button
                    onClick={() => updateTask(task.id, { deadline: null })}
                    className="text-[12px] text-ink-faint hover:text-ink"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </Field>

          {/* Description */}
          <Field label="Description">
            <AutoTextarea
              value={description}
              placeholder="Add a more detailed description…"
              minRows={3}
              onChange={(e) => {
                setDescription(e.target.value);
                debouncedSave('description', { description: e.target.value });
              }}
              onBlur={flush}
            />
          </Field>

          {/* Notes */}
          <Field label="Notes">
            <AutoTextarea
              value={notes}
              placeholder="Scratch notes, links, reminders…"
              minRows={2}
              className="bg-surface-2/60"
              onChange={(e) => {
                setNotes(e.target.value);
                debouncedSave('notes', { notes: e.target.value });
              }}
              onBlur={flush}
            />
          </Field>

          {/* Attachments */}
          <Field label="Attachments">
            <Attachments taskId={task.id} />
          </Field>
        </div>
      </div>

      {confirming && (
        <ConfirmDialog
          title={`Delete "${task.name}"?`}
          message="This task and its attachments will be permanently deleted."
          onConfirm={() => {
            const id = task.id;
            setConfirming(false);
            deleteTask(id);
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">
        {label}
      </label>
      {children}
    </div>
  );
}
