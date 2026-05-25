import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AppRoutes } from './routes/AppRoutes';
import './index.css';
import { api, applyAccessToken } from './api/client';
import { CookieConsentManager } from './components/cookies/CookieConsentManager';
import { initializeSessionFromAuthResponse } from './lib/session';
import { useAuthStore } from './store/authStore';
import { initThemeFromStorage } from './store/themeStore';

initThemeFromStorage();

if (typeof window !== 'undefined') {
  window.localStorage.removeItem('retail-ims-auth');
}

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

async function bootstrapSession() {
  const state = useAuthStore.getState();
  const tokenAtBootstrapStart = state.accessToken;

  try {
    const res = await api.post('/auth/refresh');
    await initializeSessionFromAuthResponse(res.data);
  } catch {
    const currentToken = useAuthStore.getState().accessToken;
    // If login succeeded while refresh was in-flight, don't wipe session.
    if (!currentToken || currentToken === tokenAtBootstrapStart) {
      applyAccessToken(null);
      useAuthStore.getState().clear();
    }
  } finally {
    useAuthStore.getState().setInitialized(true);
  }
}

function mountApp() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={qc}>
        <BrowserRouter>
          <AppRoutes />
          <CookieConsentManager />
          <SpeedInsights />
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}

mountApp();
void bootstrapSession();
