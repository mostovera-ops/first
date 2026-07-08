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

const BASE_NAME = 'flux-kanban';
const DB_VERSION = 1;

/** Per-user namespace. `null` = the legacy (pre-auth) database. */
let namespace: string | null = null;
let dbPromise: Promise<IDBPDatabase<FluxDB>> | null = null;

function dbName(): string {
  return namespace ? `${BASE_NAME}:${namespace}` : BASE_NAME;
}

function createStores(db: IDBPDatabase<FluxDB>) {
  const projects = db.createObjectStore('projects', { keyPath: 'id' });
  projects.createIndex('byOrder', 'order');

  const lists = db.createObjectStore('lists', { keyPath: 'id' });
  lists.createIndex('byProject', 'projectId');

  const tasks = db.createObjectStore('tasks', { keyPath: 'id' });
  tasks.createIndex('byList', 'listId');

  const attachments = db.createObjectStore('attachments', { keyPath: 'id' });
  attachments.createIndex('byTask', 'taskId');
}

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<FluxDB>(dbName(), DB_VERSION, {
      upgrade(db) {
        createStores(db);
      },
    });
  }
  return dbPromise;
}

/**
 * Point the store at a specific user's database. Boards are namespaced by
 * user id so two accounts on the same browser never see each other's data.
 * Passing `null` returns to the legacy pre-auth database.
 */
export function setDbNamespace(userId: string | null) {
  if (userId === namespace) return;
  namespace = userId;
  dbPromise = null; // force reopen against the namespaced database
}

/**
 * One-time migration: if a legacy pre-auth `flux-kanban` database exists with
 * data and the current user's database is still empty, move the boards into
 * the user's namespace so existing work isn't lost. The legacy database is
 * deleted afterwards so a second account can't inherit the same boards.
 */
export async function migrateLegacyDataIfNeeded(userId: string) {
  if (!userId) return;

  // Only proceed if the legacy DB actually exists (avoid creating it).
  const listDatabases =
    typeof indexedDB !== 'undefined' && 'databases' in indexedDB
      ? () => indexedDB.databases()
      : null;
  if (!listDatabases) return;

  let existing: IDBDatabaseInfo[] = [];
  try {
    existing = await listDatabases();
  } catch {
    return;
  }
  const hasLegacy = existing.some((d) => d.name === BASE_NAME);
  if (!hasLegacy) return;

  // Make sure the target (user) DB is empty before importing.
  setDbNamespace(userId);
  const userDb = await getDB();
  const projectCount = await userDb.count('projects');
  if (projectCount > 0) return;

  // Read everything out of the legacy DB.
  const legacy = await openDB<FluxDB>(BASE_NAME, DB_VERSION, {
    upgrade(db) {
      createStores(db);
    },
  });
  const [projects, lists, tasks, attachments] = await Promise.all([
    legacy.getAll('projects'),
    legacy.getAll('lists'),
    legacy.getAll('tasks'),
    legacy.getAll('attachments'),
  ]);
  legacy.close();

  if (projects.length === 0 && lists.length === 0 && tasks.length === 0) {
    // Nothing worth keeping — drop the empty legacy DB and move on.
    await deleteDatabase(BASE_NAME);
    return;
  }

  // Write into the user's namespaced DB.
  const tx = userDb.transaction(
    ['projects', 'lists', 'tasks', 'attachments'],
    'readwrite',
  );
  await Promise.all([
    ...projects.map((p) => tx.objectStore('projects').put(p)),
    ...lists.map((l) => tx.objectStore('lists').put(l)),
    ...tasks.map((t) => tx.objectStore('tasks').put(t)),
    ...attachments.map((a) => tx.objectStore('attachments').put(a)),
  ]);
  await tx.done;

  // Claimed — remove the legacy DB so it isn't migrated again.
  await deleteDatabase(BASE_NAME);
}

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
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
