import React, { useState } from 'react'
import { StyleSheet, ScrollView } from 'react-native'
import { Text, TextInput, Button, HelperText } from 'react-native-paper'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { MainStackParamList } from '../../navigation/MainStack'
import { useAuthStore } from '../../stores/authStore'
import { useGroupStore } from '../../stores/groupStore'
import { joinGroupByCode, fetchGroupMembers, fetchUserGroups } from '../../services/groups'

const schema = z.object({
  inviteCode: z.string().min(1, 'Bitte Einladungscode eingeben'),
})
type FormData = z.infer<typeof schema>

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'JoinGroup'>
}

export default function JoinGroupScreen({ navigation }: Props) {
  const { user } = useAuthStore()
  const { setGroups, setCurrentGroup, setMembers } = useGroupStore()
  const [loading, setLoading] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    if (!user) return
    setLoading(true)
    setJoinError(null)
    try {
      const group = await joinGroupByCode(data.inviteCode, user.id)
      const [allGroups, members] = await Promise.all([
        fetchUserGroups(user.id),
        fetchGroupMembers(group.id),
      ])
      setGroups(allGroups)
      setCurrentGroup(group)
      setMembers(members)
    } catch (e: any) {
      setJoinError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text variant="headlineSmall" style={styles.title}>Gruppe beitreten</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Gib den Einladungscode ein, den du von deinen Mitspieler:innen erhalten hast.
      </Text>

      <Controller
        control={control}
        name="inviteCode"
        render={({ field: { onChange, value } }) => (
          <TextInput
            label="Einladungscode"
            value={value}
            onChangeText={onChange}
            mode="outlined"
            autoCapitalize="none"
            style={styles.input}
            error={!!errors.inviteCode || !!joinError}
            placeholder="z.B. a1b2c3d4"
          />
        )}
      />
      <HelperText type="error" visible={!!errors.inviteCode || !!joinError}>
        {errors.inviteCode?.message ?? joinError}
      </HelperText>

      <Button
        mode="contained"
        onPress={handleSubmit(onSubmit)}
        loading={loading}
        disabled={loading}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        Beitreten
      </Button>
      <Button mode="text" onPress={() => navigation.goBack()}>Zurück</Button>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 32, backgroundColor: '#fff' },
  title: { textAlign: 'center', fontWeight: 'bold', marginBottom: 8 },
  subtitle: { textAlign: 'center', color: '#666', marginBottom: 32 },
  input: { marginBottom: 4 },
  button: { marginTop: 16, marginBottom: 8 },
  buttonContent: { paddingVertical: 8 },
})
