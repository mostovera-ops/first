import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

interface InlineEditProps {
  value: string;
  onCommit: (value: string) => void;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  /** Render as textarea (multi-line) instead of input. */
  multiline?: boolean;
  ariaLabel?: string;
}

/**
 * Click-to-edit text. Enter (or blur) commits, Esc cancels.
 * Controlled `editing` so parents can trigger edit mode (e.g. right after add).
 */
export function InlineEdit({
  value,
  onCommit,
  editing,
  onEditingChange,
  className,
  inputClassName,
  placeholder,
  multiline = false,
  ariaLabel,
}: InlineEditProps) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      // Focus + select on next tick so the element exists.
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing, value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onCommit(trimmed);
    onEditingChange(false);
  };

  const cancel = () => {
    setDraft(value);
    onEditingChange(false);
  };

  if (!editing) {
    return (
      <span
        className={className}
        onDoubleClick={() => onEditingChange(true)}
      >
        {value || placeholder}
      </span>
    );
  }

  const commonProps = {
    ref: inputRef,
    value: draft,
    'aria-label': ariaLabel,
    placeholder,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft(e.target.value),
    onBlur: commit,
    onKeyDown: (
      e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      if (e.key === 'Enter' && !(multiline && e.shiftKey)) {
        e.preventDefault();
        commit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    },
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    className: cn(
      'w-full rounded-md border border-accent/60 bg-surface outline-none ring-2 ring-accent/25',
      inputClassName,
    ),
  };

  return multiline ? (
    <textarea {...commonProps} rows={1} />
  ) : (
    <input {...commonProps} type="text" />
  );
}
