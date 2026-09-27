import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '../components/Chip';
import { TimeField } from '../components/TimeField';
import { confirm, successFeedback } from '../lib/feedback';
import { useStore } from '../lib/store';
import { usePalette } from '../lib/theme';
import { formatAge } from '../lib/time';

export default function SettingsScreen() {
  const p = usePalette();
  const { profile, setProfile, events, replaceAll } = useStore();
  const [name, setName] = useState(profile.name);
  const [birthDate, setBirthDate] = useState<number | undefined>(profile.birthDate);

  const save = () => {
    setProfile({ name: name.trim(), birthDate });
    successFeedback();
    router.back();
  };

  const exportData = () =>
    Share.share({ title: 'Baby Log export', message: JSON.stringify({ profile, events }, null, 2) }).catch(() => {});

  const inputStyle = [styles.input, { backgroundColor: p.card, borderColor: p.border, color: p.text }];

  return (
    <ScrollView style={{ backgroundColor: p.bg }} contentContainerStyle={styles.content}>
      <Text style={[styles.label, { color: p.muted }]}>BABY'S NAME</Text>
      <TextInput value={name} onChangeText={setName} placeholder="e.g. Noa" placeholderTextColor={p.muted} style={inputStyle} />

      <Text style={[styles.label, { color: p.muted }]}>BIRTH DATE</Text>
      {birthDate !== undefined ? (
        <View style={{ gap: 8 }}>
          <TimeField mode="date" value={birthDate} onChange={setBirthDate} />
          <Text style={{ color: p.muted }}>{formatAge(birthDate)}</Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row' }}>
          <Chip label="Set birth date" onPress={() => setBirthDate(Date.now())} />
        </View>
      )}

      <Pressable onPress={save} style={[styles.saveBtn, { backgroundColor: p.accent }]}>
        <Text style={styles.saveText}>Save</Text>
      </Pressable>

      <Text style={[styles.label, { color: p.muted, marginTop: 36 }]}>DATA</Text>
      <Text style={{ color: p.muted, marginBottom: 10 }}>
        {events.length} events saved on this phone. Export sends a JSON backup via the share sheet (Mail, Notes, WhatsApp…).
      </Text>
      <Pressable onPress={exportData} style={[styles.secondaryBtn, { borderColor: p.border, backgroundColor: p.card }]}>
        <Text style={[styles.secondaryText, { color: p.text }]}>Export backup</Text>
      </Pressable>
      <Pressable
        onPress={() =>
          confirm('Delete all events?', `This removes all ${events.length} events from this phone.`, 'Delete all', () => {
            replaceAll([]);
            router.back();
          })
        }
        style={[styles.secondaryBtn, { borderColor: p.danger, marginTop: 10 }]}
      >
        <Text style={[styles.secondaryText, { color: p.danger }]}>Delete all events</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: 20, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 17 },
  saveBtn: { marginTop: 28, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  secondaryBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  secondaryText: { fontSize: 16, fontWeight: '700' },
});
