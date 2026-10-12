import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../auth/AuthContext';
import { listEvents, type CalendarEvent } from '../api/googleCalendar';
import { formatEventDate, formatEventTimeRange } from '../utils/format';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EventList'>;

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function EventListScreen({ navigation }: Props) {
  const { getAccessToken, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={signOut} hitSlop={8}>
          <Text style={styles.headerLink}>Sign out</Text>
        </Pressable>
      ),
    });
  }, [navigation, signOut]);

  const fetchEvents = useCallback(async () => listEvents(await getAccessToken()), [getAccessToken]);

  // Initial load. State is only set in async callbacks, and ignored after unmount.
  useEffect(() => {
    let cancelled = false;
    fetchEvents()
      .then((items) => {
        if (cancelled) return;
        setEvents(items);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchEvents]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      setEvents(await fetchEvents());
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={events}
      keyExtractor={(e) => e.id}
      contentContainerStyle={{ paddingBottom: insets.bottom }}
      refreshControl={<RefreshControl testID="event-list-refresh" refreshing={refreshing} onRefresh={onRefresh} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.muted}>{error ?? 'No events found.'}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={() => navigation.navigate('EventDetail', { event: item })}
        >
          <Text style={styles.title} numberOfLines={1}>
            {item.summary ?? '(No title)'}
          </Text>
          <Text style={styles.muted}>
            {formatEventDate(item)} · {formatEventTimeRange(item)}
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  row: { paddingHorizontal: 16, paddingVertical: 12 },
  rowPressed: { backgroundColor: '#0000000d' },
  title: { fontSize: 16, fontWeight: '600' },
  muted: { fontSize: 14, color: '#666', marginTop: 2 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#ccc', marginLeft: 16 },
  headerLink: { color: '#1a73e8', fontSize: 16 },
});

