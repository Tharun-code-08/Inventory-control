import { View } from 'react-native';
import { Screen, Title, Muted } from '@/components/ui';
import { PermissionGate } from '@/components/PermissionGate';

export default function PurchaseOrdersScreen() {
  return (
    <PermissionGate permission="purchase_order:read">
      <Screen>
        <Title>Purchase Orders</Title>
        <Muted>Coming soon</Muted>
      </Screen>
    </PermissionGate>
  );
}
