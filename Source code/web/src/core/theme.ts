// Modern Minimalist Theme for AgriTrace Web

export const colors = {
  // Primary - Green palette
  primary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#166534',
    800: '#14532d',
    900: '#052e16',
  },
  // Neutral - Gray palette
  neutral: {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  // Semantic colors
  success: '#16a34a',
  warning: '#f59e0b',
  error: '#dc2626',
  info: '#2563eb',
  // Background
  background: '#fafafa',
  surface: '#ffffff',
  // Text
  textPrimary: '#171717',
  textSecondary: '#525252',
  textMuted: '#a3a3a3',
};

export const spacing = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
};

export const borderRadius = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  full: '9999px',
};

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.03)',
};

export const typography = {
  fontFamily: '"Be Vietnam Pro", "Segoe UI", Arial, sans-serif',
  fontFamilyMono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
  sizes: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
  },
  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Component styles
export const components = {
  card: {
    background: colors.surface,
    borderRadius: borderRadius.xl,
    boxShadow: shadows.md,
    border: `1px solid ${colors.neutral[200]}`,
    padding: spacing[6],
  },
  button: {
    primary: {
      background: colors.primary[700],
      color: colors.neutral[0],
      borderRadius: borderRadius.lg,
      padding: `${spacing[3]} ${spacing[5]}`,
      fontWeight: typography.weights.semibold,
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    secondary: {
      background: colors.neutral[0],
      color: colors.textPrimary,
      borderRadius: borderRadius.lg,
      padding: `${spacing[3]} ${spacing[5]}`,
      fontWeight: typography.weights.semibold,
      border: `1px solid ${colors.neutral[300]}`,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    ghost: {
      background: 'transparent',
      color: colors.textSecondary,
      borderRadius: borderRadius.lg,
      padding: `${spacing[2]} ${spacing[3]}`,
      fontWeight: typography.weights.medium,
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
  },
  input: {
    background: colors.neutral[0],
    border: `1px solid ${colors.neutral[300]}`,
    borderRadius: borderRadius.lg,
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.sizes.base,
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  },
  badge: {
    success: {
      background: colors.primary[100],
      color: colors.primary[700],
      padding: `${spacing[1]} ${spacing[3]}`,
      borderRadius: borderRadius.full,
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.medium,
    },
    warning: {
      background: '#fef3c7',
      color: '#92400e',
      padding: `${spacing[1]} ${spacing[3]}`,
      borderRadius: borderRadius.full,
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.medium,
    },
    error: {
      background: '#fef2f2',
      color: colors.error,
      padding: `${spacing[1]} ${spacing[3]}`,
      borderRadius: borderRadius.full,
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.medium,
    },
  },
};

// Layout constants
export const layout = {
  maxWidth: '1200px',
  sidebarWidth: '280px',
  headerHeight: '72px',
  containerPadding: spacing[6],
};

export default {
  colors,
  spacing,
  borderRadius,
  shadows,
  typography,
  components,
  layout,
};
