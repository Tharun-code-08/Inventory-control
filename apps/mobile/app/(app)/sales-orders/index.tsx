import { Screen, Title, Muted } from '@/components/ui';
import { PermissionGate } from '@/components/PermissionGate';

export default function SalesOrdersScreen() {
  return (
    <PermissionGate permission="shop:read">
      <Screen>
        <Title>Sales Orders</Title>
        <Muted>Coming soon</Muted>
      </Screen>
    </PermissionGate>
  );
}
