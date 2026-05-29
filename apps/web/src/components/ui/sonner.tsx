import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      theme="light"
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
