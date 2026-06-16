import { Screen, Title, Muted } from '@/components/ui';
import { PermissionGate } from '@/components/PermissionGate';

export default function SuppliersScreen() {
  return (
    <PermissionGate permission="supplier:read">
      <Screen>
        <Title>Suppliers</Title>
        <Muted>Coming soon</Muted>
      </Screen>
    </PermissionGate>
  );
}
