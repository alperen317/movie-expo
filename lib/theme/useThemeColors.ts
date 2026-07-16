import { useColorScheme } from 'nativewind';

// Theme-aware values for the handful of colors that are passed as inline props
// (icon `color`, ActivityIndicator, etc.) rather than Tailwind classNames.
// className colors theme automatically via the CSS variables in global.css;
// this hook covers everything that can't go through a className.
export interface ThemeColors {
  textPrimary: string;
  textSecondary: string;
  // Alias of textSecondary; reads better at icon call sites.
  icon: string;
  gold: string;
  onGold: string;
  error: string;
}

const dark: ThemeColors = {
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  icon: '#A1A1AA',
  gold: '#f5c451',
  onGold: '#3f2e00',
  error: '#ffb4ab',
};

const light: ThemeColors = {
  textPrimary: '#1a1a1a',
  textSecondary: '#6b6b70',
  icon: '#6b6b70',
  gold: '#8a6400',
  onGold: '#3d2d00',
  error: '#ba1a1a',
};

export function useThemeColors(): ThemeColors {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'light' ? light : dark;
}
