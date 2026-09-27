import { StyleSheet, View } from 'react-native';

import { MINUTE } from '../lib/time.ts';
import { Chip } from './Chip';

const OFFSETS = [0, 5, 15, 30, 60];

/** "עכשיו / לפני 5 ד׳ …" shortcuts so most entries never need the picker. */
export function QuickTimes({ onPick }: { onPick: (t: number) => void }) {
  return (
    <View style={styles.row}>
      {OFFSETS.map((m) => (
        <Chip key={m} label={m === 0 ? 'עכשיו' : m < 60 ? `לפני ${m} ד׳` : `לפני ${m / 60} ש׳`} onPress={() => onPick(Date.now() - m * MINUTE)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
});
