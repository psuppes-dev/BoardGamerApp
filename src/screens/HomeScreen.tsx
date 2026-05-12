import React from 'react'
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { Text, Card, Button, ActivityIndicator, Chip } from 'react-native-paper'
import { useQuery } from '@tanstack/react-query'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useGroupStore } from '../stores/groupStore'
import { useAuthStore } from '../stores/authStore'
import { fetchNextEvent } from '../services/events'
import { formatDate, formatTime, getDaysUntil } from '../utils/hostRotation'
import { MainStackParamList } from '../navigation/MainStack'

type Nav = NativeStackNavigationProp<MainStackParamList>

export default function HomeScreen() {
  const { currentGroup } = useGroupStore()
  const { profile } = useAuthStore()
  const navigation = useNavigation<Nav>()

  const { data: nextEvent, isLoading, refetch } = useQuery({
    queryKey: ['nextEvent', currentGroup?.id],
    queryFn: () => fetchNextEvent(currentGroup!.id),
    enabled: !!currentGroup,
  })

  const daysUntil = nextEvent ? getDaysUntil(nextEvent.date) : null

  if (!currentGroup) {
    return (
      <View style={styles.noGroupContainer}>
        <Text variant="headlineMedium" style={styles.greeting}>Willkommen!</Text>
        <Text variant="bodyLarge" style={styles.noGroupText}>
          Tritt einer Gruppe bei oder erstelle eine, um loszulegen.
        </Text>
        <Button mode="contained" icon="account-group" onPress={() => navigation.navigate('CreateGroup')} style={styles.noGroupBtn}>
          Gruppe erstellen
        </Button>
        <Button mode="outlined" icon="login" onPress={() => navigation.navigate('JoinGroup')} style={styles.noGroupBtn}>
          Gruppe beitreten
        </Button>
      </View>
    )
  }

  const countdownLabel = () => {
    if (daysUntil === null) return ''
    if (daysUntil === 0) return 'Heute!'
    if (daysUntil === 1) return 'Morgen!'
    return `in ${daysUntil} Tagen`
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    >
      <Text variant="headlineMedium" style={styles.greeting}>
        Hallo{profile?.name ? `, ${profile.name}` : ''}!
      </Text>
      <Text variant="bodyMedium" style={styles.groupName}>{currentGroup?.name}</Text>

      <Text variant="titleMedium" style={styles.sectionTitle}>Nächster Spieltermin</Text>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} />
      ) : nextEvent ? (
        <Card style={styles.eventCard} elevation={2}>
          <Card.Content>
            <View style={styles.countdownRow}>
              <Chip
                icon="clock-fast"
                style={[
                  styles.countdownChip,
                  daysUntil === 0 && styles.chipToday,
                  daysUntil === 1 && styles.chipSoon,
                ]}
              >
                {countdownLabel()}
              </Chip>
            </View>

            <Text variant="titleLarge" style={styles.dateText}>
              {formatDate(nextEvent.date)}
            </Text>
            <Text variant="bodyLarge" style={styles.timeText}>
              {formatTime(nextEvent.date)} Uhr
            </Text>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text variant="labelMedium" style={styles.infoLabel}>Ort</Text>
              <Text variant="bodyMedium">{nextEvent.location}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant="labelMedium" style={styles.infoLabel}>Gastgeber:in</Text>
              <Text variant="bodyMedium">{(nextEvent as any).host?.name ?? '–'}</Text>
            </View>
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              Noch kein Termin geplant.
            </Text>
            <Button
              mode="contained"
              icon="plus"
              onPress={() => navigation.navigate('CreateEvent')}
              style={styles.createBtn}
            >
              Termin erstellen
            </Button>
          </Card.Content>
        </Card>
      )}

      {nextEvent && (
        <Button
          mode="outlined"
          icon="plus"
          onPress={() => navigation.navigate('CreateEvent')}
          style={styles.addBtn}
        >
          Weiteren Termin planen
        </Button>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 20 },
  greeting: { fontWeight: 'bold', marginBottom: 4 },
  groupName: { color: '#4A90D9', marginBottom: 28, fontWeight: '600' },
  sectionTitle: { marginBottom: 12, fontWeight: '600' },
  loader: { marginTop: 32 },
  eventCard: { borderRadius: 16, marginBottom: 16 },
  countdownRow: { marginBottom: 12 },
  countdownChip: { alignSelf: 'flex-start' },
  chipToday: { backgroundColor: '#ff6b6b22' },
  chipSoon: { backgroundColor: '#ffa94d22' },
  dateText: { fontWeight: 'bold', marginBottom: 4 },
  timeText: { color: '#4A90D9', fontWeight: '600', marginBottom: 12 },
  divider: { height: 1, backgroundColor: '#eee', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  infoLabel: { color: '#888' },
  emptyCard: { borderRadius: 16 },
  emptyContent: { alignItems: 'center', padding: 16 },
  emptyText: { color: '#888', marginBottom: 16 },
  createBtn: { marginTop: 8 },
  addBtn: { marginTop: 8 },
  noGroupContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#f8f9fa' },
  noGroupText: { color: '#888', textAlign: 'center', marginVertical: 20 },
  noGroupBtn: { width: '100%', marginBottom: 12 },
})
