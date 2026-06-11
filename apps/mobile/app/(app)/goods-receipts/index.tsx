import { Screen, Title, Muted } from '@/components/ui';
import { PermissionGate } from '@/components/PermissionGate';

export default function GoodsReceiptsScreen() {
  return (
    <PermissionGate permission="goods_receipt:read">
      <Screen>
        <Title>Goods Receipts</Title>
        <Muted>Coming soon</Muted>
      </Screen>
    </PermissionGate>
  );
}
