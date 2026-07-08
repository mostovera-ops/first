export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(k)),
  );
  const value = bytes / Math.pow(k, i);
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

export type DeadlineStatus = 'overdue' | 'soon' | 'normal';

/** Days between today and the deadline (local, date-only). */
function daysUntil(deadline: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = deadline.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export function deadlineStatus(deadline: string | null): DeadlineStatus {
  if (!deadline) return 'normal';
  const days = daysUntil(deadline);
  if (days < 0) return 'overdue';
  if (days <= 2) return 'soon';
  return 'normal';
}

/** Compact, human deadline label: Today, Tomorrow, Mon 8, Jul 8. */
export function formatDeadline(deadline: string): string {
  const days = daysUntil(deadline);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  const [y, m, d] = deadline.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}
