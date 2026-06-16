import { ScrollView } from 'react-native';
import { Link, type Href } from 'expo-router';
import { PermissionGate } from '@/components/PermissionGate';
import { ListRow, Screen } from '@/components/ui';

const REPORTS: { href: Href; title: string; subtitle: string }[] = [
  { href: '/reports/dead-stock', title: 'Dead Stock', subtitle: 'Where money is stuck — slow / unsold items' },
  { href: '/reports/reorder', title: 'Reorder', subtitle: 'What to reorder next — low / out of stock' },
  { href: '/reports/profitability', title: 'Profitability', subtitle: 'Product margins — what makes money' },
  { href: '/reports/movement', title: 'Stock Movement', subtitle: 'How inventory is behaving — fast movers' },
];

export default function ReportsScreen() {
  return (
    <PermissionGate permission="report:view">
      <Screen>
        <ScrollView>
          {REPORTS.map((r) => (
            <Link key={r.title} href={r.href} asChild>
              <ListRow title={r.title} subtitle={r.subtitle} />
            </Link>
          ))}
        </ScrollView>
      </Screen>
    </PermissionGate>
  );
}
