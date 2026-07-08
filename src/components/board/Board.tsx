import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { ArrowLeft, Plus, Columns3 } from 'lucide-react';
import type { Task } from '../../types';
import { useStore } from '../../store';
import { ListColumn } from './ListColumn';
import { TaskCardOverlay } from '../card/TaskCardOverlay';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface BoardProps {
  projectId: string;
}

const DROP_PREFIX = 'list-drop-';

export function Board({ projectId }: BoardProps) {
  const project = useStore((s) => s.projects.find((p) => p.id === projectId));
  const allLists = useStore((s) => s.lists);
  const allTasks = useStore((s) => s.tasks);
  const closeProject = useStore((s) => s.closeProject);
  const addList = useStore((s) => s.addList);
  const deleteList = useStore((s) => s.deleteList);
  const reorderLists = useStore((s) => s.reorderLists);
  const applyTaskLayout = useStore((s) => s.applyTaskLayout);

  const lists = useMemo(
    () =>
      allLists
        .filter((l) => l.projectId === projectId)
        .sort((a, b) => a.order - b.order),
    [allLists, projectId],
  );

  const projectListIds = useMemo(() => new Set(lists.map((l) => l.id)), [lists]);

  const tasksById = useMemo(() => {
    const m = new Map<string, Task>();
    for (const t of allTasks) m.set(t.id, t);
    return m;
  }, [allTasks]);

  /** listId -> ordered task ids (local, mutated live during drag) */
  const [containers, setContainers] = useState<Record<string, string[]>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'list' | 'task' | null>(null);
  const [pendingDeleteList, setPendingDeleteList] = useState<string | null>(
    null,
  );
  const [newListId, setNewListId] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const buildContainers = useMemo(() => {
    return () => {
      const next: Record<string, string[]> = {};
      for (const l of lists) {
        next[l.id] = allTasks
          .filter((t) => t.listId === l.id)
          .sort((a, b) => a.order - b.order)
          .map((t) => t.id);
      }
      return next;
    };
  }, [lists, allTasks]);

  // Sync local containers from the store whenever it changes — but never
  // clobber the in-progress arrangement while a drag is active.
  useEffect(() => {
    if (activeId) return;
    setContainers(buildContainers());
  }, [buildContainers, activeId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  if (!project) return null;

  const findContainer = (id: string): string | undefined => {
    if (id.startsWith(DROP_PREFIX)) return id.slice(DROP_PREFIX.length);
    if (containers[id]) return id; // id is a listId
    return Object.keys(containers).find((k) => containers[k].includes(id));
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as string);
    setActiveType((e.active.data.current?.type as 'list' | 'task') ?? null);
  };

  const handleDragOver = (e: DragOverEvent) => {
    if (activeType !== 'task') return;
    const { active, over } = e;
    if (!over) return;
    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over.id as string);
    if (!activeContainer || !overContainer) return;
    if (activeContainer === overContainer) return;

    setContainers((prev) => {
      const activeItems = prev[activeContainer] ?? [];
      const overItems = prev[overContainer] ?? [];
      const activeIndex = activeItems.indexOf(active.id as string);
      if (activeIndex === -1) return prev;

      let overIndex: number;
      const overId = over.id as string;
      if (
        overId.startsWith(DROP_PREFIX) ||
        containers[overId] // hovering the column itself
      ) {
        overIndex = overItems.length;
      } else {
        const idx = overItems.indexOf(overId);
        overIndex = idx === -1 ? overItems.length : idx;
      }

      return {
        ...prev,
        [activeContainer]: activeItems.filter(
          (id) => id !== (active.id as string),
        ),
        [overContainer]: [
          ...overItems.slice(0, overIndex),
          active.id as string,
          ...overItems.slice(overIndex),
        ],
      };
    });
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    const type = activeType;
    setActiveId(null);
    setActiveType(null);
    if (!over) return;

    if (type === 'list') {
      const overListId = findContainer(over.id as string) ?? (over.id as string);
      if (!projectListIds.has(overListId)) return;
      const ids = lists.map((l) => l.id);
      const from = ids.indexOf(active.id as string);
      const to = ids.indexOf(overListId);
      if (from === -1 || to === -1 || from === to) return;
      reorderLists(projectId, arrayMove(ids, from, to));
      return;
    }

    // task
    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over.id as string);
    if (!activeContainer || !overContainer) return;

    let finalContainers = containers;
    if (activeContainer === overContainer) {
      const items = containers[activeContainer];
      const oldIndex = items.indexOf(active.id as string);
      const overId = over.id as string;
      const newIndex = overId.startsWith(DROP_PREFIX)
        ? items.length - 1
        : items.indexOf(overId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        finalContainers = {
          ...containers,
          [activeContainer]: arrayMove(items, oldIndex, newIndex),
        };
        setContainers(finalContainers);
      }
    }

    // Diff local layout against the store and persist only what changed.
    const changed: Task[] = [];
    for (const listId of Object.keys(finalContainers)) {
      finalContainers[listId].forEach((taskId, index) => {
        const t = tasksById.get(taskId);
        if (!t) return;
        if (t.listId !== listId || t.order !== index) {
          changed.push({ ...t, listId, order: index });
        }
      });
    }
    if (changed.length) applyTaskLayout(changed);
  };

  const handleAddList = () => {
    const id = addList(projectId);
    setNewListId(id);
    requestAnimationFrame(() => {
      scrollerRef.current?.scrollTo({
        left: scrollerRef.current.scrollWidth,
        behavior: 'smooth',
      });
    });
  };

  const deleteTargetList = lists.find((l) => l.id === pendingDeleteList);
  const deleteTargetCount = deleteTargetList
    ? (containers[deleteTargetList.id]?.length ?? 0)
    : 0;

  const activeTask =
    activeType === 'task' && activeId ? tasksById.get(activeId) : undefined;
  const activeList =
    activeType === 'list' && activeId
      ? lists.find((l) => l.id === activeId)
      : undefined;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2.5 border-b border-line px-5 py-3">
        <button
          onClick={closeProject}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <ArrowLeft size={15} />
          Projects
        </button>
        <span className="text-ink-faint/60">/</span>
        <h1 className="text-[14px] font-semibold text-ink">{project.name}</h1>
        <div className="ml-auto">
          <button
            onClick={handleAddList}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <Plus size={14} />
            Add list
          </button>
        </div>
      </header>

      {lists.length === 0 ? (
        <BoardEmptyState onAdd={handleAddList} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={() => {
            setActiveId(null);
            setActiveType(null);
            setContainers(buildContainers());
          }}
        >
          <div
            ref={scrollerRef}
            className="flex flex-1 gap-3 overflow-x-auto overflow-y-hidden px-5 py-4"
          >
            <SortableContext
              items={lists.map((l) => l.id)}
              strategy={horizontalListSortingStrategy}
            >
              {lists.map((list) => {
                const taskIds = containers[list.id] ?? [];
                const tasks = taskIds
                  .map((id) => tasksById.get(id))
                  .filter((t): t is Task => !!t);
                return (
                  <ListColumn
                    key={list.id}
                    list={list}
                    tasks={tasks}
                    onRequestDelete={() => setPendingDeleteList(list.id)}
                    startEditing={newListId === list.id}
                    onEditingHandled={() => setNewListId(null)}
                  />
                );
              })}
            </SortableContext>

            {/* trailing add-list affordance */}
            <button
              onClick={handleAddList}
              className="flex h-10 w-[300px] shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-line px-3 text-[12px] font-medium text-ink-faint transition-colors hover:border-white/20 hover:text-ink-muted"
            >
              <Plus size={14} />
              Add list
            </button>
          </div>

          <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
            {activeTask ? (
              <TaskCardOverlay task={activeTask} />
            ) : activeList ? (
              <div className="w-[300px] rounded-xl border border-white/15 bg-surface-2 px-3 py-2.5 shadow-2xl">
                <span className="text-[13px] font-semibold text-ink">
                  {activeList.name}
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {deleteTargetList && (
        <ConfirmDialog
          title={`Delete "${deleteTargetList.name}"?`}
          message={
            deleteTargetCount > 0
              ? `This list has ${deleteTargetCount} ${deleteTargetCount === 1 ? 'task' : 'tasks'}. Deleting it will permanently remove ${deleteTargetCount === 1 ? 'it' : 'them all'} and any attachments.`
              : 'This list will be permanently deleted.'
          }
          onConfirm={() => {
            deleteList(deleteTargetList.id);
            setPendingDeleteList(null);
          }}
          onCancel={() => setPendingDeleteList(null)}
        />
      )}
    </div>
  );
}

function BoardEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="mb-4 rounded-2xl border border-line bg-surface p-4 text-ink-faint">
        <Columns3 size={26} />
      </div>
      <h2 className="text-[15px] font-medium text-ink">No lists yet</h2>
      <p className="mt-1 max-w-xs text-[13px] text-ink-muted">
        Add your first list (like “Todo”, “In Progress”, “Done”) to start
        building your board.
      </p>
      <button
        onClick={onAdd}
        className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
      >
        <Plus size={16} />
        Add list
      </button>
    </div>
  );
}
