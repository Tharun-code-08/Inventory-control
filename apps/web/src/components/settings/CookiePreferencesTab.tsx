import { ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCookieConsentStore } from '@/store/cookieConsentStore';

export function CookiePreferencesTab() {
  const { preferences, setPreferencesOpen } = useCookieConsentStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4" />
          Cookie Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Essential cookies are always on to protect sign-in and CSRF-sensitive actions. Functional
          cookies are optional and control convenience features like trusted device login and active
          workspace memory.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border bg-muted px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">Essential cookies</p>
              <Badge variant="success">Always on</Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <code className="rounded bg-card px-1.5 py-0.5 text-foreground">session_id</code>
              <code className="rounded bg-card px-1.5 py-0.5 text-foreground">csrf_token</code>
              <code className="rounded bg-card px-1.5 py-0.5 text-foreground">cookie_consent</code>
            </div>
          </div>
          <div className="rounded-xl border bg-muted px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">Functional cookies</p>
              <Badge variant={preferences.functional ? 'info' : 'secondary'}>
                {preferences.functional ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <code className="rounded bg-card px-1.5 py-0.5 text-foreground">remember_me</code>
              <code className="rounded bg-card px-1.5 py-0.5 text-foreground">org_id</code>
            </div>
          </div>
        </div>

        <Button type="button" onClick={() => setPreferencesOpen(true)}>
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Manage cookie preferences
        </Button>
      </CardContent>
    </Card>
  );
}

export default CookiePreferencesTab;
