// app/(app)/stock-count/index.tsx
import { FloatingActionButton } from '@/src/components/FloatingActionButton';
import { createSession } from '@/src/api/stockCount';

  const handleNewSession = async () => {
    try {
      const newSession = await createSession();
      router.push({ pathname: `/stock-count/${newSession.id}` });
    } catch (e) {
      console.error('Failed to create session', e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Stock Count</Text>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={sessions}
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { FloatingActionButton } from '@/src/components/FloatingActionButton';
import { createSession, fetchSessions, CountSession } from '@/src/api/stockCount';
import { colors } from '@/theme';

export default function StockCountHome() {
  const router = useRouter();
  const [sessions, setSessions] = useState<CountSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchSessions();
        setSessions(data);
      } catch (e) {
        console.error('Failed to load stock count sessions', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleNewSession = async () => {
    try {
      const newSession = await createSession();
      router.push({ pathname: `/stock-count/${newSession.id}` });
    } catch (e) {
      console.error('Failed to create session', e);
    }
  };

  const renderItem = ({ item }: { item: CountSession }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => router.push({ pathname: `/stock-count/${item.id}` })}
    >
      <Text style={styles.title}>Session {item.id}</Text>
      <Text style={styles.subtitle}>Created: {new Date(item.createdAt).toLocaleString()}</Text>
      <Text style={styles.status}>Status: {item.status}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Stock Count</Text>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No active sessions</Text>}
        />
      )}
      <FloatingActionButton onPress={handleNewSession} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 16,
    fontFamily: 'Inter',
  },
  list: {
    paddingBottom: 32,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    // Glass‑morphism effect
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'Inter',
  },
  subtitle: {
    fontSize: 14,
    color: '#ddd',
    marginTop: 4,
    fontFamily: 'Inter',
  },
  status: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#aaffaa',
    fontFamily: 'Inter',
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: '#aaa',
    fontFamily: 'Inter',
  },
});
