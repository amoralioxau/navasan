import '@/global.css';

import { Platform } from 'react-native';

/**
 * NAVASAN Design System
 * Version 1.0
 *
 * Brand: Royal Blue
 * Style: Professional Trading / FinTech
 */

export const Colors = {
  light: {
    // Brand
    primary: '#3157E8',
    primaryDark: '#2445C7',
    primaryLight: '#EAF0FF',
    primarySoft: '#F4F7FF',

    // Backgrounds
    background: '#F7F9FC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EEF3FF',

    // Text
    text: '#111827',
    textSecondary: '#667085',
    textTertiary: '#98A2B3',
    textOnPrimary: '#FFFFFF',

    // Borders
    border: '#E4E7EC',
    borderStrong: '#D0D5DD',

    // Trading states
    success: '#12B76A',
    successLight: '#E8F8F1',

    loss: '#F04438',
    lossLight: '#FDECEA',

    warning: '#F79009',
    warningLight: '#FFF4E5',

    info: '#3157E8',
    infoLight: '#EAF0FF',

    // Special
    white: '#FFFFFF',
    black: '#000000',
    overlay: 'rgba(17, 24, 39, 0.08)',
  },

  dark: {
    // Brand
    primary: '#4C6FFF',
    primaryDark: '#3157E8',
    primaryLight: '#172554',
    primarySoft: '#111C3D',

    // Backgrounds
    background: '#0B1020',
    backgroundElement: '#121A2B',
    backgroundSelected: '#182442',

    // Text
    text: '#F8FAFC',
    textSecondary: '#A8B1C2',
    textTertiary: '#6F7B91',
    textOnPrimary: '#FFFFFF',

    // Borders
    border: '#24304A',
    borderStrong: '#34415F',

    // Trading states
    success: '#32D583',
    successLight: '#123B2B',

    loss: '#F97066',
    lossLight: '#421D1B',

    warning: '#FDB022',
    warningLight: '#432F0B',

    info: '#4C6FFF',
    infoLight: '#172554',

    // Special
    white: '#FFFFFF',
    black: '#000000',
    overlay: 'rgba(0, 0, 0, 0.35)',
  },
} as const;

export type ThemeColors = typeof Colors.light;

export type ThemeColor =
  keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Typography
 */
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
});

/**
 * Spacing System
 */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  seven: 32,
  eight: 40,
  nine: 48,
  ten: 64,
} as const;

/**
 * Border Radius
 */
export const Radius = {
  small: 8,
  medium: 12,
  large: 16,
  xLarge: 20,
  xxLarge: 28,
  pill: 999,
} as const;

/**
 * Shadows
 */
export const Shadows = {
  small: {
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  medium: {
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  large: {
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

/**
 * Common UI sizes
 */
export const Sizes = {
  iconSmall: 16,
  iconMedium: 20,
  iconLarge: 24,
  iconXLarge: 32,

  buttonHeight: 48,
  inputHeight: 52,

  avatarSmall: 32,
  avatarMedium: 44,
  avatarLarge: 64,

  bottomTabHeight: 64,
} as const;

/**
 * Layout
 */
export const Layout = {
  screenPadding: 16,
  cardPadding: 16,
  sectionGap: 24,
  itemGap: 12,
} as const;

/**
 * Navigation
 */
export const BottomTabInset =
  Platform.select({
    ios: 50,
    android: 80,
  }) ?? 0;

export const MaxContentWidth = 800;