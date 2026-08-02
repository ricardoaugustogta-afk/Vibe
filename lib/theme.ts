export const COLORS = {
  primary: {
    50: '#eef9ff',
    100: '#d9f1ff',
    200: '#bbe7ff',
    300: '#8ad8ff',
    400: '#54c1ff',
    500: '#2aa5fb',
    600: '#1585e8',
    700: '#126ac9',
    800: '#1556a2',
    900: '#164b81',
  },
  accent: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
  },
  live: {
    50: '#fff1f2',
    100: '#ffe4e6',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
  },
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    400: '#facc15',
    500: '#eab308',
    600: '#ca8a04',
  },
  neutral: {
    0: '#ffffff',
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADII = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 34,
} as const;

export const FONT_WEIGHTS = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export const CATEGORIES_COLORS: Record<string, string> = {
  Geral: COLORS.primary[600],
  Festa: COLORS.accent[500],
  Musica: '#a855f7',
  Esporte: COLORS.success[600],
  Comida: COLORS.warning[500],
  Cultura: '#0ea5e9',
  Religioso: COLORS.neutral[600],
  Outro: COLORS.neutral[500],
};

export const CATEGORIES_ICONS: Record<string, string> = {
  Geral: 'MapPin',
  Festa: 'PartyPopper',
  Musica: 'Music',
  Esporte: 'Dumbbell',
  Comida: 'UtensilsCrossed',
  Cultura: 'Theater',
  Religioso: 'Church',
  Outro: 'Sparkles',
};
