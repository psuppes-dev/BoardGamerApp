import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import GroupSetupScreen from '../screens/group/GroupSetupScreen'
import CreateGroupScreen from '../screens/group/CreateGroupScreen'
import JoinGroupScreen from '../screens/group/JoinGroupScreen'

export type GroupSetupStackParamList = {
  GroupSetup: undefined
  CreateGroup: undefined
  JoinGroup: undefined
}

const Stack = createNativeStackNavigator<GroupSetupStackParamList>()

export default function GroupSetupStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GroupSetup" component={GroupSetupScreen} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
      <Stack.Screen name="JoinGroup" component={JoinGroupScreen} />
    </Stack.Navigator>
  )
}
