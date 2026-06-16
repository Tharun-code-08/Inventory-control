import { Screen, Title, Muted } from '@/components/ui';
import { PermissionGate } from '@/components/PermissionGate';

export default function SupplierDetailScreen() {
  return (
    <PermissionGate permission="supplier:read">
      <Screen>
        <Title>Supplier</Title>
        <Muted>Coming soon</Muted>
      </Screen>
    </PermissionGate>
  );
}
