import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import MainTabs from './MainTabs'
import CreateEventScreen from '../screens/events/CreateEventScreen'
import EventDetailScreen from '../screens/events/EventDetailScreen'
import CreateGroupScreen from '../screens/group/CreateGroupScreen'
import JoinGroupScreen from '../screens/group/JoinGroupScreen'

export type MainStackParamList = {
  Tabs: undefined
  CreateEvent: undefined
  EventDetail: { eventId: string }
  CreateGroup: undefined
  JoinGroup: undefined
}

const Stack = createNativeStackNavigator<MainStackParamList>()

export default function MainStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="CreateEvent"
        component={CreateEventScreen}
        options={{ presentation: 'modal', title: 'Neuer Termin' }}
      />
      <Stack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{ title: 'Termin Details' }}
      />
      <Stack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
        options={{ presentation: 'modal', title: 'Gruppe erstellen' }}
      />
      <Stack.Screen
        name="JoinGroup"
        component={JoinGroupScreen}
        options={{ presentation: 'modal', title: 'Gruppe beitreten' }}
      />
    </Stack.Navigator>
  )
}
