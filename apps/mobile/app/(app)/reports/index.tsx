import { Screen, Title, Muted } from '@/components/ui';
import { PermissionGate } from '@/components/PermissionGate';

export default function ReportsScreen() {
  return (
    <PermissionGate permission="report:view">
      <Screen>
        <Title>Reports</Title>
        <Muted>Coming soon</Muted>
      </Screen>
    </PermissionGate>
  );
}
