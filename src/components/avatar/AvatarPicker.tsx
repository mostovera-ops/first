import { useState } from 'react';
import { Upload, Check, Loader2 } from 'lucide-react';
import { useProfile } from '../../store/profile';
import { ANIMALS } from '../../lib/avatar';
import { animalImageSrc } from './Avatar';
import { AvatarCropper } from './AvatarCropper';
import { cn } from '../../lib/utils';

export function AvatarPicker() {
  const profile = useProfile((s) => s.profile);
  const setAnimalAvatar = useProfile((s) => s.setAnimalAvatar);
  const uploadAvatarImage = useProfile((s) => s.uploadAvatarImage);

  const [croppingFile, setCroppingFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isUpload = profile?.avatar_type === 'upload';

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setUploadError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file.');
      return;
    }
    setCroppingFile(file);
  };

  const handleCropped = async (blob: Blob) => {
    setBusy(true);
    setUploadError(null);
    try {
      await uploadAvatarImage(blob);
      setCroppingFile(null);
    } catch {
      setUploadError('Upload failed. Check your Storage bucket setup.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-7">
        {ANIMALS.map((animal) => {
          const selected =
            profile?.avatar_type === 'animal' &&
            profile.avatar_animal === animal.slug;
          return (
            <button
              key={animal.slug}
              title={animal.name}
              aria-label={animal.name}
              onClick={() => void setAnimalAvatar(animal.slug)}
              className={cn(
                'relative aspect-square overflow-hidden rounded-xl border transition',
                selected
                  ? 'border-accent ring-2 ring-accent/40'
                  : 'border-line hover:border-white/20 hover:bg-surface-2',
              )}
            >
              <AnimalTile slug={animal.slug} emoji={animal.emoji} />
              {selected && (
                <span className="absolute right-0.5 top-0.5 rounded-full bg-accent p-0.5 text-white">
                  <Check size={10} />
                </span>
              )}
            </button>
          );
        })}

        {/* Upload your own */}
        <label
          className={cn(
            'relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed transition',
            isUpload
              ? 'border-accent ring-2 ring-accent/40'
              : 'border-line text-ink-faint hover:border-white/20 hover:bg-surface-2 hover:text-ink-muted',
          )}
          title="Upload your own"
        >
          {busy ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          <span className="text-[9px] font-medium">Upload</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFilePicked}
          />
          {isUpload && (
            <span className="absolute right-0.5 top-0.5 rounded-full bg-accent p-0.5 text-white">
              <Check size={10} />
            </span>
          )}
        </label>
      </div>

      {uploadError && (
        <p className="mt-2 text-[12px] text-danger">{uploadError}</p>
      )}
      <p className="mt-2 text-[11px] text-ink-faint">
        Pick a character or upload your own photo — it’s cropped to a circle.
      </p>

      {croppingFile && (
        <AvatarCropper
          file={croppingFile}
          onCancel={() => setCroppingFile(null)}
          onCropped={handleCropped}
        />
      )}
    </div>
  );
}

/** Animal tile: real render if present, else emoji on a soft surface. */
function AnimalTile({ slug, emoji }: { slug: string; emoji: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="flex h-full w-full items-center justify-center bg-surface-2 text-[22px]">
        {emoji}
      </span>
    );
  }
  return (
    <img
      src={animalImageSrc(slug)}
      alt=""
      className="h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}
