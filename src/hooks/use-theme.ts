/**
 * VOLT runs dark-first. We always return the dark palette so every screen is
 * consistent regardless of the OS appearance setting.
 */

import { Colors } from '@/constants/theme';

export function useTheme() {
  return Colors.dark;
}

export type Theme = ReturnType<typeof useTheme>;
