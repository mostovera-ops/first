import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable';
import { Plus, LayoutGrid } from 'lucide-react';
import { useStore } from '../../store';
import { ProjectCard } from './ProjectCard';
import { ConfirmDialog } from '../ui/ConfirmDialog';

export function Workspace() {
  const projects = useStore((s) => s.projects);
  const lists = useStore((s) => s.lists);
  const tasks = useStore((s) => s.tasks);
  const addProject = useStore((s) => s.addProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const reorderProjects = useStore((s) => s.reorderProjects);
  const openProject = useStore((s) => s.openProject);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [newlyAdded, setNewlyAdded] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const counts = useMemo(() => {
    const byProject: Record<string, { lists: number; cards: number }> = {};
    for (const p of projects) byProject[p.id] = { lists: 0, cards: 0 };
    const listToProject = new Map(lists.map((l) => [l.id, l.projectId]));
    for (const l of lists) {
      if (byProject[l.projectId]) byProject[l.projectId].lists++;
    }
    for (const t of tasks) {
      const pid = listToProject.get(t.listId);
      if (pid && byProject[pid]) byProject[pid].cards++;
    }
    return byProject;
  }, [projects, lists, tasks]);

  const handleDragStart = (e: DragStartEvent) =>
    setActiveId(e.active.id as string);

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = projects.map((p) => p.id);
    const from = ids.indexOf(active.id as string);
    const to = ids.indexOf(over.id as string);
    if (from === -1 || to === -1) return;
    reorderProjects(arrayMove(ids, from, to));
  };

  const activeProject = projects.find((p) => p.id === activeId) ?? null;
  const deleteTarget = projects.find((p) => p.id === pendingDelete) ?? null;

  const handleAdd = () => {
    const id = addProject();
    setNewlyAdded(id);
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">
            Projects
          </h1>
          <p className="mt-1 text-[13px] text-ink-muted">
            {projects.length
              ? `${projects.length} ${projects.length === 1 ? 'project' : 'projects'} in your workspace`
              : 'Your workspace is empty'}
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[13px] font-medium text-white shadow-sm transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          New project
        </button>
      </header>

      {projects.length === 0 ? (
        <EmptyState onAdd={handleAdd} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext
            items={projects.map((p) => p.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  listCount={counts[project.id]?.lists ?? 0}
                  cardCount={counts[project.id]?.cards ?? 0}
                  onOpen={() => openProject(project.id)}
                  onRequestDelete={() => setPendingDelete(project.id)}
                  startEditing={newlyAdded === project.id}
                  onEditingHandled={() => setNewlyAdded(null)}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
            {activeProject ? (
              <div className="rounded-xl border border-white/10 bg-surface-2 p-4 shadow-2xl">
                <div className="text-[15px] font-semibold text-ink">
                  {activeProject.name}
                </div>
                <div className="mt-6 text-[12px] text-ink-faint">
                  {counts[activeProject.id]?.lists ?? 0} lists ·{' '}
                  {counts[activeProject.id]?.cards ?? 0} tasks
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={`Delete "${deleteTarget.name}"?`}
          message="This project, all its lists, tasks, and attachments will be permanently deleted."
          onConfirm={() => {
            deleteProject(deleteTarget.id);
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line py-24 text-center">
      <div className="mb-4 rounded-2xl border border-line bg-surface p-4 text-ink-faint">
        <LayoutGrid size={26} />
      </div>
      <h2 className="text-[15px] font-medium text-ink">No projects yet</h2>
      <p className="mt-1 max-w-xs text-[13px] text-ink-muted">
        Create your first project to start organizing work into boards.
      </p>
      <button
        onClick={onAdd}
        className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
      >
        <Plus size={16} />
        New project
      </button>
    </div>
  );
}
