import { useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Camera, Loader2 } from 'lucide-react';
import type { Profile } from '../../types';
import { useProfile } from '../../store/profile';
import { Avatar } from './Avatar';
import { AvatarCropper } from './AvatarCropper';

interface AvatarUploadButtonProps {
  profile: Profile | null;
  user: User | null;
  size?: number;
}

/**
 * The avatar preview, click to upload a photo. Shows a camera badge on hover
 * and runs the crop-to-circle flow, then stores the image via the profile.
 */
export function AvatarUploadButton({
  profile,
  user,
  size = 64,
}: AvatarUploadButtonProps) {
  const uploadAvatarImage = useProfile((s) => s.uploadAvatarImage);
  const inputRef = useRef<HTMLInputElement>(null);
  const [croppingFile, setCroppingFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    setCroppingFile(file);
  };

  const handleCropped = async (blob: Blob) => {
    setBusy(true);
    setError(null);
    try {
      await uploadAvatarImage(blob);
      setCroppingFile(null);
    } catch {
      setError('Upload failed. Check your Storage bucket setup.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label="Upload a photo"
        title="Upload a photo"
        className="group relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        style={{ width: size, height: size }}
      >
        <Avatar profile={profile} user={user} size={size} />
        {/* Hover overlay */}
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          {busy ? (
            <Loader2 size={18} className="animate-spin text-white" />
          ) : (
            <Camera size={18} className="text-white" />
          )}
        </span>
        {/* Camera badge */}
        <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-elevated bg-accent text-white">
          <Camera size={11} />
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFilePicked}
      />

      {error && <p className="text-[11px] text-danger">{error}</p>}

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
