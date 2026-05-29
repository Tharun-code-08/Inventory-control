import type { ReactNode } from 'react';

type PageTransitionProps = {
  routeKey: string;
  children: ReactNode;
};

export function PageTransition({ routeKey, children }: PageTransitionProps) {
  return (
    <div key={routeKey} className="motion-page-enter motion-page">
      {children}
    </div>
  );
}
