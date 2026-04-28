// ============================================================
// GAEP — Design Tokens (TypeScript)
// Cole em: lib/design-tokens.ts
// ============================================================

export const colors = {
  primary: {
    DEFAULT: '#1a237e',
    dark:    '#121858',
    light:   'rgba(26,35,126,0.08)',
  },
  accent:  '#2563eb',
  orange:  '#f97316',
  green:   '#16a34a',
  danger:  '#ef4444',
  purple:  '#7c3aed',
  bg:      '#f3f4f6',
  surface: '#ffffff',
  border:  '#e2e8f0',
  text:    '#1e293b',
  muted:   '#64748b',
  subtle:  '#94a3b8',
} as const;

export const perfil = {
  SUPER_ADMIN: '#7c3aed',
  ADMIN:       '#1a237e',
  SUPERVISOR:  '#0369a1',
  OPERADOR:    '#16a34a',
  AUDITOR:     '#92400e',
} as const;

export const categoria = {
  OPERAR:  '#1a237e',
  TREINAR: '#f97316',
  INSTRUIR:'#16a34a',
} as const;

export const radius = {
  sm:  '6px',
  md:  '8px',
  lg:  '10px',
  xl:  '12px',
  xxl: '16px',
  full:'9999px',
} as const;

export const shadow = {
  sm:  '0 2px 8px rgba(0,0,0,0.04)',
  md:  '0 4px 12px rgba(0,0,0,0.04)',
  lg:  '0 8px 24px rgba(0,0,0,0.08)',
  primary: '0 4px 14px rgba(26,35,126,0.25)',
  accent:  '0 4px 14px rgba(37,99,235,0.25)',
  green:   '0 4px 14px rgba(22,163,74,0.25)',
} as const;

export const font = {
  family: "'Segoe UI', Roboto, Helvetica, sans-serif",
  mono:   "'Courier New', monospace",
  sizes: {
    xs:   '0.68rem',  // 10.9px — labels uppercase
    sm:   '0.75rem',  // 12px   — botões pequenos
    base: '0.87rem',  // 13.9px — texto geral
    md:   '0.95rem',  // 15.2px — subtítulos
    lg:   '1.1rem',   // 17.6px — títulos de card
    xl:   '1.3rem',   // 20.8px — títulos de tela
    kpi:  '2.2rem',   // 35.2px — valores KPI
  },
} as const;

export const layout = {
  maxWidth:      '430px',    // largura máxima do app mobile
  headerHeight:  '54px',
  sidebarWidth:  '270px',
  screenPadding: '20px 16px',
} as const;

// Utilitário para classes Tailwind de perfil
export function perfilBadgeClass(p: keyof typeof perfil): string {
  const map: Record<string, string> = {
    SUPER_ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
    ADMIN:       'bg-blue-50 text-blue-800 border-blue-200',
    SUPERVISOR:  'bg-sky-50 text-sky-700 border-sky-200',
    OPERADOR:    'bg-green-50 text-green-700 border-green-200',
    AUDITOR:     'bg-amber-50 text-amber-800 border-amber-200',
  };
  return map[p] || 'bg-gray-50 text-gray-600 border-gray-200';
}

// Tailwind config extend (colar em tailwind.config.ts)
export const tailwindExtend = {
  colors: {
    primary: { DEFAULT: '#1a237e', dark: '#121858' },
    accent:  '#2563eb',
    gaep: {
      orange:  '#f97316',
      green:   '#16a34a',
      danger:  '#ef4444',
      purple:  '#7c3aed',
      bg:      '#f3f4f6',
      border:  '#e2e8f0',
      text:    '#1e293b',
      muted:   '#64748b',
    },
  },
};
