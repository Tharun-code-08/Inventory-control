import { cn } from '@/lib/cn';

type SuccessCheckmarkProps = {
  className?: string;
  size?: 'sm' | 'md';
};

export function SuccessCheckmark({ className, size = 'sm' }: SuccessCheckmarkProps) {
  const dim = size === 'md' ? 'h-6 w-6' : 'h-4 w-4';

  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center text-emerald-600', dim, className)}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className={cn('motion-success-checkmark', dim)} fill="none">
        <circle
          cx="12"
          cy="12"
          r="10"
          className="motion-success-checkmark-circle"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <path
          d="M8 12.5 10.5 15 16 9"
          className="motion-success-checkmark-path"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
