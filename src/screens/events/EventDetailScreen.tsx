import React, { useEffect, useState } from 'react'
import {
  View, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import {
  Text, Card, Button, TextInput, Divider,
  Chip, ActivityIndicator, IconButton,
} from 'react-native-paper'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { MainStackParamList } from '../../navigation/MainStack'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../services/supabase'
import {
  fetchSuggestions, addSuggestion,
  castVote, removeVote, closeVoting,
} from '../../services/suggestions'
import { fetchRatings, submitRating, computeAverages } from '../../services/ratings'
import {
  fetchFoodOrders, setFoodPreference, submitOrder,
  getMajorityPref, FOOD_PREF_LABELS, MOCK_MENUS, FoodPref,
} from '../../services/foodOrders'
import { fetchGroupMembers } from '../../services/groups'
import { sendPush } from '../../services/notifications'
import { GameSuggestion, Event, Rating, FoodOrder } from '../../types'
import { formatDate, formatTime } from '../../utils/hostRotation'

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'EventDetail'>
  route: RouteProp<MainStackParamList, 'EventDetail'>
}

// ── Star Rating ──────────────────────────────────────────────
function StarRow({
  label, value, onChange, readonly,
}: {
  label: string
  value: number
  onChange?: (v: number) => void
  readonly?: boolean
}) {
  return (
    <View style={starStyles.row}>
      <Text variant="bodyMedium" style={starStyles.label}>{label}</Text>
      <View style={starStyles.stars}>
        {[1, 2, 3, 4, 5].map(i => (
          <IconButton
            key={i}
            icon={i <= value ? 'star' : 'star-outline'}
            size={24}
            iconColor={i <= value ? '#F5A623' : '#ccc'}
            onPress={readonly ? undefined : () => onChange?.(i)}
            style={starStyles.starBtn}
          />
        ))}
      </View>
    </View>
  )
}

const starStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  label: { width: 110, color: '#555' },
  stars: { flexDirection: 'row', marginLeft: -4 },
  starBtn: { margin: 0, padding: 0 },
})

// ── Main Screen ───────────────────────────────────────────────
export default function EventDetailScreen({ route }: Props) {
  const { eventId } = route.params
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // Suggestion state
  const [gameName, setGameName] = useState('')
  const [description, setDescription] = useState('')
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [voting, setVoting] = useState<string | null>(null)

  // Food state
  const [selectedPref, setSelectedPref] = useState<FoodPref | null>(null)
  const [selectedDish, setSelectedDish] = useState<string | null>(null)
  const [submittingFood, setSubmittingFood] = useState(false)

  // Rating state
  const [hostRating, setHostRating] = useState(0)
  const [foodRating, setFoodRating] = useState(0)
  const [eveningRating, setEveningRating] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)

  // ── Queries ──────────────────────────────────────────────────
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, host:profiles(*)')
        .eq('id', eventId)
        .single()
      if (error || !data) throw new Error(error?.message ?? 'Nicht gefunden')
      return data as unknown as Event
    },
  })

  const { data: suggestions = [], isLoading: suggestionsLoading } = useQuery({
    queryKey: ['suggestions', eventId],
    queryFn: () => fetchSuggestions(eventId, user!.id),
    enabled: !!user,
  })

  const { data: ratings = [] } = useQuery({
    queryKey: ['ratings', eventId],
    queryFn: () => fetchRatings(eventId),
    enabled: event?.status === 'past',
  })

  const { data: foodOrders = [] } = useQuery<FoodOrder[]>({
    queryKey: ['foodOrders', eventId],
    queryFn: () => fetchFoodOrders(eventId),
    enabled: event?.status !== 'past',
  })

  // Init selectedPref/dish from own existing order
  useEffect(() => {
    const mine = foodOrders.find(o => o.user_id === user?.id)
    if (mine?.food_pref) setSelectedPref(mine.food_pref as FoodPref)
    if (mine?.order_text) setSelectedDish(mine.order_text)
  }, [foodOrders])

  // ── Realtime ─────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`event-detail-${eventId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'game_suggestions',
        filter: `event_id=eq.${eventId}`,
      }, () => queryClient.invalidateQueries({ queryKey: ['suggestions', eventId] }))
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'votes',
        filter: `event_id=eq.${eventId}`,
      }, () => queryClient.invalidateQueries({ queryKey: ['suggestions', eventId] }))
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'food_orders',
        filter: `event_id=eq.${eventId}`,
      }, () => queryClient.invalidateQueries({ queryKey: ['foodOrders', eventId] }))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [eventId])

  // ── Handlers ─────────────────────────────────────────────────
  const handleAddSuggestion = async () => {
    if (!gameName.trim() || !user) return
    setAdding(true)
    try {
      await addSuggestion(eventId, user.id, gameName.trim(), description.trim() || undefined)
      setGameName('')
      setDescription('')
      setShowForm(false)
      queryClient.invalidateQueries({ queryKey: ['suggestions', eventId] })
    } catch (e: any) {
      Alert.alert('Fehler', e.message)
    } finally {
      setAdding(false)
    }
  }

  const handleVote = async (suggestion: GameSuggestion) => {
    if (!user) return
    setVoting(suggestion.id)
    try {
      if (suggestion.user_voted) {
        await removeVote(eventId, user.id)
      } else {
        await castVote(eventId, suggestion.id, user.id)
      }
      queryClient.invalidateQueries({ queryKey: ['suggestions', eventId] })
    } catch (e: any) {
      Alert.alert('Fehler', e.message)
    } finally {
      setVoting(null)
    }
  }

  const handleCloseVoting = () => {
    Alert.alert(
      'Abstimmung schließen',
      'Möchtest du die Abstimmung wirklich schließen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Schließen', style: 'destructive', onPress: async () => {
            try {
              await closeVoting(eventId)
              queryClient.invalidateQueries({ queryKey: ['event', eventId] })
              queryClient.invalidateQueries({ queryKey: ['events', event?.group_id] })
              queryClient.invalidateQueries({ queryKey: ['nextEvent', event?.group_id] })
            } catch (e: any) {
              Alert.alert('Fehler', e.message)
            }
          },
        },
      ]
    )
  }

  const handleSubmitRating = async () => {
    if (!user || hostRating === 0 || foodRating === 0 || eveningRating === 0) return
    setSubmittingRating(true)
    try {
      await submitRating(
        eventId, user.id,
        hostRating, foodRating, eveningRating,
        ratingComment.trim() || undefined
      )
      queryClient.invalidateQueries({ queryKey: ['ratings', eventId] })
    } catch (e: any) {
      Alert.alert('Fehler', e.message)
    } finally {
      setSubmittingRating(false)
    }
  }

  // US-07/08: Set food preference + notify host if majority emerges
  const handleSetFoodPref = async (pref: FoodPref) => {
    if (!user || !event) return
    setSelectedPref(pref)
    setSubmittingFood(true)
    try {
      await setFoodPreference(eventId, user.id, pref)
      queryClient.invalidateQueries({ queryKey: ['foodOrders', eventId] })

      // US-08: push to host when majority has ≥ 2 votes
      const updated = [
        ...foodOrders.filter(o => o.user_id !== user.id),
        { user_id: user.id, food_pref: pref } as FoodOrder,
      ]
      const majority = getMajorityPref(updated)
      if (majority && majority.count >= 2 && event.host_id !== user.id) {
        const allMembers = await fetchGroupMembers(event.group_id)
        const hostToken = allMembers.find(m => m.user_id === event.host_id)?.profile?.expo_token
        sendPush(
          [hostToken],
          '🍕 Essensrichtung Update',
          `Mehrheit möchte ${FOOD_PREF_LABELS[majority.pref]} (${majority.count} Stimmen)`
        )
      }
    } catch (e: any) {
      Alert.alert('Fehler', e.message)
    } finally {
      setSubmittingFood(false)
    }
  }

  // US-09: Submit dish order
  const handleSubmitOrder = async (dish: string) => {
    if (!user || !selectedPref) return
    setSelectedDish(dish)
    try {
      await submitOrder(eventId, user.id, selectedPref, dish)
      queryClient.invalidateQueries({ queryKey: ['foodOrders', eventId] })
    } catch (e: any) {
      Alert.alert('Fehler', e.message)
      setSelectedDish(null)
    }
  }

  // ── Render ───────────────────────────────────────────────────
  if (eventLoading) {
    return <View style={styles.center}><ActivityIndicator /></View>
  }

  if (!event) {
    return <View style={styles.center}><Text>Termin nicht gefunden.</Text></View>
  }

  const isHost = event.host_id === user?.id
  const isPast = event.status === 'past'
  const maxVotes = suggestions.length > 0 ? Math.max(...suggestions.map(s => s.vote_count ?? 0)) : 0
  const winner = !event.voting_open && maxVotes > 0
    ? suggestions.find(s => s.vote_count === maxVotes)
    : null
  const myRating = ratings.find((r: Rating) => r.user_id === user?.id)
  const averages = computeAverages(ratings)

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* ── Event Info ── */}
        <Card style={styles.eventCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.eventTitle}>{formatDate(event.date)}</Text>
            <Text variant="titleMedium" style={styles.eventTime}>{formatTime(event.date)} Uhr</Text>
            <Divider style={styles.divider} />
            <View style={styles.infoRow}>
              <Text variant="bodySmall" style={styles.label}>Ort</Text>
              <Text variant="bodyMedium">{event.location}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant="bodySmall" style={styles.label}>Gastgeber:in</Text>
              <Text variant="bodyMedium">{(event as any).host?.name ?? '–'}</Text>
            </View>
            <View style={styles.statusRow}>
              {isPast ? (
                <Chip compact style={styles.pastChip}>Vergangen</Chip>
              ) : (
                <>
                  <Chip compact style={event.voting_open ? styles.votingChip : styles.closedChip}>
                    {event.voting_open ? 'Abstimmung offen' : 'Abstimmung geschlossen'}
                  </Chip>
                  {isHost && event.voting_open && (
                    <Button compact mode="outlined" textColor="#e53935" onPress={handleCloseVoting}>
                      Schließen
                    </Button>
                  )}
                </>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* ── Winner Banner ── */}
        {winner && (
          <Card style={styles.winnerCard}>
            <Card.Content style={styles.winnerContent}>
              <Text variant="labelMedium" style={styles.winnerLabel}>Gewinner</Text>
              <Text variant="titleLarge" style={styles.winnerName}>{winner.game_name}</Text>
              <Text variant="bodySmall" style={styles.winnerVotes}>
                {winner.vote_count} Stimme{winner.vote_count !== 1 ? 'n' : ''}
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* ── Suggestions ── */}
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Spielvorschläge</Text>
          {!isPast && event.voting_open && (
            <IconButton
              icon={showForm ? 'close' : 'plus'}
              size={20}
              onPress={() => setShowForm(v => !v)}
            />
          )}
        </View>

        {showForm && event.voting_open && (
          <Card style={styles.formCard}>
            <Card.Content>
              <TextInput
                label="Spielname *"
                value={gameName}
                onChangeText={setGameName}
                mode="outlined"
                dense
                style={styles.input}
              />
              <TextInput
                label="Beschreibung (optional)"
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                dense
                multiline
                style={styles.input}
              />
              <View style={styles.formActions}>
                <Button mode="text" onPress={() => setShowForm(false)}>Abbrechen</Button>
                <Button
                  mode="contained"
                  onPress={handleAddSuggestion}
                  loading={adding}
                  disabled={adding || !gameName.trim()}
                >
                  Vorschlagen
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        {suggestionsLoading ? (
          <ActivityIndicator style={styles.loader} />
        ) : suggestions.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Text variant="bodyMedium" style={styles.emptyText}>
                {event.voting_open
                  ? 'Noch keine Vorschläge. Tippe auf + um ein Spiel vorzuschlagen!'
                  : 'Keine Vorschläge vorhanden.'}
              </Text>
            </Card.Content>
          </Card>
        ) : (
          [...suggestions]
            .sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0))
            .map(s => {
              const isWinner = winner?.id === s.id
              return (
                <Card
                  key={s.id}
                  style={[styles.suggestionCard, isWinner && styles.winnerHighlight]}
                  elevation={isWinner ? 3 : 1}
                >
                  <Card.Content>
                    <View style={styles.suggestionRow}>
                      <View style={styles.suggestionInfo}>
                        <Text variant="titleMedium" style={styles.suggestionName}>{s.game_name}</Text>
                        <Text variant="bodySmall" style={styles.suggesterName}>
                          von {(s as any).profile?.name ?? '–'}
                        </Text>
                        {s.description ? (
                          <Text variant="bodySmall" style={styles.suggestionDesc}>{s.description}</Text>
                        ) : null}
                      </View>
                      <View style={styles.voteArea}>
                        <Text variant="titleLarge" style={styles.voteCount}>{s.vote_count ?? 0}</Text>
                        {event.voting_open && (
                          <IconButton
                            icon={s.user_voted ? 'thumb-up' : 'thumb-up-outline'}
                            size={22}
                            iconColor={s.user_voted ? '#4A90D9' : '#aaa'}
                            onPress={() => handleVote(s)}
                            disabled={voting !== null}
                          />
                        )}
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              )
            })
        )}

        {/* ── Food (only for upcoming events) ── */}
        {!isPast && (() => {
          const majority = getMajorityPref(foodOrders)
          const menu = majority ? MOCK_MENUS[majority.pref] : null
          return (
            <>
              <Divider style={styles.sectionDivider} />
              <Text variant="titleMedium" style={[styles.sectionTitle, { marginBottom: 12 }]}>
                Essensbestellung
              </Text>

              {/* US-07: Preference picker */}
              <Card style={styles.formCard}>
                <Card.Content>
                  <Text variant="labelMedium" style={styles.avgLabel}>Deine Essensrichtung wählen</Text>
                  <View style={styles.prefRow}>
                    {(Object.keys(FOOD_PREF_LABELS) as FoodPref[]).map(pref => (
                      <Chip
                        key={pref}
                        selected={selectedPref === pref}
                        onPress={() => handleSetFoodPref(pref)}
                        disabled={submittingFood}
                        style={styles.prefChip}
                        compact
                      >
                        {FOOD_PREF_LABELS[pref]}
                      </Chip>
                    ))}
                  </View>
                </Card.Content>
              </Card>

              {/* US-08: Majority display */}
              {majority && (
                <Card style={styles.majorityCard}>
                  <Card.Content style={styles.majorityContent}>
                    <Text variant="labelMedium" style={styles.majorityLabel}>
                      Mehrheit der Gruppe
                    </Text>
                    <Text variant="titleMedium" style={styles.majorityText}>
                      {FOOD_PREF_LABELS[majority.pref]}
                    </Text>
                    <Text variant="bodySmall" style={styles.majorityCount}>
                      {majority.count} von {foodOrders.length} Stimme{foodOrders.length !== 1 ? 'n' : ''}
                    </Text>
                  </Card.Content>
                </Card>
              )}

              {/* US-09: Mock menu + order */}
              {menu && selectedPref && (
                <Card style={styles.formCard}>
                  <Card.Content>
                    <Text variant="labelMedium" style={styles.avgLabel}>
                      Menü – {FOOD_PREF_LABELS[majority!.pref]}
                    </Text>
                    {menu.map(dish => (
                      <View key={dish} style={styles.dishRow}>
                        <Text variant="bodyMedium" style={styles.dishName}>{dish}</Text>
                        <Chip
                          compact
                          selected={selectedDish === dish}
                          onPress={() => handleSubmitOrder(dish)}
                          style={selectedDish === dish ? styles.dishChipSelected : styles.dishChip}
                        >
                          {selectedDish === dish ? 'Gewählt ✓' : 'Wählen'}
                        </Chip>
                      </View>
                    ))}
                  </Card.Content>
                </Card>
              )}

              {/* Host: order summary */}
              {isHost && foodOrders.length > 0 && (
                <Card style={styles.ordersCard}>
                  <Card.Content>
                    <Text variant="labelMedium" style={styles.avgLabel}>
                      Bestellübersicht ({foodOrders.filter(o => o.order_text).length}/{foodOrders.length})
                    </Text>
                    {foodOrders.map(o => (
                      <View key={o.id} style={styles.orderRow}>
                        <Text variant="bodySmall" style={styles.orderName}>
                          {(o as any).profile?.name ?? '–'}
                        </Text>
                        <Text variant="bodySmall" style={styles.orderDish}>
                          {o.order_text ?? `${FOOD_PREF_LABELS[o.food_pref as FoodPref] ?? '?'} (kein Gericht)`}
                        </Text>
                      </View>
                    ))}
                  </Card.Content>
                </Card>
              )}
            </>
          )
        })()}

        {/* ── Ratings (only for past events) ── */}
        {isPast && (
          <>
            <Divider style={styles.sectionDivider} />
            <Text variant="titleMedium" style={[styles.sectionTitle, { marginBottom: 12 }]}>
              Bewertungen {averages ? `(${averages.count})` : ''}
            </Text>

            {/* Averages */}
            {averages && (
              <Card style={styles.averagesCard}>
                <Card.Content>
                  <Text variant="labelMedium" style={styles.avgLabel}>Durchschnitt</Text>
                  <StarRow label="Gastgeber:in" value={Math.round(averages.host)} readonly />
                  <StarRow label="Essen" value={Math.round(averages.food)} readonly />
                  <StarRow label="Abend" value={Math.round(averages.evening)} readonly />
                </Card.Content>
              </Card>
            )}

            {/* Own Rating or Form */}
            {myRating ? (
              <Card style={styles.myRatingCard}>
                <Card.Content>
                  <Text variant="labelMedium" style={styles.avgLabel}>Deine Bewertung</Text>
                  <StarRow label="Gastgeber:in" value={myRating.host_rating} readonly />
                  <StarRow label="Essen" value={myRating.food_rating} readonly />
                  <StarRow label="Abend" value={myRating.evening_rating} readonly />
                  {myRating.comment ? (
                    <Text variant="bodySmall" style={styles.ratingComment}>"{myRating.comment}"</Text>
                  ) : null}
                </Card.Content>
              </Card>
            ) : (
              <Card style={styles.formCard}>
                <Card.Content>
                  <Text variant="labelMedium" style={styles.avgLabel}>Jetzt bewerten</Text>
                  <StarRow label="Gastgeber:in" value={hostRating} onChange={setHostRating} />
                  <StarRow label="Essen" value={foodRating} onChange={setFoodRating} />
                  <StarRow label="Abend" value={eveningRating} onChange={setEveningRating} />
                  <TextInput
                    label="Kommentar (optional)"
                    value={ratingComment}
                    onChangeText={setRatingComment}
                    mode="outlined"
                    dense
                    multiline
                    style={[styles.input, { marginTop: 8 }]}
                  />
                  <Button
                    mode="contained"
                    onPress={handleSubmitRating}
                    loading={submittingRating}
                    disabled={submittingRating || hostRating === 0 || foodRating === 0 || eveningRating === 0}
                    style={{ marginTop: 8 }}
                  >
                    Bewertung abschicken
                  </Button>
                </Card.Content>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  eventCard: { borderRadius: 12, marginBottom: 16, backgroundColor: '#fff' },
  eventTitle: { fontWeight: 'bold' },
  eventTime: { color: '#4A90D9', marginTop: 2 },
  divider: { marginVertical: 12 },
  sectionDivider: { marginVertical: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 },
  label: { color: '#888', width: 110 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  votingChip: { backgroundColor: '#e8f4fd' },
  closedChip: { backgroundColor: '#f0f0f0' },
  pastChip: { backgroundColor: '#f0f0f0' },
  winnerCard: { borderRadius: 12, marginBottom: 16, backgroundColor: '#fff8e1', borderWidth: 2, borderColor: '#F5A623' },
  winnerContent: { alignItems: 'center', padding: 8 },
  winnerLabel: { color: '#F5A623', marginBottom: 4 },
  winnerName: { fontWeight: 'bold', textAlign: 'center' },
  winnerVotes: { color: '#888', marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontWeight: '600' },
  formCard: { borderRadius: 12, marginBottom: 12, backgroundColor: '#fff' },
  input: { marginBottom: 8 },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  emptyCard: { borderRadius: 12 },
  emptyContent: { alignItems: 'center', padding: 16 },
  emptyText: { color: '#888', textAlign: 'center' },
  loader: { marginTop: 24 },
  suggestionCard: { borderRadius: 12, marginBottom: 10, backgroundColor: '#fff' },
  winnerHighlight: { borderWidth: 2, borderColor: '#F5A623', backgroundColor: '#fff8e1' },
  suggestionRow: { flexDirection: 'row', alignItems: 'center' },
  suggestionInfo: { flex: 1 },
  suggestionName: { fontWeight: 'bold' },
  suggesterName: { color: '#888', marginTop: 2 },
  suggestionDesc: { color: '#666', marginTop: 4 },
  voteArea: { flexDirection: 'row', alignItems: 'center' },
  voteCount: { fontWeight: 'bold', color: '#4A90D9', minWidth: 24, textAlign: 'center' },
  averagesCard: { borderRadius: 12, marginBottom: 12, backgroundColor: '#fff' },
  myRatingCard: { borderRadius: 12, marginBottom: 12, backgroundColor: '#f0f8ff' },
  avgLabel: { color: '#888', marginBottom: 8 },
  ratingComment: { color: '#666', fontStyle: 'italic', marginTop: 8 },
  prefRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  prefChip: { marginBottom: 4 },
  majorityCard: { borderRadius: 12, marginBottom: 12, backgroundColor: '#f0fff4', borderWidth: 1.5, borderColor: '#4CAF50' },
  majorityContent: { alignItems: 'center', padding: 8 },
  majorityLabel: { color: '#4CAF50', marginBottom: 4 },
  majorityText: { fontWeight: 'bold' },
  majorityCount: { color: '#888', marginTop: 4 },
  dishRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  dishName: { flex: 1, color: '#333' },
  dishChip: { backgroundColor: '#f0f0f0' },
  dishChipSelected: { backgroundColor: '#e8f4fd' },
  ordersCard: { borderRadius: 12, marginBottom: 12, backgroundColor: '#fff3e0' },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  orderName: { fontWeight: '600', color: '#555' },
  orderDish: { color: '#888', flex: 1, textAlign: 'right' },
})
