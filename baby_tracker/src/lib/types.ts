export type EventType = 'feed' | 'diaper' | 'sleep' | 'bath' | 'medicine' | 'note' | 'growth';

export type FeedMethod = 'bottle' | 'breast' | 'solids';
export type MilkType = 'formula' | 'breastmilk';
export type BreastSide = 'left' | 'right' | 'both';
export type Side = 'left' | 'right';

/** Live breastfeeding stopwatch. Present only while the session is in progress. */
export interface BreastTimer {
  leftMs: number;
  rightMs: number;
  /** Side currently ticking, if not paused. */
  running?: Side;
  /** When `running` started (epoch ms). */
  since?: number;
}
export type DiaperKind = 'wet' | 'dirty' | 'mixed' | 'dry';
export type StoolColor = 'yellow' | 'green' | 'brown' | 'black' | 'red' | 'white';

/**
 * A single logged event. Times are epoch milliseconds.
 * Only the fields relevant to `type` are set.
 */
export interface BabyEvent {
  id: string;
  type: EventType;
  start: number;
  /** Sleep only: when the baby woke up. Missing = still sleeping. */
  end?: number;

  // feed
  method?: FeedMethod;
  milk?: MilkType;
  amountMl?: number;
  side?: BreastSide;
  durationMin?: number;
  leftMin?: number;
  rightMin?: number;
  breastTimer?: BreastTimer;
  food?: string;

  // diaper
  diaper?: DiaperKind;
  color?: StoolColor;

  // medicine
  medName?: string;
  dose?: string;

  // growth
  weightKg?: number;
  heightCm?: number;
  headCm?: number;

  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BabyProfile {
  name: string;
  /** Epoch ms of birth date, if set. */
  birthDate?: number;
}

export const EVENT_TYPES: EventType[] = ['feed', 'diaper', 'sleep', 'bath', 'medicine', 'note', 'growth'];

/** Colors live in the theme (`usePalette().types`) so dark mode gets its own validated steps. */
export const TYPE_META: Record<EventType, { label: string; emoji: string }> = {
  feed: { label: 'Feed', emoji: '🍼' },
  diaper: { label: 'Diaper', emoji: '🧷' },
  sleep: { label: 'Sleep', emoji: '😴' },
  bath: { label: 'Bath', emoji: '🛁' },
  medicine: { label: 'Medicine', emoji: '💊' },
  note: { label: 'Note', emoji: '📝' },
  growth: { label: 'Growth', emoji: '📏' },
};

export const DIAPER_META: Record<DiaperKind, { label: string; emoji: string }> = {
  wet: { label: 'Wet', emoji: '💧' },
  dirty: { label: 'Dirty', emoji: '💩' },
  mixed: { label: 'Both', emoji: '💧💩' },
  dry: { label: 'Dry', emoji: '✨' },
};

export const STOOL_COLORS: Record<StoolColor, { label: string; swatch: string }> = {
  yellow: { label: 'Yellow', swatch: '#EAB308' },
  green: { label: 'Green', swatch: '#65A30D' },
  brown: { label: 'Brown', swatch: '#92400E' },
  black: { label: 'Black', swatch: '#1F2937' },
  red: { label: 'Red', swatch: '#DC2626' },
  white: { label: 'Pale', swatch: '#E5E7EB' },
};
