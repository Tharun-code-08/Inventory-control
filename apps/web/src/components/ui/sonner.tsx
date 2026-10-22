import { Toaster as Sonner } from 'sonner';
import { useThemeStore } from '@/store/themeStore';

export function Toaster() {
  const theme = useThemeStore((state) => state.resolved);
  return (
    <Sonner
      theme={theme}
      position="top-right"
      closeButton
      duration={4000}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg motion-toast-enter overflow-hidden relative',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          error: 'motion-toast-error',
        },
      }}
    />
  );
}
