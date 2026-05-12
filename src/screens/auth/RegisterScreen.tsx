import React, { useState } from 'react'
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native'
import { Text, TextInput, Button, HelperText } from 'react-native-paper'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { AuthStackParamList } from '../../navigation/AuthStack'
import { supabase } from '../../services/supabase'

const schema = z.object({
  name: z.string().min(2, 'Name muss mindestens 2 Zeichen haben'),
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen haben'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwörter stimmen nicht überein',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>
}

export default function RegisterScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setAuthError(null)

    const { error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { name: data.name },
      },
    })

    setLoading(false)

    if (signUpError) {
      setAuthError(signUpError.message)
      return
    }

    Alert.alert(
      'Registrierung erfolgreich!',
      'Bitte bestätige deine E-Mail-Adresse, dann kannst du dich einloggen.',
      [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text variant="headlineLarge" style={styles.title}>Registrieren</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>Erstelle dein Spieler-Profil</Text>

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Name"
              value={value}
              onChangeText={onChange}
              mode="outlined"
              style={styles.input}
              error={!!errors.name}
            />
          )}
        />
        <HelperText type="error" visible={!!errors.name}>{errors.name?.message}</HelperText>

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="E-Mail"
              value={value}
              onChangeText={onChange}
              keyboardType="email-address"
              autoCapitalize="none"
              mode="outlined"
              style={styles.input}
              error={!!errors.email}
            />
          )}
        />
        <HelperText type="error" visible={!!errors.email}>{errors.email?.message}</HelperText>

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Passwort"
              value={value}
              onChangeText={onChange}
              secureTextEntry={!showPassword}
              mode="outlined"
              style={styles.input}
              error={!!errors.password}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />
          )}
        />
        <HelperText type="error" visible={!!errors.password}>{errors.password?.message}</HelperText>

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Passwort bestätigen"
              value={value}
              onChangeText={onChange}
              secureTextEntry={!showPassword}
              mode="outlined"
              style={styles.input}
              error={!!errors.confirmPassword}
            />
          )}
        />
        <HelperText type="error" visible={!!errors.confirmPassword}>
          {errors.confirmPassword?.message}
        </HelperText>

        {authError && (
          <HelperText type="error" visible>{authError}</HelperText>
        )}

        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          Konto erstellen
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate('Login')}
          style={styles.link}
        >
          Bereits ein Konto? Einloggen
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { textAlign: 'center', marginBottom: 8, fontWeight: 'bold' },
  subtitle: { textAlign: 'center', marginBottom: 32, color: '#666' },
  input: { marginBottom: 4 },
  button: { marginTop: 8, paddingVertical: 4 },
  link: { marginTop: 8 },
})
