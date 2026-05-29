import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from './page-header';
import { Button } from '@/components/ui/button';

type CreatePageLayoutProps = {
  title: string;
  description?: string;
  backTo: string;
  backLabel?: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function CreatePageLayout({
  title,
  description,
  backTo,
  backLabel = 'Back',
  children,
  actions,
}: CreatePageLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="create-page-shell space-y-6 p-4 sm:p-6">
      <PageHeader title={title} description={description}>
        <div className="flex items-center gap-2">
          {actions}
          <Button type="button" variant="outline" onClick={() => navigate(backTo)}>
            {backLabel}
          </Button>
        </div>
      </PageHeader>
      {children}
    </div>
  );
}
