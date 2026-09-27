import { useColorScheme } from 'react-native';

import type { EventType } from './types.ts';

// Event-type colors are a categorical palette checked with the dataviz
// validator (lightness band, CVD separation, normal-vision floor) against each
// mode's card surface. Dark mode uses its own deeper steps, not a flip.
const lightTypes: Record<EventType, string> = {
  feed: '#F59E0B',
  diaper: '#10B981',
  sleep: '#6366F1',
  bath: '#0EA5E9',
  medicine: '#EF4444',
  note: '#8B5CF6',
  growth: '#EC4899',
};

const darkTypes: Record<EventType, string> = {
  feed: '#D97706',
  diaper: '#059669',
  sleep: '#6366F1',
  bath: '#0891B2',
  medicine: '#EF4444',
  note: '#8B5CF6',
  growth: '#EC4899',
};

const light = {
  bg: '#FFF8F3',
  card: '#FFFFFF',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#EFE4DA',
  grid: '#F1ECE7',
  chip: '#F5EDE6',
  accent: '#F97362',
  danger: '#DC2626',
  types: lightTypes,
};

const dark: typeof light = {
  bg: '#121016',
  card: '#1D1A22',
  text: '#F3F4F6',
  muted: '#9CA3AF',
  border: '#2E2A35',
  grid: '#2A2631',
  chip: '#2A2631',
  accent: '#FB8A7B',
  danger: '#F87171',
  types: darkTypes,
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
