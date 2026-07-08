import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { List, Task } from '../../types';
import { useStore } from '../../store';
import { InlineEdit } from '../ui/InlineEdit';
import { TaskCard } from '../card/TaskCard';
import { cn } from '../../lib/utils';

interface ListColumnProps {
  list: List;
  tasks: Task[];
  onRequestDelete: () => void;
  startEditing?: boolean;
  onEditingHandled?: () => void;
}

export function ListColumn({
  list,
  tasks,
  onRequestDelete,
  startEditing = false,
  onEditingHandled,
}: ListColumnProps) {
  const renameList = useStore((s) => s.renameList);
  const addTask = useStore((s) => s.addTask);
  const [editing, setEditing] = useState(startEditing);
  const [addingName, setAddingName] = useState('');
  const [adding, setAdding] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: list.id, data: { type: 'list' } });

  // Droppable area so empty lists can still receive cards.
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `list-drop-${list.id}`,
    data: { type: 'list-drop', listId: list.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  /** Commit the current draft. `keepOpen` lets Enter add many in a row. */
  const commitAdd = (keepOpen: boolean) => {
    const name = addingName.trim();
    if (name) addTask(list.id, name);
    setAddingName('');
    if (!keepOpen) setAdding(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex max-h-full w-[300px] shrink-0 flex-col rounded-xl border border-line bg-surface/60',
        isDragging && 'opacity-40',
      )}
    >
      {/* Header — this is the drag handle for reordering lists */}
      <div className="flex items-center gap-1.5 px-3 py-2.5">
        <button
          aria-label="Drag to reorder list"
          className="cursor-grab rounded p-0.5 text-ink-faint hover:text-ink active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={15} />
        </button>
        <div className="min-w-0 flex-1">
          <InlineEdit
            value={list.name}
            editing={editing}
            onEditingChange={(v) => {
              setEditing(v);
              if (!v) onEditingHandled?.();
            }}
            onCommit={(name) => renameList(list.id, name)}
            ariaLabel="List name"
            className="block cursor-text truncate text-[13px] font-semibold tracking-wide text-ink"
            inputClassName="text-[13px] font-semibold text-ink px-1.5 py-0.5"
          />
        </div>
        <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-ink-faint">
          {tasks.length}
        </span>
        <button
          aria-label="Delete list"
          onClick={onRequestDelete}
          className="rounded p-1 text-ink-faint hover:bg-danger/15 hover:text-danger"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Cards */}
      <div
        ref={setDropRef}
        className={cn(
          'flex min-h-[8px] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2',
          isOver && 'rounded-lg bg-white/[0.02]',
        )}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>

        {tasks.length === 0 && !adding && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line/70 py-8 text-center">
            <p className="text-[12px] text-ink-faint">No tasks</p>
          </div>
        )}

        {adding && (
          <textarea
            autoFocus
            value={addingName}
            placeholder="Task name…"
            onChange={(e) => setAddingName(e.target.value)}
            onBlur={() => commitAdd(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commitAdd(true);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setAddingName('');
                setAdding(false);
              }
            }}
            rows={2}
            className="w-full resize-none rounded-lg border border-accent/50 bg-surface-2 px-3 py-2 text-[13px] text-ink outline-none ring-2 ring-accent/20 placeholder:text-ink-faint"
          />
        )}
      </div>

      {/* Add card */}
      <button
        onClick={() => setAdding(true)}
        className="m-2 mt-0 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink-muted"
      >
        <Plus size={14} />
        Add task
      </button>
    </div>
  );
}
