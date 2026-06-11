import { Screen, Title, Muted } from '@/components/ui';
import { PermissionGate } from '@/components/PermissionGate';

export default function InvoicesScreen() {
  return (
    <PermissionGate permission="shop:read">
      <Screen>
        <Title>Invoices</Title>
        <Muted>Coming soon</Muted>
      </Screen>
    </PermissionGate>
  );
}
