import React, { useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { ActivityIndicator, View } from 'react-native'
import { supabase } from '../services/supabase'
import { fetchUserGroups, fetchGroupMembers } from '../services/groups'
import { registerPushToken } from '../services/notifications'
import { useAuthStore } from '../stores/authStore'
import { useGroupStore } from '../stores/groupStore'
import AuthStack from './AuthStack'
import MainStack from './MainStack'

export default function AppNavigator() {
  const { session, loading, setSession } = useAuthStore()
  const { groupLoading, setGroups, setCurrentGroup, setMembers, setGroupLoading } = useGroupStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setGroups([])
      setCurrentGroup(null)
      setGroupLoading(false)
      return
    }

    registerPushToken(session.user.id)
    setGroupLoading(true)
    fetchUserGroups(session.user.id).then(async (groups) => {
      setGroups(groups)
      const first = groups[0] ?? null
      setCurrentGroup(first)
      if (first) {
        const members = await fetchGroupMembers(first.id)
        setMembers(members)
      }
      setGroupLoading(false)
    })
  }, [session])

  if (loading || groupLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      {session ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  )
}
