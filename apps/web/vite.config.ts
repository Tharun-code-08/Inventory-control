import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    // 127.0.0.1 avoids IPv6 ::1 issues; 5200 avoids Windows reserved/excluded low ports (e.g. 5173)
    host: '127.0.0.1',
    port: 5200,
    strictPort: false,
    allowedHosts: ['softdigitconsulting.com', 'www.softdigitconsulting.com', '127.0.0.1', 'localhost'],
    proxy: {
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
    },
  },
  preview: {
    allowedHosts: ['softdigitconsulting.com', 'www.softdigitconsulting.com', '127.0.0.1', 'localhost'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
