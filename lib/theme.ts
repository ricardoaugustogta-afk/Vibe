export const COLORS = {
  primary: {
    50: '#0c1a2a',
    100: '#102539',
    200: '#163249',
    300: '#1d4361',
    400: '#2a5d83',
    500: '#3b82c4',
    600: '#54a8f8',
    700: '#74c0ff',
    800: '#a3d8ff',
    900: '#d0ecff',
  },
  accent: {
    50: '#2a1808',
    100: '#3a200c',
    200: '#4d2c10',
    300: '#693c16',
    400: '#8f5420',
    500: '#f97316',
    600: '#fb923c',
    700: '#fdba74',
  },
  live: {
    50: '#2a0f14',
    100: '#3a151b',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#ff6b85',
  },
  success: {
    50: '#0a2014',
    100: '#0e2c1c',
    400: '#4ade80',
    500: '#22c55e',
    600: '#4ade80',
    700: '#86efac',
  },
  warning: {
    50: '#2a2008',
    100: '#3a2c0c',
    400: '#facc15',
    500: '#eab308',
    600: '#fbbf24',
  },
  neutral: {
    0: '#0a0a0b',
    50: '#131316',
    100: '#1a1a1f',
    200: '#242429',
    300: '#33333a',
    400: '#6b6b76',
    500: '#9a9aa6',
    600: '#b8b8c2',
    700: '#d4d4dc',
    800: '#e8e8ee',
    900: '#f5f5f8',
    950: '#ffffff',
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
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export const CATEGORIES_COLORS: Record<string, string> = {
  Geral: COLORS.primary[600],
  Festa: COLORS.accent[500],
  Musica: '#c084fc',
  Esporte: COLORS.success[500],
  Comida: COLORS.warning[500],
  Cultura: '#38bdf8',
  Religioso: COLORS.neutral[500],
  Outro: COLORS.neutral[400],
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
