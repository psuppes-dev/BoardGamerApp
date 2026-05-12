import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, Button } from 'react-native-paper'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { GroupSetupStackParamList } from '../../navigation/GroupSetupStack'

type Props = {
  navigation: NativeStackNavigationProp<GroupSetupStackParamList, 'GroupSetup'>
}

export default function GroupSetupScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Willkommen!</Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        Erstelle eine neue Spielgruppe oder tritt einer bestehenden bei.
      </Text>

      <Button
        mode="contained"
        icon="plus"
        onPress={() => navigation.navigate('CreateGroup')}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        Neue Gruppe erstellen
      </Button>

      <Button
        mode="outlined"
        icon="account-group"
        onPress={() => navigation.navigate('JoinGroup')}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        Gruppe beitreten
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 32, backgroundColor: '#fff' },
  title: { textAlign: 'center', fontWeight: 'bold', marginBottom: 12 },
  subtitle: { textAlign: 'center', color: '#666', marginBottom: 48 },
  button: { marginBottom: 16 },
  buttonContent: { paddingVertical: 8 },
})
