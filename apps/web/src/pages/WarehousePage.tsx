import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAlerts, useMarkAlertRead, useRunAlertChecks } from '@/hooks/use-alerts';

export function WarehousePage() {
  const { data: alerts = [] } = useAlerts();
  const runChecks = useRunAlertChecks();
  const markRead = useMarkAlertRead();

  return (
    <AppLayout active="Warehouse">
      <div className="space-y-6">
        <PageHeader title="Warehouse" description="Operational alerts and warehouse monitoring.">
          <Button onClick={() => runChecks.mutate()} disabled={runChecks.isPending}>
            {runChecks.isPending ? 'Checking...' : 'Run Automation Checks'}
          </Button>
        </PageHeader>
        <Card>
          <CardHeader><CardTitle>Alert Queue</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Title</TableHead><TableHead>Message</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {alerts.length === 0 ? <TableRow><TableCell colSpan={5}>No alerts.</TableCell></TableRow> : alerts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.alertType}</TableCell>
                    <TableCell>{a.title}</TableCell>
                    <TableCell>{a.message}</TableCell>
                    <TableCell>{a.isRead ? 'Read' : 'Unread'}</TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => markRead.mutate(a.id)}>Mark read</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

