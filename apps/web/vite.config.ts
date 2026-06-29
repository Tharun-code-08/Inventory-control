import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type ProxyOptions } from 'vite';

const webHost = '127.0.0.1';
const webPort = 5200;

const apiProxy: Record<string, ProxyOptions> = {
  '/api': {
    target: 'http://127.0.0.1:3000',
    changeOrigin: true,
    configure(proxy) {
      proxy.on('error', (err, _req, res) => {
        const r = res as { writeHead?: (c: number, h: Record<string, string>) => void; end?: (b: string) => void };
        if (typeof r?.writeHead === 'function') {
          r.writeHead(502, { 'Content-Type': 'application/json' });
          r.end?.(
            JSON.stringify({
              success: false,
              error: {
                code: 'API_UPSTREAM_UNAVAILABLE',
                message:
                  'Cannot reach the API on port 3000. Open retail-ims/README.md and follow “One-command setup” (Docker Desktop → Postgres & Redis → migrate & seed → npm run dev).',
                details:
                  'npm run docker:deps (from retail-ims) · then: cd apps/api && npx prisma migrate deploy && npx prisma db seed · then: npm run dev from retail-ims',
              },
            }),
          );
        } else {
          console.error('[vite proxy]', err);
        }
      });
    },
  },
  // Uploaded assets (avatars, product images) are served by the API.
  '/uploads': {
    target: 'http://127.0.0.1:3000',
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    // 127.0.0.1 avoids IPv6 ::1 issues; 5200 avoids Windows reserved/excluded low ports (e.g. 5173)
    host: webHost,
    port: webPort,
    strictPort: false,
    allowedHosts: ['softdigitconsulting.com', 'www.softdigitconsulting.com', '127.0.0.1', 'localhost'],
    proxy: apiProxy,
  },
  preview: {
    host: webHost,
    port: webPort,
    strictPort: false,
    allowedHosts: ['softdigitconsulting.com', 'www.softdigitconsulting.com', '127.0.0.1', 'localhost'],
    // CI runs `vite preview` without the dev server; mirror the /api proxy so auth cookies work.
    proxy: apiProxy,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Stable vendor libs — split so browser can cache them across app deploys
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'vendor-react';
          if (id.includes('node_modules/react-router')) return 'vendor-router';
          if (id.includes('node_modules/@tanstack/react-query')) return 'vendor-query';
          if (id.includes('node_modules/@radix-ui/')) return 'vendor-radix';
          // Heavy optional libs — lazy-loaded pages pull these in on demand
          if (id.includes('node_modules/jspdf')) return 'jspdf';
          if (id.includes('node_modules/xlsx')) return 'xlsx';
          if (id.includes('node_modules/recharts')) return 'recharts';
          if (id.includes('/src/pages/ProductsPage')) return 'page-products';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  },
});
