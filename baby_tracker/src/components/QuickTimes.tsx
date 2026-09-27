import { StyleSheet, View } from 'react-native';

import { MINUTE } from '../lib/time.ts';
import { Chip } from './Chip';

const OFFSETS = [0, 5, 15, 30, 60];

/** "Now / 5m ago / 15m ago …" shortcuts so most entries never need the picker. */
export function QuickTimes({ onPick }: { onPick: (t: number) => void }) {
  return (
    <View style={styles.row}>
      {OFFSETS.map((m) => (
        <Chip key={m} label={m === 0 ? 'Now' : m < 60 ? `-${m}m` : `-${m / 60}h`} onPress={() => onPick(Date.now() - m * MINUTE)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
});
