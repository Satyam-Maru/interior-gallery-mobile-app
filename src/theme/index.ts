export const theme = {
  colors: {
    primary: '#1A1A1A', // Deep Charcoal
    accent: '#D4AF37',  // Gold/Metallic accent
    background: '#FFFFFF',
    surface: '#F8F9FA',
    text: '#1A1A1A',
    textSecondary: '#6C757D',
    success: '#28A745',
    error: '#DC3545',
    border: '#E9ECEF',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
    full: 9999,
  },
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: '700',
    },
    h2: {
      fontSize: 24,
      fontWeight: '600',
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
    },
    caption: {
      fontSize: 12,
      color: '#6C757D',
    },
  },
} as const;
