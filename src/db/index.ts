import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Attachment, List, Project, Task } from '../types';

interface FluxDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
    indexes: { byOrder: number };
  };
  lists: {
    key: string;
    value: List;
    indexes: { byProject: string };
  };
  tasks: {
    key: string;
    value: Task;
    indexes: { byList: string };
  };
  attachments: {
    key: string;
    value: Attachment;
    indexes: { byTask: string };
  };
}

const DB_NAME = 'flux-kanban';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<FluxDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<FluxDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const projects = db.createObjectStore('projects', { keyPath: 'id' });
        projects.createIndex('byOrder', 'order');

        const lists = db.createObjectStore('lists', { keyPath: 'id' });
        lists.createIndex('byProject', 'projectId');

        const tasks = db.createObjectStore('tasks', { keyPath: 'id' });
        tasks.createIndex('byList', 'listId');

        const attachments = db.createObjectStore('attachments', {
          keyPath: 'id',
        });
        attachments.createIndex('byTask', 'taskId');
      },
    });
  }
  return dbPromise;
}

/* ---------- Projects ---------- */
export async function dbGetProjects(): Promise<Project[]> {
  const db = await getDB();
  return db.getAll('projects');
}
export async function dbPutProject(project: Project) {
  const db = await getDB();
  await db.put('projects', project);
}
export async function dbPutProjects(projects: Project[]) {
  const db = await getDB();
  const tx = db.transaction('projects', 'readwrite');
  await Promise.all(projects.map((p) => tx.store.put(p)));
  await tx.done;
}
export async function dbDeleteProject(id: string) {
  const db = await getDB();
  await db.delete('projects', id);
}

/* ---------- Lists ---------- */
export async function dbGetLists(): Promise<List[]> {
  const db = await getDB();
  return db.getAll('lists');
}
export async function dbPutList(list: List) {
  const db = await getDB();
  await db.put('lists', list);
}
export async function dbPutLists(lists: List[]) {
  const db = await getDB();
  const tx = db.transaction('lists', 'readwrite');
  await Promise.all(lists.map((l) => tx.store.put(l)));
  await tx.done;
}
export async function dbDeleteList(id: string) {
  const db = await getDB();
  await db.delete('lists', id);
}

/* ---------- Tasks ---------- */
export async function dbGetTasks(): Promise<Task[]> {
  const db = await getDB();
  return db.getAll('tasks');
}
export async function dbPutTask(task: Task) {
  const db = await getDB();
  await db.put('tasks', task);
}
export async function dbPutTasks(tasks: Task[]) {
  const db = await getDB();
  const tx = db.transaction('tasks', 'readwrite');
  await Promise.all(tasks.map((t) => tx.store.put(t)));
  await tx.done;
}
export async function dbDeleteTask(id: string) {
  const db = await getDB();
  await db.delete('tasks', id);
}

/* ---------- Attachments ---------- */
export async function dbGetAttachments(): Promise<Attachment[]> {
  const db = await getDB();
  return db.getAll('attachments');
}
export async function dbGetAttachmentsByTask(
  taskId: string,
): Promise<Attachment[]> {
  const db = await getDB();
  return db.getAllFromIndex('attachments', 'byTask', taskId);
}
export async function dbPutAttachment(attachment: Attachment) {
  const db = await getDB();
  await db.put('attachments', attachment);
}
export async function dbDeleteAttachment(id: string) {
  const db = await getDB();
  await db.delete('attachments', id);
}

/* ---------- Cascading deletes ---------- */
export async function dbDeleteProjectCascade(projectId: string) {
  const db = await getDB();
  const lists = await db.getAllFromIndex('lists', 'byProject', projectId);
  for (const list of lists) {
    await dbDeleteListCascade(list.id);
  }
  await db.delete('projects', projectId);
}

export async function dbDeleteListCascade(listId: string) {
  const db = await getDB();
  const tasks = await db.getAllFromIndex('tasks', 'byList', listId);
  for (const task of tasks) {
    await dbDeleteTaskCascade(task.id);
  }
  await db.delete('lists', listId);
}

export async function dbDeleteTaskCascade(taskId: string) {
  const db = await getDB();
  const atts = await db.getAllFromIndex('attachments', 'byTask', taskId);
  const tx = db.transaction('attachments', 'readwrite');
  await Promise.all(atts.map((a) => tx.store.delete(a.id)));
  await tx.done;
  await db.delete('tasks', taskId);
}
