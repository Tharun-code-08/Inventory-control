import { Screen, Title, Muted } from '@/components/ui';
import { PermissionGate } from '@/components/PermissionGate';

export default function CustomerDetailScreen() {
  return (
    <PermissionGate permission="shop:read">
      <Screen>
        <Title>Customer</Title>
        <Muted>Coming soon</Muted>
      </Screen>
    </PermissionGate>
  );
}
