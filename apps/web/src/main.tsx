import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes/AppRoutes';
import './index.css';
import { api, applyAccessToken } from './api/client';
import { initializeSessionFromAuthResponse } from './lib/session';
import { useAuthStore } from './store/authStore';
import { initThemeFromStorage } from './store/themeStore';

initThemeFromStorage();

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
  if (state.accessToken) {
    applyAccessToken(state.accessToken);
  }

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
  }
}

function mountApp() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={qc}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}

useAuthStore.persist.onFinishHydration(() => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    applyAccessToken(accessToken);
  }
});

mountApp();
void bootstrapSession();
