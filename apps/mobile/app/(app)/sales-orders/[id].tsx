import { Screen, Title, Muted } from '@/components/ui';
import { PermissionGate } from '@/components/PermissionGate';

export default function SalesOrderDetailScreen() {
  return (
    <PermissionGate permission="shop:read">
      <Screen>
        <Title>Sales Order</Title>
        <Muted>Coming soon</Muted>
      </Screen>
    </PermissionGate>
  );
}
