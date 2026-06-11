import { Screen, Title, Muted } from '@/components/ui';
import { PermissionGate } from '@/components/PermissionGate';

export default function PurchaseOrderDetailScreen() {
  return (
    <PermissionGate permission="purchase_order:read">
      <Screen>
        <Title>Purchase Order</Title>
        <Muted>Coming soon</Muted>
      </Screen>
    </PermissionGate>
  );
}
