import { useColorScheme } from 'react-native';

const light = {
  bg: '#FFF8F3',
  card: '#FFFFFF',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#EFE4DA',
  chip: '#F5EDE6',
  accent: '#F97362',
  danger: '#DC2626',
};

const dark: typeof light = {
  bg: '#121016',
  card: '#1D1A22',
  text: '#F3F4F6',
  muted: '#9CA3AF',
  border: '#2E2A35',
  chip: '#2A2631',
  accent: '#FB8A7B',
  danger: '#F87171',
};

export type Palette = typeof light;

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Tint a hex color with alpha, for soft backgrounds. */
export function tint(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}
