import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: Record<string, unknown>,
      ) => string | undefined;
      reset?: (id?: string) => void;
    };
  }
}

export function TurnstileField({
  siteKey,
  onToken,
}: {
  siteKey?: string;
  onToken: (token: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | undefined>();

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;

    const renderWidget = () => {
      if (!containerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: 'light',
        callback: (token: string) => {
          if (!cancelled) onToken(token);
        },
        'error-callback': () => {
          if (!cancelled) onToken('');
        },
        'expired-callback': () => {
          if (!cancelled) onToken('');
        },
      }) as string | undefined;
    };

    if (window.turnstile) {
      renderWidget();
      return () => {
        cancelled = true;
        if (widgetIdRef.current && window.turnstile?.reset) {
          window.turnstile.reset(widgetIdRef.current);
        }
      };
    }

    const scriptId = 'cf-turnstile-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
      return () => {
        cancelled = true;
        if (widgetIdRef.current && window.turnstile?.reset) {
          window.turnstile.reset(widgetIdRef.current);
        }
      };
    }

    const existing = document.getElementById(scriptId);
    existing?.addEventListener('load', renderWidget);
    return () => {
      cancelled = true;
      existing?.removeEventListener('load', renderWidget);
      if (widgetIdRef.current && window.turnstile?.reset) {
        window.turnstile.reset(widgetIdRef.current);
      }
    };
  }, [siteKey, onToken]);

  if (!siteKey) return null;

  return <div className="mt-1" ref={containerRef} />;
}

export default TurnstileField;
