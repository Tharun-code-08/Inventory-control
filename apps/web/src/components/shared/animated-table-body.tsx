import type { ComponentProps } from 'react';
import { TableBody } from '@/components/ui/table';
import { cn } from '@/lib/cn';

type AnimatedTableBodyProps = ComponentProps<typeof TableBody> & {
  /** Change when paginating to trigger a subtle fade-in on rows. */
  pageKey: string | number;
};

export function AnimatedTableBody({ pageKey, className, children, ...props }: AnimatedTableBodyProps) {
  return (
    <TableBody key={pageKey} className={cn('motion-page-enter', className)} {...props}>
      {children}
    </TableBody>
  );
}
