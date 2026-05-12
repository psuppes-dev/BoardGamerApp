import React, { useState } from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { Text, TextInput, Button, HelperText, Card, Snackbar } from 'react-native-paper'
import * as Clipboard from 'expo-clipboard'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { MainStackParamList } from '../../navigation/MainStack'
import { useAuthStore } from '../../stores/authStore'
import { useGroupStore } from '../../stores/groupStore'
import { createGroup, fetchGroupMembers, fetchUserGroups } from '../../services/groups'
import { Group, GroupMember } from '../../types'

const schema = z.object({
  name: z.string().min(2, 'Name muss mindestens 2 Zeichen haben'),
})
type FormData = z.infer<typeof schema>

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'CreateGroup'>
}

export default function CreateGroupScreen({ navigation }: Props) {
  const { user } = useAuthStore()
  const { setGroups, setCurrentGroup, setMembers } = useGroupStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [snackVisible, setSnackVisible] = useState(false)

  // Store group locally — only push to global store when user taps "Los geht's"
  const [pendingGroup, setPendingGroup] = useState<Group | null>(null)
  const [pendingMembers, setPendingMembers] = useState<GroupMember[]>([])

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const group = await createGroup(data.name, user.id)
      const members = await fetchGroupMembers(group.id)
      setPendingGroup(group)
      setPendingMembers(members)
    } catch (e: any) {
      setError(e.message ?? 'Fehler beim Erstellen')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (pendingGroup) {
      await Clipboard.setStringAsync(pendingGroup.invite_code)
      setSnackVisible(true)
    }
  }

  const handleFinish = async () => {
    if (!pendingGroup || !user) return
    const allGroups = await fetchUserGroups(user.id)
    setGroups(allGroups)
    setCurrentGroup(pendingGroup)
    setMembers(pendingMembers)
  }

  if (pendingGroup) {
    return (
      <View style={styles.container}>
        <Text variant="headlineSmall" style={styles.successTitle}>🎉 Gruppe erstellt!</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Teile diesen Code mit deinen Mitspieler:innen:
        </Text>

        <Card style={styles.codeCard}>
          <Card.Content style={styles.codeContent}>
            <Text variant="displaySmall" style={styles.code}>
              {pendingGroup.invite_code}
            </Text>
          </Card.Content>
        </Card>

        <Button mode="outlined" icon="content-copy" onPress={handleCopy} style={styles.copyBtn}>
          Code kopieren
        </Button>

        <Button
          mode="contained"
          onPress={handleFinish}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Los geht's!
        </Button>

        <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)} duration={2000}>
          Code kopiert!
        </Snackbar>
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text variant="headlineSmall" style={styles.title}>Neue Gruppe</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Wie soll deine Spielgruppe heißen?
      </Text>

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, value } }) => (
          <TextInput
            label="Gruppenname"
            value={value}
            onChangeText={onChange}
            mode="outlined"
            style={styles.input}
            error={!!errors.name}
            placeholder="z.B. Die Catan-Runde"
          />
        )}
      />
      <HelperText type="error" visible={!!errors.name}>{errors.name?.message}</HelperText>
      {error && <HelperText type="error" visible>{error}</HelperText>}

      <Button
        mode="contained"
        onPress={handleSubmit(onSubmit)}
        loading={loading}
        disabled={loading}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        Gruppe erstellen
      </Button>
      <Button mode="text" onPress={() => navigation.goBack()}>Zurück</Button>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 32, backgroundColor: '#fff' },
  title: { textAlign: 'center', fontWeight: 'bold', marginBottom: 8 },
  successTitle: { textAlign: 'center', fontWeight: 'bold', marginBottom: 8 },
  subtitle: { textAlign: 'center', color: '#666', marginBottom: 32 },
  input: { marginBottom: 4 },
  button: { marginTop: 16, marginBottom: 8 },
  buttonContent: { paddingVertical: 8 },
  copyBtn: { marginBottom: 16 },
  codeCard: { marginBottom: 24, backgroundColor: '#f0f4ff' },
  codeContent: { alignItems: 'center', padding: 16 },
  code: { fontWeight: 'bold', letterSpacing: 4, color: '#4A90D9' },
})
