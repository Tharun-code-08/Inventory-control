import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { MarketingImageSlot } from '@/lib/marketing-content';

type MarketingImagePlaceholderProps = {
  slot: MarketingImageSlot;
  className?: string;
  aspectClassName?: string;
};

export function MarketingImagePlaceholder({
  slot,
  className,
  aspectClassName = 'aspect-[16/10]',
}: MarketingImagePlaceholderProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(slot.src) && !failed;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-lg shadow-slate-900/5',
        aspectClassName,
        className,
      )}
    >
      {showImage ? (
        <img
          src={slot.src}
          alt={slot.alt}
          className="h-full w-full object-cover object-top"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-primary">
            <ImageIcon className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">{slot.label}</p>
            <p className="mt-1 text-xs text-slate-500">
              Add <code className="rounded bg-slate-100 px-1 py-0.5">{slot.src?.split('/').pop() ?? 'screenshot'}</code>
              {' '}({slot.recommendedSize})
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
