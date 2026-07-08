export interface Attachment {
  id: string;
  taskId: string;
  name: string;
  type: string; // MIME type
  size: number;
  blob: Blob; // stored directly in IndexedDB
  createdAt: number;
}

export interface Task {
  id: string;
  listId: string;
  name: string;
  deadline: string | null; // ISO date string (yyyy-mm-dd)
  description: string;
  notes: string;
  order: number;
  createdAt: number;
}

export interface List {
  id: string;
  projectId: string;
  name: string;
  order: number;
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  order: number;
  createdAt: number;
}

/** Attachment as held in the store — blob replaced by an object URL for rendering. */
export interface AttachmentMeta {
  id: string;
  taskId: string;
  name: string;
  type: string;
  size: number;
  createdAt: number;
  url: string; // object URL created from the blob
}
