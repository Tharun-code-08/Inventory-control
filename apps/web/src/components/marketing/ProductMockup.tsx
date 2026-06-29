import { cn } from '@/lib/cn';

/**
 * Self-contained, brand-styled product "screenshots" rendered as crisp inline
 * SVG — no external image assets or placeholders. Scenes mirror the real
 * SoftdigitIMS app surfaces (dashboard, registers, GST invoice, mobile) using
 * the marketing palette so every section ships a real-looking visual.
 */
export type MockupVariant = 'dashboard' | 'table' | 'invoice' | 'mobile';

type ProductMockupProps = {
  variant: MockupVariant;
  title?: string;
  className?: string;
};

const PALETTE = {
  sidebar: '#0f172a',
  sidebarLine: '#1e293b',
  ink: '#0f172a',
  sub: '#64748b',
  faint: '#94a3b8',
  line: '#e2e8f0',
  surface: '#ffffff',
  canvas: '#f8fafc',
  indigo: '#6366f1',
  indigoDeep: '#4f46e5',
  sky: '#38bdf8',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
};

function WindowChrome({ label }: { label: string }) {
  return (
    <g>
      <rect x="0" y="0" width="1200" height="48" fill="#ffffff" />
      <line x1="0" y1="48" x2="1200" y2="48" stroke={PALETTE.line} strokeWidth="2" />
      <circle cx="28" cy="24" r="6" fill="#f43f5e" opacity="0.85" />
      <circle cx="50" cy="24" r="6" fill="#f59e0b" opacity="0.85" />
      <circle cx="72" cy="24" r="6" fill="#10b981" opacity="0.85" />
      <rect x="430" y="13" width="340" height="22" rx="11" fill={PALETTE.canvas} stroke={PALETTE.line} strokeWidth="1.5" />
      <text x="600" y="29" textAnchor="middle" fontFamily="ui-sans-serif, system-ui" fontSize="12" fill={PALETTE.faint}>
        {label}
      </text>
    </g>
  );
}

function Sidebar({ active = 0 }: { active?: number }) {
  const items = [0, 1, 2, 3, 4, 5];
  return (
    <g>
      <rect x="0" y="48" width="210" height="702" fill={PALETTE.sidebar} />
      {/* brand */}
      <rect x="24" y="76" width="30" height="30" rx="8" fill="url(#mkBrand)" />
      <rect x="64" y="84" width="96" height="12" rx="6" fill="#e2e8f0" opacity="0.9" />
      {items.map((i) => {
        const y = 150 + i * 52;
        const isActive = i === active;
        return (
          <g key={i}>
            {isActive ? <rect x="16" y={y - 16} width="178" height="40" rx="10" fill="#1e293b" /> : null}
            <rect x="32" y={y - 6} width="20" height="20" rx="6" fill={isActive ? PALETTE.indigo : '#334155'} />
            <rect x="64" y={y - 4} width={isActive ? 104 : 88} height="12" rx="6" fill={isActive ? '#e2e8f0' : '#475569'} />
          </g>
        );
      })}
      <rect x="16" y="690" width="178" height="44" rx="12" fill="#1e293b" />
      <circle cx="44" cy="712" r="13" fill="url(#mkBrand)" />
      <rect x="68" y="706" width="90" height="11" rx="5" fill="#475569" />
    </g>
  );
}

function TopBar({ title }: { title: string }) {
  return (
    <g>
      <rect x="210" y="48" width="990" height="64" fill="#ffffff" />
      <line x1="210" y1="112" x2="1200" y2="112" stroke={PALETTE.line} strokeWidth="2" />
      <text x="240" y="88" fontFamily="ui-sans-serif, system-ui" fontSize="20" fontWeight="700" fill={PALETTE.ink}>
        {title}
      </text>
      <rect x="930" y="64" width="150" height="32" rx="16" fill={PALETTE.canvas} stroke={PALETTE.line} strokeWidth="1.5" />
      <circle cx="952" cy="80" r="6" fill={PALETTE.faint} />
      <rect x="968" y="74" width="92" height="11" rx="5" fill="#cbd5e1" />
      <rect x="1096" y="64" width="74" height="32" rx="16" fill="url(#mkCta)" />
      <rect x="1110" y="74" width="46" height="11" rx="5" fill="#ffffff" opacity="0.95" />
    </g>
  );
}

function Defs() {
  return (
    <defs>
      <linearGradient id="mkBrand" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={PALETTE.sky} />
        <stop offset="1" stopColor={PALETTE.indigoDeep} />
      </linearGradient>
      <linearGradient id="mkCta" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={PALETTE.indigo} />
        <stop offset="1" stopColor={PALETTE.indigoDeep} />
      </linearGradient>
      <linearGradient id="mkBar" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor={PALETTE.indigoDeep} />
        <stop offset="1" stopColor={PALETTE.sky} />
      </linearGradient>
      <linearGradient id="mkArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={PALETTE.indigo} stopOpacity="0.35" />
        <stop offset="1" stopColor={PALETTE.indigo} stopOpacity="0" />
      </linearGradient>
    </defs>
  );
}

function Kpi({ x, y, label, value, accent, trend }: { x: number; y: number; label: string; value: string; accent: string; trend: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="0" width="222" height="118" rx="16" fill="#ffffff" stroke={PALETTE.line} strokeWidth="1.5" />
      <rect x="18" y="18" width="34" height="34" rx="10" fill={accent} opacity="0.14" />
      <rect x="27" y="27" width="16" height="16" rx="5" fill={accent} />
      <text x="18" y="78" fontFamily="ui-sans-serif, system-ui" fontSize="26" fontWeight="700" fill={PALETTE.ink}>
        {value}
      </text>
      <text x="18" y="100" fontFamily="ui-sans-serif, system-ui" fontSize="12.5" fill={PALETTE.sub}>
        {label}
      </text>
      <rect x="150" y="22" width="54" height="22" rx="11" fill={PALETTE.emerald} opacity="0.12" />
      <text x="177" y="37" textAnchor="middle" fontFamily="ui-sans-serif, system-ui" fontSize="11" fontWeight="700" fill="#059669">
        {trend}
      </text>
    </g>
  );
}

function DashboardScene({ title }: { title: string }) {
  const bars = [52, 78, 64, 96, 72, 110, 88, 124];
  return (
    <g>
      <rect x="210" y="112" width="990" height="638" fill={PALETTE.canvas} />
      <Kpi x={240} y={140} label="Stock value" value="₹48.2L" accent={PALETTE.indigo} trend="+12%" />
      <Kpi x={486} y={140} label="Open POs" value="36" accent={PALETTE.sky} trend="+8%" />
      <Kpi x={732} y={140} label="Invoices" value="₹12.6L" accent={PALETTE.emerald} trend="+24%" />
      <Kpi x={978} y={140} label="Low stock" value="14" accent={PALETTE.amber} trend="-5%" />

      {/* Bar chart card */}
      <g transform="translate(240 290)">
        <rect x="0" y="0" width="588" height="436" rx="18" fill="#ffffff" stroke={PALETTE.line} strokeWidth="1.5" />
        <text x="28" y="44" fontFamily="ui-sans-serif, system-ui" fontSize="16" fontWeight="700" fill={PALETTE.ink}>
          Procurement to payment
        </text>
        <rect x="28" y="58" width="180" height="10" rx="5" fill={PALETTE.line} />
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1="28" y1={120 + i * 70} x2="560" y2={120 + i * 70} stroke={PALETTE.line} strokeWidth="1.5" />
        ))}
        {bars.map((h, i) => {
          const x = 56 + i * 64;
          return <rect key={i} x={x} y={400 - h * 2} width="34" height={h * 2} rx="8" fill="url(#mkBar)" />;
        })}
      </g>

      {/* Donut + legend card */}
      <g transform="translate(852 290)">
        <rect x="0" y="0" width="324" height="436" rx="18" fill="#ffffff" stroke={PALETTE.line} strokeWidth="1.5" />
        <text x="28" y="44" fontFamily="ui-sans-serif, system-ui" fontSize="16" fontWeight="700" fill={PALETTE.ink}>
          Stock by category
        </text>
        <g transform="translate(162 196)">
          <circle r="92" fill="none" stroke={PALETTE.line} strokeWidth="34" />
          <circle r="92" fill="none" stroke={PALETTE.indigoDeep} strokeWidth="34" strokeDasharray="246 578" strokeLinecap="round" transform="rotate(-90)" />
          <circle r="92" fill="none" stroke={PALETTE.sky} strokeWidth="34" strokeDasharray="150 578" strokeLinecap="round" transform="rotate(60)" />
          <circle r="92" fill="none" stroke={PALETTE.emerald} strokeWidth="34" strokeDasharray="96 578" strokeLinecap="round" transform="rotate(155)" />
          <text y="-2" textAnchor="middle" fontFamily="ui-sans-serif, system-ui" fontSize="28" fontWeight="700" fill={PALETTE.ink}>
            8.4k
          </text>
          <text y="22" textAnchor="middle" fontFamily="ui-sans-serif, system-ui" fontSize="12" fill={PALETTE.sub}>
            SKUs
          </text>
        </g>
        {[
          { c: PALETTE.indigoDeep, t: 'Retail' },
          { c: PALETTE.sky, t: 'Wholesale' },
          { c: PALETTE.emerald, t: 'Spares' },
        ].map((l, i) => (
          <g key={i} transform={`translate(40 ${340 + i * 30})`}>
            <rect width="14" height="14" rx="4" fill={l.c} />
            <rect x="24" y="2" width="120" height="10" rx="5" fill={PALETTE.line} />
            <text x="200" y="12" textAnchor="end" fontFamily="ui-sans-serif, system-ui" fontSize="12" fontWeight="600" fill={PALETTE.sub}>
              {i === 0 ? '42%' : i === 1 ? '33%' : '25%'}
            </text>
          </g>
        ))}
      </g>
      {/* hidden title used for a11y context */}
      <text x="0" y="0" opacity="0">{title}</text>
    </g>
  );
}

function TableScene({ title }: { title: string }) {
  const rows = [0, 1, 2, 3, 4, 5, 6];
  const statuses = [
    { t: 'Approved', c: PALETTE.emerald },
    { t: 'Pending', c: PALETTE.amber },
    { t: 'Posted', c: PALETTE.indigo },
    { t: 'Approved', c: PALETTE.emerald },
    { t: 'Draft', c: PALETTE.faint },
    { t: 'Posted', c: PALETTE.indigo },
    { t: 'Approved', c: PALETTE.emerald },
  ];
  return (
    <g>
      <rect x="210" y="112" width="990" height="638" fill={PALETTE.canvas} />
      {/* toolbar */}
      <rect x="240" y="140" width="300" height="34" rx="10" fill="#ffffff" stroke={PALETTE.line} strokeWidth="1.5" />
      <circle cx="262" cy="157" r="6" fill={PALETTE.faint} />
      <rect x="278" y="151" width="180" height="11" rx="5" fill="#cbd5e1" />
      <rect x="1020" y="140" width="150" height="34" rx="10" fill="url(#mkCta)" />
      <rect x="1044" y="151" width="102" height="12" rx="6" fill="#ffffff" opacity="0.95" />

      {/* table */}
      <rect x="240" y="196" width="930" height="520" rx="16" fill="#ffffff" stroke={PALETTE.line} strokeWidth="1.5" />
      <rect x="240" y="196" width="930" height="52" rx="16" fill={PALETTE.canvas} />
      <rect x="240" y="232" width="930" height="16" fill={PALETTE.canvas} />
      {['Document', 'Party', 'Date', 'Amount', 'Status'].map((h, i) => (
        <text
          key={h}
          x={272 + i * 190}
          y="228"
          fontFamily="ui-sans-serif, system-ui"
          fontSize="12.5"
          fontWeight="700"
          fill={PALETTE.sub}
        >
          {h}
        </text>
      ))}
      {rows.map((r) => {
        const y = 248 + r * 66;
        const s = statuses[r];
        return (
          <g key={r}>
            {r > 0 ? <line x1="240" y1={y} x2="1170" y2={y} stroke={PALETTE.line} strokeWidth="1.5" /> : null}
            <rect x="272" y={y + 22} width="26" height="26" rx="8" fill={PALETTE.indigo} opacity="0.12" />
            <rect x="308" y={y + 26} width="96" height="11" rx="5" fill="#334155" />
            <rect x="462" y={y + 26} width="120" height="11" rx="5" fill="#cbd5e1" />
            <rect x="652" y={y + 26} width="80" height="11" rx="5" fill="#cbd5e1" />
            <rect x="842" y={y + 26} width="86" height="11" rx="5" fill="#334155" />
            <rect x="1032" y={y + 18} width="104" height="26" rx="13" fill={s.c} opacity="0.14" />
            <circle cx="1050" cy={y + 31} r="4" fill={s.c} />
            <text x="1064" y={y + 35} fontFamily="ui-sans-serif, system-ui" fontSize="11.5" fontWeight="700" fill={s.c}>
              {s.t}
            </text>
          </g>
        );
      })}
      <text x="0" y="0" opacity="0">{title}</text>
    </g>
  );
}

function InvoiceScene({ title }: { title: string }) {
  const lines = [0, 1, 2, 3, 4];
  return (
    <g>
      <rect x="210" y="112" width="990" height="638" fill={PALETTE.canvas} />
      {/* paper */}
      <rect x="320" y="150" width="770" height="560" rx="16" fill="#ffffff" stroke={PALETTE.line} strokeWidth="1.5" />
      {/* header band */}
      <path d="M320 166 q0 -16 16 -16 h738 q16 0 16 16 v66 h-770 z" fill="url(#mkCta)" />
      <rect x="352" y="176" width="34" height="34" rx="9" fill="#ffffff" opacity="0.25" />
      <rect x="398" y="182" width="150" height="13" rx="6" fill="#ffffff" opacity="0.95" />
      <rect x="398" y="204" width="96" height="9" rx="4" fill="#ffffff" opacity="0.6" />
      <text x="1058" y="190" textAnchor="end" fontFamily="ui-sans-serif, system-ui" fontSize="18" fontWeight="700" fill="#ffffff">
        TAX INVOICE
      </text>
      <rect x="978" y="202" width="80" height="20" rx="10" fill="#ffffff" opacity="0.22" />
      <text x="1018" y="216" textAnchor="middle" fontFamily="ui-sans-serif, system-ui" fontSize="10.5" fontWeight="700" fill="#ffffff">
        GST READY
      </text>

      {/* bill to + meta */}
      <rect x="352" y="262" width="70" height="10" rx="5" fill="#cbd5e1" />
      <rect x="352" y="282" width="180" height="11" rx="5" fill="#334155" />
      <rect x="352" y="302" width="150" height="9" rx="4" fill="#cbd5e1" />
      <rect x="352" y="318" width="120" height="9" rx="4" fill="#cbd5e1" />
      <rect x="858" y="262" width="200" height="9" rx="4" fill="#cbd5e1" />
      <rect x="918" y="282" width="140" height="9" rx="4" fill="#cbd5e1" />

      {/* line items header */}
      <rect x="352" y="356" width="706" height="34" rx="9" fill={PALETTE.canvas} />
      {['Item', 'HSN', 'Qty', 'Rate', 'GST', 'Amount'].map((h, i) => (
        <text
          key={h}
          x={[372, 590, 690, 770, 860, 1040][i]}
          y="378"
          textAnchor={i >= 2 ? 'end' : 'start'}
          fontFamily="ui-sans-serif, system-ui"
          fontSize="11.5"
          fontWeight="700"
          fill={PALETTE.sub}
        >
          {h}
        </text>
      ))}
      {lines.map((r) => {
        const y = 406 + r * 42;
        return (
          <g key={r}>
            <rect x="372" y={y} width={150 - r * 10} height="10" rx="5" fill="#334155" />
            <rect x="560" y={y} width="46" height="10" rx="5" fill="#cbd5e1" />
            <rect x="660" y={y} width="30" height="10" rx="5" fill="#cbd5e1" />
            <rect x="730" y={y} width="40" height="10" rx="5" fill="#cbd5e1" />
            <rect x="820" y={y} width="40" height="10" rx="5" fill="#cbd5e1" />
            <rect x="990" y={y} width="68" height="10" rx="5" fill="#334155" />
            <line x1="352" y1={y + 26} x2="1058" y2={y + 26} stroke={PALETTE.line} strokeWidth="1.2" />
          </g>
        );
      })}

      {/* totals */}
      <rect x="788" y="628" width="270" height="54" rx="12" fill={PALETTE.indigo} opacity="0.1" />
      <text x="812" y="652" fontFamily="ui-sans-serif, system-ui" fontSize="12.5" fontWeight="600" fill={PALETTE.sub}>
        Grand total (incl. GST)
      </text>
      <text x="1036" y="666" textAnchor="end" fontFamily="ui-sans-serif, system-ui" fontSize="22" fontWeight="700" fill={PALETTE.indigoDeep}>
        ₹1,84,260
      </text>
      <text x="0" y="0" opacity="0">{title}</text>
    </g>
  );
}

function MobileScene({ title }: { title: string }) {
  return (
    <g>
      {/* phone body */}
      <rect x="356" y="40" width="488" height="940" rx="64" fill="#0f172a" />
      <rect x="372" y="56" width="456" height="908" rx="52" fill={PALETTE.canvas} />
      {/* notch */}
      <rect x="520" y="74" width="160" height="26" rx="13" fill="#0f172a" />
      {/* app header */}
      <rect x="372" y="100" width="456" height="118" fill="url(#mkCta)" />
      <rect x="404" y="138" width="34" height="34" rx="10" fill="#ffffff" opacity="0.25" />
      <rect x="450" y="146" width="150" height="14" rx="7" fill="#ffffff" opacity="0.95" />
      <rect x="450" y="168" width="96" height="9" rx="4" fill="#ffffff" opacity="0.6" />
      <circle cx="792" cy="156" r="20" fill="#ffffff" opacity="0.22" />

      {/* KPI cards */}
      {[
        { t: 'Stock value', v: '₹48.2L', c: PALETTE.indigo },
        { t: 'Open POs', v: '36', c: PALETTE.sky },
      ].map((k, i) => (
        <g key={k.t} transform={`translate(${404 + i * 210} 250)`}>
          <rect width="190" height="118" rx="18" fill="#ffffff" stroke={PALETTE.line} strokeWidth="1.5" />
          <rect x="18" y="18" width="32" height="32" rx="9" fill={k.c} opacity="0.16" />
          <rect x="26" y="26" width="16" height="16" rx="5" fill={k.c} />
          <text x="18" y="84" fontFamily="ui-sans-serif, system-ui" fontSize="24" fontWeight="700" fill={PALETTE.ink}>
            {k.v}
          </text>
          <text x="18" y="104" fontFamily="ui-sans-serif, system-ui" fontSize="11.5" fill={PALETTE.sub}>
            {k.t}
          </text>
        </g>
      ))}

      {/* trend card with area line */}
      <g transform="translate(404 392)">
        <rect width="400" height="220" rx="18" fill="#ffffff" stroke={PALETTE.line} strokeWidth="1.5" />
        <rect x="22" y="24" width="150" height="12" rx="6" fill="#334155" />
        <rect x="22" y="44" width="96" height="9" rx="4" fill={PALETTE.line} />
        <path
          d="M22 168 L82 138 L142 150 L202 104 L262 120 L322 78 L378 92 L378 196 L22 196 Z"
          fill="url(#mkArea)"
        />
        <path
          d="M22 168 L82 138 L142 150 L202 104 L262 120 L322 78 L378 92"
          fill="none"
          stroke={PALETTE.indigoDeep}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="322" cy="78" r="6" fill="#ffffff" stroke={PALETTE.indigoDeep} strokeWidth="4" />
      </g>

      {/* list rows */}
      {[0, 1, 2].map((r) => (
        <g key={r} transform={`translate(404 ${636 + r * 64})`}>
          <rect width="400" height="52" rx="14" fill="#ffffff" stroke={PALETTE.line} strokeWidth="1.5" />
          <rect x="16" y="16" width="20" height="20" rx="6" fill={PALETTE.indigo} opacity="0.16" />
          <rect x="48" y="16" width="150" height="10" rx="5" fill="#334155" />
          <rect x="48" y="32" width="96" height="8" rx="4" fill={PALETTE.line} />
          <rect x="300" y="18" width="84" height="18" rx="9" fill={PALETTE.emerald} opacity="0.14" />
        </g>
      ))}

      {/* bottom nav */}
      <rect x="372" y="876" width="456" height="88" fill="#ffffff" />
      <line x1="372" y1="876" x2="828" y2="876" stroke={PALETTE.line} strokeWidth="2" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(${430 + i * 116} 912)`}>
          <rect x="-14" y="-12" width="28" height="28" rx="9" fill={i === 0 ? PALETTE.indigo : '#cbd5e1'} opacity={i === 0 ? 1 : 0.7} />
        </g>
      ))}
      <text x="0" y="0" opacity="0">{title}</text>
    </g>
  );
}

export function ProductMockup({ variant, title = 'SoftdigitIMS', className }: ProductMockupProps) {
  if (variant === 'mobile') {
    return (
      <svg
        viewBox="0 0 1200 1020"
        className={cn('h-full w-full', className)}
        role="img"
        aria-label={`${title} — mobile preview`}
        preserveAspectRatio="xMidYMid meet"
      >
        <Defs />
        <MobileScene title={title} />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 1200 750"
      className={cn('h-full w-full', className)}
      role="img"
      aria-label={`${title} — SoftdigitIMS preview`}
      preserveAspectRatio="xMidYMid slice"
    >
      <Defs />
      <rect x="0" y="0" width="1200" height="750" fill={PALETTE.canvas} />
      <WindowChrome label="app.softdigitconsulting.com" />
      {variant !== 'invoice' ? <Sidebar active={variant === 'table' ? 2 : 0} /> : <Sidebar active={5} />}
      <TopBar title={title} />
      {variant === 'dashboard' ? <DashboardScene title={title} /> : null}
      {variant === 'table' ? <TableScene title={title} /> : null}
      {variant === 'invoice' ? <InvoiceScene title={title} /> : null}
    </svg>
  );
}
