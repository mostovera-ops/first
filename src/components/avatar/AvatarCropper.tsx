import { useEffect, useRef, useState } from 'react';
import { Loader2, ZoomIn } from 'lucide-react';

interface AvatarCropperProps {
  file: File;
  onCancel: () => void;
  onCropped: (blob: Blob) => Promise<void> | void;
}

const VIEWPORT = 288; // on-screen crop square (px)
const OUTPUT = 512; // exported image size (px)

/**
 * Pan + zoom cropper. The image always covers the circular viewport; on save
 * the visible square is drawn to a 512×512 canvas and returned as a PNG blob.
 */
export function AvatarCropper({ file, onCancel, onCropped }: AvatarCropperProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );
  const url = useRef<string>('');

  // Load the file into an Image element.
  useEffect(() => {
    url.current = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    image.src = url.current;
    return () => URL.revokeObjectURL(url.current);
  }, [file]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  // "cover" base scale, then apply user zoom.
  const baseScale = img
    ? Math.max(VIEWPORT / img.naturalWidth, VIEWPORT / img.naturalHeight)
    : 1;
  const displayScale = baseScale * zoom;
  const dispW = img ? img.naturalWidth * displayScale : 0;
  const dispH = img ? img.naturalHeight * displayScale : 0;

  const clamp = (x: number, y: number) => ({
    x: Math.min(0, Math.max(VIEWPORT - dispW, x)),
    y: Math.min(0, Math.max(VIEWPORT - dispH, y)),
  });

  // Re-clamp offset whenever zoom changes.
  useEffect(() => {
    setOffset((o) => clamp(o.x, o.y));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, img]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const nx = drag.current.ox + (e.clientX - drag.current.x);
    const ny = drag.current.oy + (e.clientY - drag.current.y);
    setOffset(clamp(nx, ny));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const save = async () => {
    if (!img) return;
    setSaving(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext('2d')!;
      // Map viewport → source pixels.
      const sx = -offset.x / displayScale;
      const sy = -offset.y / displayScale;
      const sSize = VIEWPORT / displayScale;
      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT, OUTPUT);
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, 'image/png'),
      );
      if (blob) await onCropped(blob);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="animate-overlay-in fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={onCancel}
    >
      <div
        className="animate-modal-in w-full max-w-sm rounded-2xl border border-line bg-elevated p-5 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-[15px] font-semibold text-ink">
          Position your photo
        </h2>
        <p className="mb-4 text-[12px] text-ink-muted">
          Drag to reposition, and zoom to fit the circle.
        </p>

        <div
          className="relative mx-auto touch-none overflow-hidden rounded-full border border-line bg-surface-2"
          style={{ width: VIEWPORT, height: VIEWPORT }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {img ? (
            <img
              src={url.current}
              alt=""
              draggable={false}
              className="pointer-events-none max-w-none cursor-grab select-none"
              style={{
                width: dispW,
                height: dispH,
                transform: `translate(${offset.x}px, ${offset.y}px)`,
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-ink-faint">
              <Loader2 size={20} className="animate-spin" />
            </div>
          )}
          {/* subtle ring to emphasise the circular crop */}
          <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/10" />
        </div>

        <div className="mt-4 flex items-center gap-2.5">
          <ZoomIn size={15} className="shrink-0 text-ink-faint" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-surface-3 accent-accent"
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md border border-line bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!img || saving}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save avatar
          </button>
        </div>
      </div>
    </div>
  );
}
