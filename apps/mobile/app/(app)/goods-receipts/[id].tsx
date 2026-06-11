import { Screen, Title, Muted } from '@/components/ui';
import { PermissionGate } from '@/components/PermissionGate';

export default function GoodsReceiptDetailScreen() {
  return (
    <PermissionGate permission="goods_receipt:read">
      <Screen>
        <Title>Goods Receipt</Title>
        <Muted>Coming soon</Muted>
      </Screen>
    </PermissionGate>
  );
}
