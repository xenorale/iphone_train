/**
 * VOLT design tokens.
 * Dark-first, electric-yellow accent. The app forces dark mode (see use-theme.ts),
 * but light keys are kept in sync so `ThemeColor` typing stays valid.
 */

import '@/global.css';

import { Platform } from 'react-native';

const dark = {
  // text
  text: '#F5F5F7',
  textSecondary: '#9A9AA2',
  textTertiary: '#65656D',
  // surfaces
  background: '#0A0A0B',
  backgroundElement: '#161619',
  backgroundElevated: '#1F1F24',
  backgroundSelected: '#2A2A31',
  border: '#26262C',
  // accent (electric yellow)
  accent: '#FFE000',
  accentSoft: '#FFEA4D',
  accentOn: '#0A0A0B',
  accentMuted: 'rgba(255, 224, 0, 0.14)',
  // semantic
  success: '#36D399',
  successMuted: 'rgba(54, 211, 153, 0.14)',
  warning: '#FBBD23',
  danger: '#FF5A5F',
  dangerMuted: 'rgba(255, 90, 95, 0.14)',
  info: '#5AC8FA',
} as const;

// Light kept structurally identical (app runs dark, but keeps the type sound).
const light = {
  text: '#0A0A0B',
  textSecondary: '#60646C',
  textTertiary: '#8A8F98',
  background: '#FFFFFF',
  backgroundElement: '#F4F4F6',
  backgroundElevated: '#FFFFFF',
  backgroundSelected: '#E6E7EB',
  border: '#E2E2E6',
  accent: '#FFC400',
  accentSoft: '#FFD84D',
  accentOn: '#0A0A0B',
  accentMuted: 'rgba(255, 196, 0, 0.16)',
  success: '#1FAE73',
  successMuted: 'rgba(31, 174, 115, 0.14)',
  warning: '#C77700',
  danger: '#E5484D',
  dangerMuted: 'rgba(229, 72, 77, 0.12)',
  info: '#0091FF',
} as const;

export const Colors = { light, dark } as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
})!;

/** 4pt spacing scale. */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  eight: 32,
  ten: 40,
  twelve: 48,
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 92, android: 84 }) ?? 84;
export const MaxContentWidth = 800;
