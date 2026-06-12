import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
import { api } from '@/api/client';
import { productKeys } from '@/hooks/use-products';
import { uploadAssetUrl } from '@/lib/upload-url';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

type Props = {
  productId: string;
  imageUrl?: string | null;
  /** Notified after upload/remove so the parent can refresh its copy. */
  onChanged?: (image: { imageUrl: string | null; thumbnailUrl: string | null }) => void;
};

/**
 * Image upload block for the product edit dialog. The API compresses the
 * image and generates a thumbnail; this component only ships the file.
 */
export function ProductImageUpload({ productId, imageUrl, onChanged }: Props) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shown = preview ?? uploadAssetUrl(imageUrl);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData();
      body.append('image', file);
      const res = await api.post(`/products/${productId}/image`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return (res.data?.data ?? res.data) as { imageUrl: string | null; thumbnailUrl: string | null };
    },
    onSuccess: (data) => {
      setError(null);
      qc.invalidateQueries({ queryKey: productKeys.all });
      onChanged?.(data);
    },
    onError: (e: unknown) => {
      setPreview(null);
      const message =
        (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? 'Image upload failed';
      setError(message);
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      const res = await api.delete(`/products/${productId}/image`);
      return (res.data?.data ?? res.data) as { imageUrl: string | null; thumbnailUrl: string | null };
    },
    onSuccess: (data) => {
      setPreview(null);
      setError(null);
      qc.invalidateQueries({ queryKey: productKeys.all });
      onChanged?.(data);
    },
  });

  const busy = upload.isPending || remove.isPending;

  function onPick(file: File | undefined) {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    upload.mutate(file);
  }

  return (
    <div className="space-y-2">
      <Label>Product image</Label>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md border bg-muted">
          {shown ? (
            <img src={shown} alt="Product" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {upload.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {shown ? 'Replace image' : 'Upload image'}
          </Button>
          {shown ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => remove.mutate()}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        PNG, JPEG, or WebP up to 8MB. Compressed and thumbnailed automatically.
      </p>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
