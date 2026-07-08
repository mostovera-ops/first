import { useEffect, useRef, useState } from 'react';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
import { useStore } from '../../store';
import { cn, formatBytes } from '../../lib/utils';

export function Attachments({ taskId }: { taskId: string }) {
  const attachments = useStore((s) => s.attachments[taskId]);
  const loadAttachments = useStore((s) => s.loadAttachments);
  const addAttachment = useStore((s) => s.addAttachment);
  const removeAttachment = useStore((s) => s.removeAttachment);

  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadAttachments(taskId);
  }, [taskId, loadAttachments]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      void addAttachment(taskId, file);
    }
  };

  const items = attachments ?? [];

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-5 text-center transition-colors',
          dragOver
            ? 'border-accent/60 bg-accent-soft'
            : 'border-line hover:border-white/20 hover:bg-surface-2',
        )}
      >
        <Upload size={18} className="text-ink-faint" />
        <p className="text-[12px] text-ink-muted">
          <span className="font-medium text-ink">Click to upload</span> or drag
          &amp; drop
        </p>
        <p className="text-[11px] text-ink-faint">Files are stored locally</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {items.length > 0 && (
        <ul className="mt-2.5 flex flex-col gap-1.5">
          {items.map((att) => {
            const isImage = att.type.startsWith('image/');
            return (
              <li
                key={att.id}
                className="group flex items-center gap-3 rounded-lg border border-line bg-surface-2 p-2"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-surface">
                  {isImage ? (
                    <img
                      src={att.url}
                      alt={att.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FileText size={16} className="text-ink-faint" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="block truncate text-[12px] font-medium text-ink hover:text-accent"
                    title={att.name}
                  >
                    {att.name}
                  </a>
                  <p className="flex items-center gap-1 text-[11px] text-ink-faint">
                    {isImage ? <ImageIcon size={10} /> : null}
                    {formatBytes(att.size)}
                  </p>
                </div>
                <button
                  aria-label={`Remove ${att.name}`}
                  onClick={() => removeAttachment(taskId, att.id)}
                  className="rounded-md p-1.5 text-ink-faint opacity-0 transition-opacity hover:bg-danger/15 hover:text-danger group-hover:opacity-100"
                >
                  <X size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
