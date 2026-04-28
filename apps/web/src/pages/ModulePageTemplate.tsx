import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/shared/page-header';

type ModulePageTemplateProps = {
  title: string;
  description: string;
};

export function ModulePageTemplate({ title, description }: ModulePageTemplateProps) {
  return (
    <AppLayout active={title}>
      <div className="space-y-6">
        <PageHeader title={title} description={description} />
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This module is now available in navigation again. Core pages are restored and ready for detailed data forms/listing integration.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
