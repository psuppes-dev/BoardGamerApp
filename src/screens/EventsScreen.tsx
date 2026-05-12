import React from 'react'
import { View, StyleSheet, FlatList } from 'react-native'
import { Text, Card, FAB, Chip, ActivityIndicator } from 'react-native-paper'
import { useQuery } from '@tanstack/react-query'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useGroupStore } from '../stores/groupStore'
import { fetchAllEvents } from '../services/events'
import { formatDate, formatTime } from '../utils/hostRotation'
import { Event } from '../types'
import { MainStackParamList } from '../navigation/MainStack'

type Nav = NativeStackNavigationProp<MainStackParamList>

function EventCard({ event, onPress }: { event: Event; onPress: () => void }) {
  const isPast = event.status === 'past'
  return (
    <Card style={[styles.card, isPast && styles.pastCard]} elevation={isPast ? 0 : 2} onPress={onPress}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text variant="titleMedium" style={[styles.dateText, isPast && styles.pastText]}>
            {formatDate(event.date)}
          </Text>
          <Chip compact style={isPast ? styles.pastChip : styles.upcomingChip}>
            {isPast ? 'Vergangen' : 'Geplant'}
          </Chip>
        </View>
        <Text variant="bodyMedium" style={[styles.timeText, isPast && styles.pastText]}>
          {formatTime(event.date)} Uhr
        </Text>
        <View style={styles.infoRow}>
          <Text variant="bodySmall" style={styles.infoLabel}>Ort: </Text>
          <Text variant="bodySmall">{event.location}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text variant="bodySmall" style={styles.infoLabel}>Gastgeber:in: </Text>
          <Text variant="bodySmall">{(event as any).host?.name ?? '–'}</Text>
        </View>
      </Card.Content>
    </Card>
  )
}

export default function EventsScreen() {
  const { currentGroup } = useGroupStore()
  const navigation = useNavigation<Nav>()

  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ['events', currentGroup?.id],
    queryFn: () => fetchAllEvents(currentGroup!.id),
    enabled: !!currentGroup,
  })

  const upcoming = events.filter(e => e.status !== 'past')
  const past = events.filter(e => e.status === 'past')

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator /></View>
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={[...upcoming, ...past]}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isLoading}
        ListHeaderComponent={
          <>
            <Text variant="headlineMedium" style={styles.title}>Termine</Text>
            {upcoming.length > 0 && (
              <Text variant="titleSmall" style={styles.section}>Kommende Termine</Text>
            )}
          </>
        }
        renderItem={({ item, index }) => {
          const isFirstPast = item.status === 'past' && (index === 0 || events[index - 1]?.status !== 'past')
          return (
            <>
              {isFirstPast && past.length > 0 && (
                <Text variant="titleSmall" style={styles.section}>Vergangene Termine</Text>
              )}
              <EventCard event={item} onPress={() => navigation.navigate('EventDetail', { eventId: item.id })} />
            </>
          )
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={styles.emptyText}>Noch keine Termine.</Text>
          </View>
        }
      />
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreateEvent')}
        label="Termin"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20, paddingBottom: 100 },
  title: { fontWeight: 'bold', marginBottom: 16 },
  section: { color: '#888', marginBottom: 8, marginTop: 8, textTransform: 'uppercase', letterSpacing: 1 },
  card: { borderRadius: 12, marginBottom: 12 },
  pastCard: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dateText: { fontWeight: 'bold', flex: 1 },
  pastText: { color: '#aaa' },
  timeText: { color: '#4A90D9', marginBottom: 8, fontWeight: '600' },
  infoRow: { flexDirection: 'row', marginBottom: 2 },
  infoLabel: { color: '#888' },
  upcomingChip: { backgroundColor: '#e8f4fd' },
  pastChip: { backgroundColor: '#f0f0f0' },
  empty: { alignItems: 'center', marginTop: 48 },
  emptyText: { color: '#aaa' },
  fab: { position: 'absolute', right: 20, bottom: 20 },
})
