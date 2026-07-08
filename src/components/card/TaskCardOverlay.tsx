import { CalendarClock } from 'lucide-react';
import type { Task } from '../../types';
import { cn, deadlineStatus, formatDeadline } from '../../lib/utils';

/** Non-interactive card rendered inside the DragOverlay while dragging. */
export function TaskCardOverlay({ task }: { task: Task }) {
  const status = deadlineStatus(task.deadline);
  return (
    <div className="w-[284px] rotate-2 cursor-grabbing rounded-lg border border-white/15 bg-surface-3 px-3 py-2.5 shadow-2xl">
      <p className="text-[13px] font-medium leading-snug text-ink">
        {task.name}
      </p>
      {task.deadline && (
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
    </div>
  );
}
