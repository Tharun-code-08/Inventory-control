import { Screen, Title, Muted } from '@/components/ui';
import { PermissionGate } from '@/components/PermissionGate';

export default function CustomersScreen() {
  return (
    <PermissionGate permission="shop:read">
      <Screen>
        <Title>Customers</Title>
        <Muted>Coming soon</Muted>
      </Screen>
    </PermissionGate>
  );
}
