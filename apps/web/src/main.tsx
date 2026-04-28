import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes/AppRoutes';
import './index.css';
import { api, applyAccessToken } from './api/client';
import { initializeSessionFromAuthResponse } from './lib/session';
import { useAuthStore } from './store/authStore';

const qc = new QueryClient();

async function bootstrapSession() {
  const state = useAuthStore.getState();
  if (state.accessToken) {
    applyAccessToken(state.accessToken);
  }

  try {
    const res = await api.post('/auth/refresh');
    await initializeSessionFromAuthResponse(res.data);
  } catch {
    applyAccessToken(null);
    useAuthStore.getState().clear();
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
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}

function normalizedPathname(): string {
  if (typeof window === 'undefined') return '/';
  const raw = window.location.pathname;
  const trimmed = raw.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

const path = normalizedPathname();
const skipBlockingBootstrap = path === '/' || path === '/login';

if (skipBlockingBootstrap) {
  mountApp();
  void bootstrapSession();
} else {
  void bootstrapSession().finally(() => mountApp());
}
