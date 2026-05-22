/** Central product branding */
export const BRAND = {
  companyName: 'Softdigit Consulting',
  productName: 'Retail IMS',
  tagline: 'Retail operations & technology',
  poweredBy: 'Powered by softdigits',
  siteOrigin: import.meta.env.VITE_PUBLIC_URL?.trim() || 'https://softdigitconsulting.com',
  loginTitle: 'Sign in to Retail IMS',
  copyright: (year: number) =>
    `© ${year} Softdigit Consulting. Retail IMS — Powered by softdigits`,
} as const;
