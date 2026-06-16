import { Screen, Title, Muted } from '@/components/ui';
import { PermissionGate } from '@/components/PermissionGate';

export default function InvoiceDetailScreen() {
  return (
    <PermissionGate permission="shop:read">
      <Screen>
        <Title>Invoice</Title>
        <Muted>Coming soon</Muted>
      </Screen>
    </PermissionGate>
  );
}
