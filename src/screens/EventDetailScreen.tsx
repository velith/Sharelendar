import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { formatEventDate, formatEventTimeRange } from '../utils/format';
import { shareEventAsIcs } from '../utils/share';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetail'>;

export default function EventDetailScreen({ route }: Props) {
  const { event } = route.params;
  const insets = useSafeAreaInsets();
  const [sharing, setSharing] = useState(false);

  const onShare = async () => {
    setSharing(true);
    try {
      await shareEventAsIcs(event);
    } catch (e) {
      Alert.alert('Could not share', e instanceof Error ? e.message : String(e));
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{event.summary ?? '(No title)'}</Text>

        <Field label="Date" value={formatEventDate(event)} />
        <Field label="Time" value={formatEventTimeRange(event)} />
        {event.location ? <Field label="Location" value={event.location} /> : null}
        {event.organizer?.email ? (
          <Field label="Organizer" value={event.organizer.displayName ?? event.organizer.email} />
        ) : null}
        {event.description ? <Field label="Description" value={event.description} /> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Pressable style={styles.button} onPress={onShare} disabled={sharing}>
          {sharing ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Share</Text>}
        </Pressable>
      </View>
    </View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} selectable>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 16, marginTop: 2 },
  footer: { paddingHorizontal: 16, paddingTop: 12 },
  button: { backgroundColor: '#1a73e8', paddingVertical: 14, borderRadius: 24, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

