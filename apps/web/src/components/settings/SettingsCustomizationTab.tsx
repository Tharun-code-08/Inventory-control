import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TransactionNumberSeriesSection } from '@/components/settings/TransactionNumberSeriesSection';
import { EmailNotificationsSection } from '@/components/settings/EmailNotificationsSection';
import { BarcodeSettingsSection } from '@/components/settings/BarcodeSettingsSection';

const CUSTOMIZATION_SECTIONS = ['transaction-number-series', 'email-notifications', 'barcode-settings'] as const;
type CustomizationSection = (typeof CUSTOMIZATION_SECTIONS)[number];

function isCustomizationSection(value: string | null): value is CustomizationSection {
  return CUSTOMIZATION_SECTIONS.includes(value as CustomizationSection);
}

export function SettingsCustomizationTab() {
  const [searchParams, setSearchParams] = useSearchParams();

  const section = useMemo(() => {
    const requested = searchParams.get('section');
    return isCustomizationSection(requested) ? requested : 'transaction-number-series';
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
        <TabsTrigger value="email-notifications">Email Notifications</TabsTrigger>
        <TabsTrigger value="barcode-settings">Barcode Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="transaction-number-series">
        <TransactionNumberSeriesSection />
      </TabsContent>
      <TabsContent value="email-notifications">
        <EmailNotificationsSection />
      </TabsContent>
      <TabsContent value="barcode-settings">
        <BarcodeSettingsSection />
      </TabsContent>
    </Tabs>
  );
}
