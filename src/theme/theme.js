import { MD3LightTheme, configureFonts } from 'react-native-paper';
import { Platform } from 'react-native';

const fontConfig = {
  displaySmall: {
    fontFamily: 'System',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headlineMedium: {
    fontFamily: 'System',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 36,
  },
  titleLarge: {
    fontFamily: 'System',
    fontSize: 22,
    fontWeight: '700',
  },
  titleMedium: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
};

export const theme = {
  ...MD3LightTheme,
  dark: false,
  fonts: configureFonts({ config: fontConfig }),
  roundness: 16,
  colors: {
    ...MD3LightTheme.colors,
    // NEW PALETTE
    primary: '#0F172A', // Deep Navy
    onPrimary: '#FFFFFF',
    primaryContainer: '#1E293B',
    onPrimaryContainer: '#FFFFFF',

    secondary: '#334155', // Slate Blue
    onSecondary: '#FFFFFF',
    secondaryContainer: '#475569',

    tertiary: '#06B6D4', // Cyan (Accent)
    tertiaryContainer: '#0891B2',

    background: '#F8FAFC', // Light Gray
    surface: '#FFFFFF', // Card Background
    surfaceVariant: '#F1F5F9',
    onSurface: '#111827', // Text Primary
    onSurfaceVariant: '#6B7280', // Text Secondary

    error: '#EF4444', // Danger

    outline: '#E2E8F0',

    // Custom Tokens
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    accent: '#06B6D4',

    headerBackground: '#0F172A',
    headerGradient: ['#0F172A', '#1E293B', '#334155'],

    statusSuccess: '#22C55E',
    statusError: '#EF4444',
    statusWarning: '#F59E0B',
    statusInfo: '#06B6D4',
  },
  customShadows: {
    soft: {
      elevation: 4,
      ...(Platform.OS === 'web'
        ? { boxShadow: '0 4px 10px rgba(15,23,42,0.08)' }
        : { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 })
    },
    primary: {
      elevation: 10,
      ...(Platform.OS === 'web'
        ? { boxShadow: '0 10px 20px rgba(15,23,42,0.12)' }
        : { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20 })
    }
  }
};
