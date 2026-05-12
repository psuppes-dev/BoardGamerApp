import React, { useState } from 'react'
import { StyleSheet, ScrollView, Platform } from 'react-native'
import { Text, TextInput, Button, HelperText, Card } from 'react-native-paper'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useGroupStore } from '../../stores/groupStore'
import { createEvent, countPastEvents } from '../../services/events'
import { fetchGroupMembers } from '../../services/groups'
import { sendPush } from '../../services/notifications'
import { getNextHost, formatDate, formatTime } from '../../utils/hostRotation'

const schema = z.object({
  location: z.string().min(2, 'Bitte Adresse eingeben'),
})
type FormData = z.infer<typeof schema>

type Props = {
  navigation: any
}

export default function CreateEventScreen({ navigation }: Props) {
  const { currentGroup, members } = useGroupStore()
  const queryClient = useQueryClient()

  const [date, setDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    d.setHours(19, 0, 0, 0)
    return d
  })
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pastCount, setPastCount] = useState<number | null>(null)

  React.useEffect(() => {
    if (currentGroup) {
      countPastEvents(currentGroup.id).then(setPastCount)
    }
  }, [currentGroup])

  const nextHost = pastCount !== null ? getNextHost(members, pastCount) : null

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    if (!currentGroup || !nextHost) return
    setLoading(true)
    setError(null)
    try {
      await createEvent({
        groupId: currentGroup.id,
        hostId: nextHost.user_id,
        date: date.toISOString(),
        location: data.location,
      })
      await queryClient.invalidateQueries({ queryKey: ['nextEvent'] })
      await queryClient.invalidateQueries({ queryKey: ['events'] })

      // US-07: Push an alle Mitglieder – Essensrichtung wählen
      const allMembers = await fetchGroupMembers(currentGroup.id)
      const tokens = allMembers.map(m => m.profile?.expo_token).filter(Boolean) as string[]
      await sendPush(tokens, '🎲 Neuer Spieltermin!', 'Wähle deine Essensrichtung für den Abend.')

      navigation.goBack()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text variant="headlineSmall" style={styles.title}>Neuer Termin</Text>

      {nextHost && (
        <Card style={styles.hostCard}>
          <Card.Content>
            <Text variant="labelMedium" style={styles.hostLabel}>Gastgeber:in (automatisch)</Text>
            <Text variant="titleMedium" style={styles.hostName}>
              {nextHost.profile?.name ?? 'Unbekannt'}
            </Text>
          </Card.Content>
        </Card>
      )}

      <Text variant="labelLarge" style={styles.sectionLabel}>Datum</Text>
      <Button
        mode="outlined"
        icon="calendar"
        onPress={() => setShowDatePicker(true)}
        style={styles.pickerButton}
      >
        {formatDate(date.toISOString())}
      </Button>
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          minimumDate={new Date()}
          onChange={(_, selected) => {
            setShowDatePicker(Platform.OS === 'ios')
            if (selected) {
              const updated = new Date(selected)
              updated.setHours(date.getHours(), date.getMinutes())
              setDate(updated)
            }
          }}
        />
      )}

      <Text variant="labelLarge" style={styles.sectionLabel}>Uhrzeit</Text>
      <Button
        mode="outlined"
        icon="clock-outline"
        onPress={() => setShowTimePicker(true)}
        style={styles.pickerButton}
      >
        {formatTime(date.toISOString())} Uhr
      </Button>
      {showTimePicker && (
        <DateTimePicker
          value={date}
          mode="time"
          is24Hour
          onChange={(_, selected) => {
            setShowTimePicker(Platform.OS === 'ios')
            if (selected) setDate(selected)
          }}
        />
      )}

      <Text variant="labelLarge" style={styles.sectionLabel}>Adresse</Text>
      <Controller
        control={control}
        name="location"
        render={({ field: { onChange, value } }) => (
          <TextInput
            label="Adresse des Gastgebers"
            value={value}
            onChangeText={onChange}
            mode="outlined"
            style={styles.input}
            error={!!errors.location}
            placeholder="Musterstraße 1, 12345 Berlin"
          />
        )}
      />
      <HelperText type="error" visible={!!errors.location}>{errors.location?.message}</HelperText>

      {error && <HelperText type="error" visible>{error}</HelperText>}

      <Button
        mode="contained"
        onPress={handleSubmit(onSubmit)}
        loading={loading}
        disabled={loading || !nextHost}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        Termin erstellen
      </Button>
      <Button mode="text" onPress={() => navigation.goBack()}>Abbrechen</Button>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontWeight: 'bold', marginBottom: 24 },
  hostCard: { marginBottom: 24, backgroundColor: '#f0f4ff' },
  hostLabel: { color: '#666', marginBottom: 4 },
  hostName: { fontWeight: 'bold' },
  sectionLabel: { marginBottom: 8, marginTop: 8 },
  pickerButton: { marginBottom: 16, justifyContent: 'flex-start' },
  input: { marginBottom: 4 },
  button: { marginTop: 16, marginBottom: 8 },
  buttonContent: { paddingVertical: 8 },
})
