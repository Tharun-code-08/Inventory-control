/** Central product branding */
export const BRAND = {
  companyName: 'Softdigit Consulting',
  productName: 'SoftdigitIMS',
  tagline: 'Retail operations & technology',
  poweredBy: 'Powered by softdigits',
  siteOrigin: import.meta.env.VITE_PUBLIC_URL?.trim() || 'https://softdigitconsulting.com',
  loginTitle: 'Sign in to SoftdigitIMS',
  copyright: (year: number) =>
    `© ${year} Softdigit Consulting. SoftdigitIMS — Powered by softdigits`,
} as const;
