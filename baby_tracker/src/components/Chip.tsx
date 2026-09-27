import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { tapFeedback } from '../lib/feedback.ts';
import { tint, usePalette } from '../lib/theme.ts';

interface Props {
  label: string;
  selected?: boolean;
  color?: string;
  onPress: () => void;
  big?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Chip({ label, selected, color, onPress, big, style }: Props) {
  const p = usePalette();
  const c = color ?? p.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        big && styles.big,
        { backgroundColor: selected ? tint(c, 0.18) : p.chip, borderColor: selected ? c : 'transparent' },
        pressed && { opacity: 0.7 },
        style,
      ]}
    >
      <Text style={[styles.label, big && styles.bigLabel, { color: p.text }, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  big: { paddingVertical: 16, borderRadius: 16, flexGrow: 1, flexBasis: 0 },
  label: { fontSize: 15, fontWeight: '600' },
  bigLabel: { fontSize: 17 },
  selectedLabel: { fontWeight: '800' },
});
