import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { supabase } from './supabase'

export async function registerPushToken(userId: string): Promise<void> {
  if (Platform.OS === 'web') return
  try {
    const { status: existing } = await Notifications.getPermissionsAsync()
    let finalStatus = existing
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') {
      console.warn('[Push] Permission nicht erteilt:', finalStatus)
      return
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId

    console.log('[Push] projectId:', projectId)
    const token = (await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    )).data
    console.log('[Push] Token:', token)
    await supabase.from('profiles').update({ expo_token: token }).eq('id', userId)
  } catch (e) {
    console.error('[Push] registerPushToken Fehler:', e)
  }
}

export async function sendPush(
  tokens: (string | null | undefined)[],
  title: string,
  body: string
): Promise<void> {
  const valid = tokens.filter((t): t is string => !!t && t.startsWith('ExponentPushToken'))
  if (valid.length === 0) return
  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-push`
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({ tokens: valid, title, body }),
  })
}
