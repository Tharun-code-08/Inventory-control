/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_GOOGLE_ANALYTICS_ID?: string;
  /** True only when the bundle was built on Vercel (see vite.config.ts). */
  readonly VITE_ON_VERCEL: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
