import { createElement } from 'react';
import { toast } from 'sonner';
import { SuccessCheckmark } from '@/components/motion/SuccessCheckmark';

type ActionErrorOptions = {
  message: string;
  retry?: () => void;
  duration?: number;
};

type ActionSuccessOptions = {
  message: string;
  duration?: number;
};

export function showActionError({ message, retry, duration = 8000 }: ActionErrorOptions) {
  toast.error(message, {
    duration,
    action: retry
      ? {
          label: 'Retry',
          onClick: () => retry(),
        }
      : undefined,
    classNames: {
      toast: 'motion-toast-enter motion-toast-error',
    },
  });
}

export function showActionSuccess({ message, duration = 4000 }: ActionSuccessOptions) {
  toast.success(message, {
    duration,
    icon: createElement(SuccessCheckmark),
    classNames: {
      toast: 'motion-toast-enter',
    },
  });
}
