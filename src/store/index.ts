import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { AttachmentMeta, List, Project, Task } from '../types';
import * as db from '../db';

interface FluxState {
  loaded: boolean;
  projects: Project[];
  lists: List[];
  tasks: Task[];

  /** null = workspace overview; otherwise a project board is open */
  currentProjectId: string | null;
  /** null = no modal; otherwise the open task's id */
  openTaskId: string | null;

  /** Attachment metadata (with object URLs) keyed by taskId, lazily loaded */
  attachments: Record<string, AttachmentMeta[]>;

  load: () => Promise<void>;
  /** Clear all in-memory board state (e.g. on sign-out / user switch). */
  reset: () => void;

  openProject: (id: string) => void;
  closeProject: () => void;
  openTask: (id: string) => void;
  closeTask: () => void;

  /* Projects */
  addProject: (name?: string) => string;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  reorderProjects: (orderedIds: string[]) => void;

  /* Lists */
  addList: (projectId: string, name?: string) => string;
  renameList: (id: string, name: string) => void;
  deleteList: (id: string) => void;
  reorderLists: (projectId: string, orderedIds: string[]) => void;

  /* Tasks */
  addTask: (listId: string, name: string) => string;
  updateTask: (id: string, patch: Partial<Omit<Task, 'id'>>) => void;
  deleteTask: (id: string) => void;
  /** Apply a fully-reconciled set of tasks for the given lists (used by DnD). */
  applyTaskLayout: (next: Task[]) => void;

  /* Attachments */
  loadAttachments: (taskId: string) => Promise<void>;
  addAttachment: (taskId: string, file: File) => Promise<void>;
  removeAttachment: (taskId: string, attachmentId: string) => Promise<void>;
}

function sortByOrder<T extends { order: number }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => a.order - b.order);
}

/**
 * Revoke cached object URLs for the given task ids and drop them from the
 * attachments cache. Returns the pruned cache. Prevents blob-URL leaks when
 * tasks are removed directly or via a cascading project/list delete.
 */
function pruneAttachmentCache(
  cache: Record<string, AttachmentMeta[]>,
  taskIds: Iterable<string>,
): Record<string, AttachmentMeta[]> {
  const next = { ...cache };
  for (const taskId of taskIds) {
    const metas = next[taskId];
    if (!metas) continue;
    for (const m of metas) URL.revokeObjectURL(m.url);
    delete next[taskId];
  }
  return next;
}

export const useStore = create<FluxState>((set, get) => ({
  loaded: false,
  projects: [],
  lists: [],
  tasks: [],
  currentProjectId: null,
  openTaskId: null,
  attachments: {},

  async load() {
    try {
      const [projects, lists, tasks] = await Promise.all([
        db.dbGetProjects(),
        db.dbGetLists(),
        db.dbGetTasks(),
      ]);
      set({
        projects: sortByOrder(projects),
        lists: sortByOrder(lists),
        tasks: sortByOrder(tasks),
        loaded: true,
      });
    } catch {
      // Never leave the app stuck on the loading spinner if IndexedDB fails —
      // show an (empty) workspace instead.
      set({ projects: [], lists: [], tasks: [], loaded: true });
    }
  },

  reset: () => {
    // Revoke any cached attachment object URLs before dropping state.
    const cache = get().attachments;
    for (const metas of Object.values(cache)) {
      for (const m of metas) URL.revokeObjectURL(m.url);
    }
    set({
      loaded: false,
      projects: [],
      lists: [],
      tasks: [],
      currentProjectId: null,
      openTaskId: null,
      attachments: {},
    });
  },

  openProject: (id) => set({ currentProjectId: id }),
  closeProject: () => set({ currentProjectId: null }),
  openTask: (id) => set({ openTaskId: id }),
  closeTask: () => set({ openTaskId: null }),

  /* ---------- Projects ---------- */
  addProject: (name = 'New Project') => {
    const id = nanoid();
    const order =
      get().projects.reduce((max, p) => Math.max(max, p.order), -1) + 1;
    const project: Project = {
      id,
      name,
      order,
      createdAt: Date.now(),
    };
    set((s) => ({ projects: [...s.projects, project] }));
    void db.dbPutProject(project);
    return id;
  },

  renameProject: (id, name) => {
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, name } : p)),
    }));
    const project = get().projects.find((p) => p.id === id);
    if (project) void db.dbPutProject(project);
  },

  deleteProject: (id) => {
    set((s) => {
      const listIds = new Set(
        s.lists.filter((l) => l.projectId === id).map((l) => l.id),
      );
      const removedTaskIds = s.tasks
        .filter((t) => listIds.has(t.listId))
        .map((t) => t.id);
      return {
        projects: s.projects.filter((p) => p.id !== id),
        lists: s.lists.filter((l) => l.projectId !== id),
        tasks: s.tasks.filter((t) => !listIds.has(t.listId)),
        attachments: pruneAttachmentCache(s.attachments, removedTaskIds),
        currentProjectId:
          s.currentProjectId === id ? null : s.currentProjectId,
        openTaskId: removedTaskIds.includes(s.openTaskId ?? '')
          ? null
          : s.openTaskId,
      };
    });
    void db.dbDeleteProjectCascade(id);
  },

  reorderProjects: (orderedIds) => {
    set((s) => {
      const map = new Map(s.projects.map((p) => [p.id, p]));
      const next = orderedIds
        .map((id, index) => {
          const p = map.get(id);
          return p ? { ...p, order: index } : null;
        })
        .filter((p): p is Project => p !== null);
      void db.dbPutProjects(next);
      return { projects: next };
    });
  },

  /* ---------- Lists ---------- */
  addList: (projectId, name = 'New List') => {
    const id = nanoid();
    const order =
      get()
        .lists.filter((l) => l.projectId === projectId)
        .reduce((max, l) => Math.max(max, l.order), -1) + 1;
    const list: List = {
      id,
      projectId,
      name,
      order,
      createdAt: Date.now(),
    };
    set((s) => ({ lists: [...s.lists, list] }));
    void db.dbPutList(list);
    return id;
  },

  renameList: (id, name) => {
    set((s) => ({
      lists: s.lists.map((l) => (l.id === id ? { ...l, name } : l)),
    }));
    const list = get().lists.find((l) => l.id === id);
    if (list) void db.dbPutList(list);
  },

  deleteList: (id) => {
    set((s) => {
      const removedTaskIds = s.tasks
        .filter((t) => t.listId === id)
        .map((t) => t.id);
      return {
        lists: s.lists.filter((l) => l.id !== id),
        tasks: s.tasks.filter((t) => t.listId !== id),
        attachments: pruneAttachmentCache(s.attachments, removedTaskIds),
        openTaskId: removedTaskIds.includes(s.openTaskId ?? '')
          ? null
          : s.openTaskId,
      };
    });
    void db.dbDeleteListCascade(id);
  },

  reorderLists: (projectId, orderedIds) => {
    set((s) => {
      const map = new Map(s.lists.map((l) => [l.id, l]));
      const reordered = orderedIds
        .map((id, index) => {
          const l = map.get(id);
          return l ? { ...l, order: index } : null;
        })
        .filter((l): l is List => l !== null);
      void db.dbPutLists(reordered);
      const others = s.lists.filter((l) => l.projectId !== projectId);
      return { lists: [...others, ...reordered] };
    });
  },

  /* ---------- Tasks ---------- */
  addTask: (listId, name) => {
    const id = nanoid();
    const order =
      get()
        .tasks.filter((t) => t.listId === listId)
        .reduce((max, t) => Math.max(max, t.order), -1) + 1;
    const task: Task = {
      id,
      listId,
      name,
      deadline: null,
      description: '',
      notes: '',
      order,
      createdAt: Date.now(),
    };
    set((s) => ({ tasks: [...s.tasks, task] }));
    void db.dbPutTask(task);
    return id;
  },

  updateTask: (id, patch) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
    const task = get().tasks.find((t) => t.id === id);
    if (task) void db.dbPutTask(task);
  },

  deleteTask: (id) => {
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== id),
      attachments: pruneAttachmentCache(s.attachments, [id]),
      openTaskId: s.openTaskId === id ? null : s.openTaskId,
    }));
    void db.dbDeleteTaskCascade(id);
  },

  applyTaskLayout: (next) => {
    set((s) => {
      // Replace only the tasks present in `next`, keep the rest.
      const nextIds = new Set(next.map((t) => t.id));
      const untouched = s.tasks.filter((t) => !nextIds.has(t.id));
      void db.dbPutTasks(next);
      return { tasks: [...untouched, ...next] };
    });
  },

  /* ---------- Attachments ---------- */
  loadAttachments: async (taskId) => {
    // Avoid re-loading / re-creating object URLs if already present.
    if (get().attachments[taskId]) return;
    const rows = await db.dbGetAttachmentsByTask(taskId);
    const metas: AttachmentMeta[] = rows
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((a) => ({
        id: a.id,
        taskId: a.taskId,
        name: a.name,
        type: a.type,
        size: a.size,
        createdAt: a.createdAt,
        url: URL.createObjectURL(a.blob),
      }));
    set((s) => ({ attachments: { ...s.attachments, [taskId]: metas } }));
  },

  addAttachment: async (taskId, file) => {
    const id = nanoid();
    const row = {
      id,
      taskId,
      name: file.name,
      type: file.type,
      size: file.size,
      blob: file,
      createdAt: Date.now(),
    };
    await db.dbPutAttachment(row);
    const meta: AttachmentMeta = {
      id,
      taskId,
      name: file.name,
      type: file.type,
      size: file.size,
      createdAt: row.createdAt,
      url: URL.createObjectURL(file),
    };
    set((s) => ({
      attachments: {
        ...s.attachments,
        [taskId]: [...(s.attachments[taskId] ?? []), meta],
      },
    }));
  },

  removeAttachment: async (taskId, attachmentId) => {
    await db.dbDeleteAttachment(attachmentId);
    set((s) => {
      const list = s.attachments[taskId] ?? [];
      const target = list.find((a) => a.id === attachmentId);
      if (target) URL.revokeObjectURL(target.url);
      return {
        attachments: {
          ...s.attachments,
          [taskId]: list.filter((a) => a.id !== attachmentId),
        },
      };
    });
  },
}));
