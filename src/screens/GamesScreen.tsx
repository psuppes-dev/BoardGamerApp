import React, { useEffect, useState } from 'react'
import {
  View, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native'
import {
  Text, Card, Button, TextInput, Chip,
  ActivityIndicator, IconButton,
} from 'react-native-paper'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useGroupStore } from '../stores/groupStore'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../services/supabase'
import { fetchNextEvent } from '../services/events'
import { fetchSuggestions, addSuggestion, castVote, removeVote } from '../services/suggestions'
import { GameSuggestion } from '../types'
import { formatDate, formatTime } from '../utils/hostRotation'

export default function GamesScreen() {
  const { currentGroup } = useGroupStore()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [gameName, setGameName] = useState('')
  const [description, setDescription] = useState('')
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [voting, setVoting] = useState<string | null>(null)

  const { data: nextEvent, isLoading: eventLoading } = useQuery({
    queryKey: ['nextEvent', currentGroup?.id],
    queryFn: () => fetchNextEvent(currentGroup!.id),
    enabled: !!currentGroup,
  })

  const { data: suggestions = [], isLoading: suggestionsLoading, refetch } = useQuery({
    queryKey: ['suggestions', nextEvent?.id],
    queryFn: () => fetchSuggestions(nextEvent!.id, user!.id),
    enabled: !!nextEvent && !!user,
  })

  useEffect(() => {
    if (!nextEvent) return
    const channel = supabase
      .channel(`games-screen-${nextEvent.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'game_suggestions',
        filter: `event_id=eq.${nextEvent.id}`,
      }, () => queryClient.invalidateQueries({ queryKey: ['suggestions', nextEvent.id] }))
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'votes',
        filter: `event_id=eq.${nextEvent.id}`,
      }, () => queryClient.invalidateQueries({ queryKey: ['suggestions', nextEvent.id] }))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [nextEvent?.id])

  const handleAddSuggestion = async () => {
    if (!gameName.trim() || !user || !nextEvent) return
    setAdding(true)
    try {
      await addSuggestion(nextEvent.id, user.id, gameName.trim(), description.trim() || undefined)
      setGameName('')
      setDescription('')
      setShowForm(false)
      queryClient.invalidateQueries({ queryKey: ['suggestions', nextEvent.id] })
    } catch (e: any) {
      Alert.alert('Fehler', e.message)
    } finally {
      setAdding(false)
    }
  }

  const handleVote = async (suggestion: GameSuggestion) => {
    if (!user || !nextEvent) return
    setVoting(suggestion.id)
    try {
      if (suggestion.user_voted) {
        await removeVote(nextEvent.id, user.id)
      } else {
        await castVote(nextEvent.id, suggestion.id, user.id)
      }
      queryClient.invalidateQueries({ queryKey: ['suggestions', nextEvent.id] })
    } catch (e: any) {
      Alert.alert('Fehler', e.message)
    } finally {
      setVoting(null)
    }
  }

  if (!currentGroup) {
    return (
      <View style={styles.center}>
        <Text variant="bodyLarge" style={styles.emptyText}>
          Keine aktive Gruppe.
        </Text>
        <Text variant="bodySmall" style={styles.subText}>
          Erstelle oder trete einer Gruppe bei (Profil-Tab).
        </Text>
      </View>
    )
  }

  if (eventLoading) {
    return <View style={styles.center}><ActivityIndicator /></View>
  }

  if (!nextEvent) {
    return (
      <View style={styles.center}>
        <Text variant="bodyLarge" style={styles.emptyText}>Kein geplanter Termin.</Text>
        <Text variant="bodySmall" style={styles.subText}>
          Erstelle zuerst einen Termin im Termine-Tab.
        </Text>
      </View>
    )
  }

  const maxVotes = suggestions.length > 0 ? Math.max(...suggestions.map(s => s.vote_count ?? 0)) : 0
  const winner = !nextEvent.voting_open && maxVotes > 0
    ? suggestions.find(s => s.vote_count === maxVotes)
    : null

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={suggestionsLoading} onRefresh={refetch} />}
      >
        <Text variant="headlineMedium" style={styles.title}>Spiele</Text>

        {/* Event Strip */}
        <Card style={styles.eventStrip}>
          <Card.Content style={styles.eventStripContent}>
            <View>
              <Text variant="labelMedium" style={styles.eventLabel}>Nächster Termin</Text>
              <Text variant="titleMedium" style={styles.eventDate}>
                {formatDate(nextEvent.date)}, {formatTime(nextEvent.date)} Uhr
              </Text>
            </View>
            <Chip compact style={nextEvent.voting_open ? styles.openChip : styles.closedChip}>
              {nextEvent.voting_open ? 'Abstimmung offen' : 'Geschlossen'}
            </Chip>
          </Card.Content>
        </Card>

        {/* Winner Banner */}
        {winner && (
          <Card style={styles.winnerCard}>
            <Card.Content style={styles.winnerContent}>
              <Text variant="labelMedium" style={styles.winnerLabel}>Gewinner</Text>
              <Text variant="titleLarge" style={styles.winnerName}>{winner.game_name}</Text>
            </Card.Content>
          </Card>
        )}

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Vorschläge ({suggestions.length})
          </Text>
          {nextEvent.voting_open && (
            <Button compact mode="contained" icon="plus" onPress={() => setShowForm(v => !v)}>
              Vorschlagen
            </Button>
          )}
        </View>

        {/* Add Form */}
        {showForm && nextEvent.voting_open && (
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

        {/* Suggestions List */}
        {suggestionsLoading ? (
          <ActivityIndicator style={styles.loader} />
        ) : suggestions.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Text variant="bodyMedium" style={styles.emptyText}>
                {nextEvent.voting_open
                  ? 'Noch keine Vorschläge. Sei der Erste!'
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
                        {nextEvent.voting_open && (
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
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontWeight: 'bold', marginBottom: 16 },
  eventStrip: { borderRadius: 12, marginBottom: 16, backgroundColor: '#fff' },
  eventStripContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventLabel: { color: '#888', marginBottom: 2 },
  eventDate: { fontWeight: '600' },
  openChip: { backgroundColor: '#e8f4fd' },
  closedChip: { backgroundColor: '#f0f0f0' },
  winnerCard: { borderRadius: 12, marginBottom: 16, backgroundColor: '#fff8e1', borderWidth: 2, borderColor: '#F5A623' },
  winnerContent: { alignItems: 'center', padding: 8 },
  winnerLabel: { color: '#F5A623', marginBottom: 4 },
  winnerName: { fontWeight: 'bold', textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontWeight: '600' },
  formCard: { borderRadius: 12, marginBottom: 12, backgroundColor: '#fff' },
  input: { marginBottom: 8 },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  emptyCard: { borderRadius: 12 },
  emptyContent: { alignItems: 'center', padding: 16 },
  emptyText: { color: '#888', textAlign: 'center' },
  subText: { color: '#aaa', marginTop: 8, textAlign: 'center' },
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
})
