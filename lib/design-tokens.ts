// ============================================================
// GAEP — Design Tokens (TypeScript)
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
  super_admin: '#7c3aed',
  admin:       '#1a237e',
  supervisor:  '#0369a1',
  operador:    '#16a34a',
  auditor:     '#92400e',
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
    xs:   '0.68rem',
    sm:   '0.75rem',
    base: '0.87rem',
    md:   '0.95rem',
    lg:   '1.1rem',
    xl:   '1.3rem',
    kpi:  '2.2rem',
  },
} as const;

export const layout = {
  maxWidth:      '430px',
  headerHeight:  '54px',
  sidebarWidth:  '270px',
  screenPadding: '20px 16px',
} as const;

export function perfilBadgeClass(p: keyof typeof perfil): string {
  const map: Record<string, string> = {
    super_admin: 'bg-purple-50 text-purple-700 border-purple-200',
    admin:       'bg-blue-50 text-blue-800 border-blue-200',
    supervisor:  'bg-sky-50 text-sky-700 border-sky-200',
    operador:    'bg-green-50 text-green-700 border-green-200',
    auditor:     'bg-amber-50 text-amber-800 border-amber-200',
  };
  return map[p] || 'bg-gray-50 text-gray-600 border-gray-200';
}

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

// Mapeamento label de exibição para o perfil (lowercase → display)
export const perfilLabel: Record<keyof typeof perfil, string> = {
  super_admin: 'Super Admin',
  admin:       'Admin',
  supervisor:  'Supervisor',
  operador:    'Operador',
  auditor:     'Auditor',
};
