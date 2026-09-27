import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';

import { usePalette } from '../lib/theme.ts';
import { formatDate, formatTime } from '../lib/time.ts';

export interface TimeFieldProps {
  value: number;
  onChange: (t: number) => void;
  /** 'date' hides the time part (e.g. birth date). */
  mode?: 'datetime' | 'date';
}

/** Native date+time picker. iOS shows the compact inline picker; Android opens dialogs. */
export function TimeField({ value, onChange, mode = 'datetime' }: TimeFieldProps) {
  const p = usePalette();
  const scheme = useColorScheme();

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.iosRow}>
        <DateTimePicker
          value={new Date(value)}
          mode={mode}
          display="compact"
          accentColor={p.accent}
          themeVariant={scheme === 'dark' ? 'dark' : 'light'}
          onValueChange={(_, d) => onChange(d.getTime())}
        />
      </View>
    );
  }

  const open = (pickerMode: 'date' | 'time') =>
    DateTimePickerAndroid.open({
      value: new Date(value),
      mode: pickerMode,
      is24Hour: true,
      onValueChange: (_, d) => onChange(d.getTime()),
    });

  return (
    <View style={styles.androidRow}>
      <Pressable onPress={() => open('date')} style={[styles.btn, { backgroundColor: p.chip }]}>
        <Text style={[styles.btnText, { color: p.text }]}>{formatDate(value)}</Text>
      </Pressable>
      {mode === 'datetime' ? (
        <Pressable onPress={() => open('time')} style={[styles.btn, { backgroundColor: p.chip }]}>
          <Text style={[styles.btnText, { color: p.text }]}>{formatTime(value)}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  iosRow: { flexDirection: 'row', marginLeft: -8 },
  androidRow: { flexDirection: 'row', gap: 8 },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  btnText: { fontSize: 16, fontWeight: '600' },
});
