import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TransactionNumberSeriesSection } from '@/components/settings/TransactionNumberSeriesSection';

export function SettingsCustomizationTab() {
  const [searchParams, setSearchParams] = useSearchParams();

  const section = useMemo(() => {
    const requested = searchParams.get('section');
    return requested === 'transaction-number-series' ? requested : 'transaction-number-series';
  }, [searchParams]);

  return (
    <Tabs
      value={section}
      onValueChange={(value) => {
        const next = new URLSearchParams(searchParams);
        next.set('tab', 'customization');
        next.set('section', value);
        setSearchParams(next, { replace: true });
      }}
      className="space-y-4"
    >
      <TabsList>
        <TabsTrigger value="transaction-number-series">Transaction Number Series</TabsTrigger>
      </TabsList>
      <TabsContent value="transaction-number-series">
        <TransactionNumberSeriesSection />
      </TabsContent>
    </Tabs>
  );
}
