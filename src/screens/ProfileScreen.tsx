import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native'
import { Text, Button, Card, Divider, Avatar, Chip, Snackbar, IconButton } from 'react-native-paper'
import * as Clipboard from 'expo-clipboard'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuthStore } from '../stores/authStore'
import { useGroupStore } from '../stores/groupStore'
import { supabase } from '../services/supabase'
import { fetchGroupMembers, leaveGroup, deleteGroup } from '../services/groups'
import { MainStackParamList } from '../navigation/MainStack'
import { Group } from '../types'

type Nav = NativeStackNavigationProp<MainStackParamList>

export default function ProfileScreen() {
  const { user, profile } = useAuthStore()
  const { groups, currentGroup, setCurrentGroup, setMembers, removeGroup } = useGroupStore()
  const navigation = useNavigation<Nav>()
  const [snackMsg, setSnackMsg] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [groupMembersMap, setGroupMembersMap] = useState<Record<string, any[]>>({})
  const [loadingMembersId, setLoadingMembersId] = useState<string | null>(null)

  const handleToggleExpand = async (groupId: string) => {
    if (expandedId === groupId) {
      setExpandedId(null)
      return
    }
    setExpandedId(groupId)
    if (!groupMembersMap[groupId]) {
      setLoadingMembersId(groupId)
      const members = await fetchGroupMembers(groupId)
      setGroupMembersMap(prev => ({ ...prev, [groupId]: members }))
      setLoadingMembersId(null)
    }
  }

  const displayName = profile?.name ?? user?.email ?? '–'
  const initials = displayName.slice(0, 2).toUpperCase()

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Möchtest du dich wirklich ausloggen?')) supabase.auth.signOut()
      return
    }
    Alert.alert('Ausloggen', 'Möchtest du dich wirklich ausloggen?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Ausloggen', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code)
    setSnackMsg('Einladungscode kopiert!')
  }

  const handleSwitchGroup = async (group: Group) => {
    setCurrentGroup(group)
    const members = await fetchGroupMembers(group.id)
    setMembers(members)
    setSnackMsg(`Aktive Gruppe: ${group.name}`)
  }

  const handleLeave = (group: Group) => {
    const isCreator = group.created_by === user?.id
    if (isCreator) {
      Alert.alert(
        'Gruppe löschen?',
        `Du bist der Ersteller von "${group.name}". Wenn du die Gruppe verlässt, wird sie für alle gelöscht.`,
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Löschen', style: 'destructive', onPress: async () => {
              try {
                await deleteGroup(group.id)
                removeGroup(group.id)
                setSnackMsg('Gruppe gelöscht.')
              } catch (e: any) {
                Alert.alert('Fehler', e.message)
              }
            }
          },
        ]
      )
    } else {
      Alert.alert(
        'Gruppe verlassen?',
        `Möchtest du "${group.name}" wirklich verlassen?`,
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Verlassen', style: 'destructive', onPress: async () => {
              try {
                await leaveGroup(group.id, user!.id)
                removeGroup(group.id)
                setSnackMsg('Gruppe verlassen.')
              } catch (e: any) {
                Alert.alert('Fehler', e.message)
              }
            }
          },
        ]
      )
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Nutzerprofil */}
      <View style={styles.avatarRow}>
        <Avatar.Text size={64} label={initials} style={styles.avatar} />
        <View style={styles.userInfo}>
          <Text variant="titleLarge" style={styles.name}>{displayName}</Text>
          <Text variant="bodySmall" style={styles.email}>{user?.email}</Text>
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* Gruppen */}
      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Meine Gruppen</Text>
        <Text variant="bodySmall" style={styles.groupCount}>{groups.length} Gruppe{groups.length !== 1 ? 'n' : ''}</Text>
      </View>

      {groups.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <Text variant="bodyMedium" style={styles.emptyText}>Du bist noch in keiner Gruppe.</Text>
          </Card.Content>
        </Card>
      ) : (
        groups.map((group) => {
          const isActive = currentGroup?.id === group.id
          const isCreator = group.created_by === user?.id
          const isExpanded = expandedId === group.id

          return (
            <Card
              key={group.id}
              style={[styles.groupCard, isActive && styles.activeCard]}
              elevation={isActive ? 3 : 1}
            >
              <Card.Content>
                <View style={styles.groupHeader}>
                  <View style={styles.groupTitleRow}>
                    <Text variant="titleMedium" style={styles.groupName}>{group.name}</Text>
                    {isActive && <Chip compact style={styles.activeChip}>Aktiv</Chip>}
                    {isCreator && <Chip compact style={styles.ownerChip}>Ersteller:in</Chip>}
                  </View>
                  <IconButton
                    icon={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    onPress={() => handleToggleExpand(group.id)}
                  />
                </View>

                {isExpanded && (
                  <>
                    <Divider style={styles.innerDivider} />

                    {/* Einladungscode */}
                    <Text variant="labelMedium" style={styles.label}>Einladungscode</Text>
                    <View style={styles.codeRow}>
                      <Text variant="titleLarge" style={styles.code}>{group.invite_code}</Text>
                      <Button compact mode="outlined" icon="content-copy" onPress={() => handleCopyCode(group.invite_code)}>
                        Kopieren
                      </Button>
                    </View>

                    <Divider style={styles.innerDivider} />

                    {/* Mitgliederliste */}
                    <Text variant="labelMedium" style={styles.label}>
                      Mitglieder {groupMembersMap[group.id] ? `(${groupMembersMap[group.id].length})` : ''}
                    </Text>
                    {loadingMembersId === group.id ? (
                      <Text variant="bodySmall" style={styles.loadingText}>Lade Mitglieder...</Text>
                    ) : (
                      (groupMembersMap[group.id] ?? []).map((m, i) => (
                        <View key={m.id} style={styles.memberRow}>
                          <Avatar.Text
                            size={32}
                            label={(m.profile?.name ?? '?').slice(0, 2).toUpperCase()}
                            style={styles.memberAvatar}
                          />
                          <View style={styles.memberInfo}>
                            <Text variant="bodyMedium">{m.profile?.name ?? '–'}</Text>
                            <Text variant="bodySmall" style={styles.memberOrder}>Rotation #{i + 1}</Text>
                          </View>
                          {m.user_id === user?.id && (
                            <Chip compact style={styles.youChip}>Du</Chip>
                          )}
                        </View>
                      ))
                    )}

                    <Divider style={styles.innerDivider} />

                    {/* Aktionen */}
                    <View style={styles.actionRow}>
                      {!isActive && (
                        <Button mode="contained" compact onPress={() => handleSwitchGroup(group)} style={styles.actionBtn}>
                          Als aktiv setzen
                        </Button>
                      )}
                      <Button
                        mode="outlined"
                        compact
                        icon={isCreator ? 'delete' : 'logout'}
                        textColor="#e53935"
                        onPress={() => handleLeave(group)}
                        style={[styles.actionBtn, styles.leaveBtn]}
                      >
                        {isCreator ? 'Löschen' : 'Verlassen'}
                      </Button>
                    </View>
                  </>
                )}
              </Card.Content>
            </Card>
          )
        })
      )}

      <View style={styles.addGroupRow}>
        <Button mode="contained" icon="plus" onPress={() => navigation.navigate('CreateGroup')} style={styles.addBtn}>
          Neue Gruppe
        </Button>
        <Button mode="outlined" icon="account-group" onPress={() => navigation.navigate('JoinGroup')} style={styles.addBtn}>
          Beitreten
        </Button>
      </View>

      <Divider style={styles.divider} />

      <Button mode="outlined" icon="logout" onPress={handleSignOut} style={styles.logoutBtn} textColor="#e53935">
        Ausloggen
      </Button>

      <Snackbar visible={!!snackMsg} onDismiss={() => setSnackMsg(null)} duration={2000}>
        {snackMsg}
      </Snackbar>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 20, paddingBottom: 40 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 8 },
  avatar: { backgroundColor: '#4A90D9' },
  userInfo: { marginLeft: 16, flex: 1 },
  name: { fontWeight: 'bold' },
  email: { color: '#888', marginTop: 2 },
  divider: { marginVertical: 20 },
  innerDivider: { marginVertical: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontWeight: '600' },
  groupCount: { color: '#aaa' },
  emptyCard: { borderRadius: 12, marginBottom: 16 },
  emptyContent: { alignItems: 'center', padding: 8 },
  emptyText: { color: '#888' },
  groupCard: { borderRadius: 12, marginBottom: 12 },
  activeCard: { borderWidth: 2, borderColor: '#4A90D9' },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' },
  groupName: { fontWeight: 'bold' },
  activeChip: { backgroundColor: '#e8f4fd' },
  ownerChip: { backgroundColor: '#fff3e0' },
  label: { color: '#888', marginBottom: 4 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  code: { fontWeight: 'bold', letterSpacing: 3, color: '#4A90D9' },
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: { flex: 1 },
  leaveBtn: { borderColor: '#e53935' },
  addGroupRow: { flexDirection: 'row', gap: 12, marginTop: 4, marginBottom: 4 },
  addBtn: { flex: 1 },
  logoutBtn: { borderColor: '#e53935' },
  loadingText: { color: '#aaa', marginBottom: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  memberAvatar: { backgroundColor: '#F5A623' },
  memberInfo: { marginLeft: 10, flex: 1 },
  memberOrder: { color: '#aaa' },
  youChip: { backgroundColor: '#e8f4fd' },
})
