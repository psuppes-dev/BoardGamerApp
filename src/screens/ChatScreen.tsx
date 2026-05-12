import React, { useEffect, useRef, useState } from 'react'
import {
  View, StyleSheet, FlatList,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { Text, TextInput, IconButton, Chip, ActivityIndicator } from 'react-native-paper'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useGroupStore } from '../stores/groupStore'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../services/supabase'
import { fetchMessages, sendMessage } from '../services/messages'
import { Message } from '../types'
import { formatMessageTime } from '../utils/hostRotation'

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const isLateNotice = message.type === 'late-notice'
  return (
    <View style={[styles.bubbleWrapper, isOwn && styles.bubbleWrapperOwn]}>
      {!isOwn && (
        <Text variant="labelSmall" style={styles.senderName}>
          {(message as any).profile?.name ?? '–'}
        </Text>
      )}
      <View style={[
        styles.bubble,
        isOwn ? styles.bubbleOwn : styles.bubbleOther,
        isLateNotice && styles.bubbleLate,
      ]}>
        {isLateNotice && (
          <View style={styles.lateTag}>
            <Text variant="labelSmall" style={styles.lateTagText}>Komme später</Text>
          </View>
        )}
        <Text variant="bodyMedium" style={isOwn ? styles.bubbleTextOwn : styles.bubbleTextOther}>
          {message.text}
        </Text>
      </View>
      <Text variant="labelSmall" style={[styles.timestamp, isOwn && styles.timestampOwn]}>
        {formatMessageTime(message.created_at)}
      </Text>
    </View>
  )
}

export default function ChatScreen() {
  const { currentGroup } = useGroupStore()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', currentGroup?.id],
    queryFn: () => fetchMessages(currentGroup!.id),
    enabled: !!currentGroup,
  })

  // Realtime subscription
  useEffect(() => {
    if (!currentGroup) return
    const channel = supabase
      .channel(`chat-${currentGroup.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `group_id=eq.${currentGroup.id}`,
      }, () => queryClient.invalidateQueries({ queryKey: ['messages', currentGroup.id] }))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentGroup?.id])

  const handleSend = async (type: 'broadcast' | 'late-notice' = 'broadcast') => {
    const trimmed = text.trim()
    if (!trimmed || !user || !currentGroup) return
    setSending(true)
    setText('')
    try {
      await sendMessage(currentGroup.id, user.id, trimmed, type)
      queryClient.invalidateQueries({ queryKey: ['messages', currentGroup.id] })
    } catch {
      setText(trimmed)
    } finally {
      setSending(false)
    }
  }

  const handleLateNotice = () => {
    if (!user || !currentGroup) return
    setSending(true)
    sendMessage(currentGroup.id, user.id, 'Ich komme etwas später!', 'late-notice')
      .then(() => queryClient.invalidateQueries({ queryKey: ['messages', currentGroup.id] }))
      .catch(() => {})
      .finally(() => setSending(false))
  }

  if (!currentGroup) {
    return (
      <View style={styles.center}>
        <Text variant="bodyLarge" style={styles.emptyText}>Keine aktive Gruppe.</Text>
        <Text variant="bodySmall" style={styles.subText}>
          Wähle eine Gruppe im Profil-Tab.
        </Text>
      </View>
    )
  }

  // messages from service are descending (newest first) — good for inverted FlatList
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.headerTitle}>{currentGroup.name}</Text>
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          inverted
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <MessageBubble message={item} isOwn={item.sender_id === user?.id} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text variant="bodyMedium" style={styles.emptyText}>
                Noch keine Nachrichten. Schreib als Erste:r!
              </Text>
            </View>
          }
        />
      )}

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <Chip
          compact
          icon="clock-alert-outline"
          onPress={handleLateNotice}
          disabled={sending}
          style={styles.lateChip}
        >
          Später
        </Chip>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Nachricht..."
          mode="outlined"
          dense
          style={styles.textInput}
          onSubmitEditing={() => handleSend()}
          returnKeyType="send"
        />
        <IconButton
          icon="send"
          size={24}
          iconColor={text.trim() ? '#4A90D9' : '#ccc'}
          onPress={() => handleSend()}
          disabled={!text.trim() || sending}
        />
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: { fontWeight: 'bold' },
  listContent: { paddingHorizontal: 16, paddingVertical: 12 },
  emptyChat: { flex: 1, alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#888', textAlign: 'center' },
  subText: { color: '#aaa', marginTop: 8, textAlign: 'center' },

  // Bubbles
  bubbleWrapper: { marginBottom: 12, maxWidth: '80%' },
  bubbleWrapperOwn: { alignSelf: 'flex-end' },
  senderName: { color: '#888', marginBottom: 2, marginLeft: 4 },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleOwn: { backgroundColor: '#4A90D9', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  bubbleLate: { borderWidth: 1.5, borderColor: '#F5A623' },
  lateTag: {
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  lateTagText: { color: '#F5A623', fontSize: 10 },
  bubbleTextOwn: { color: '#fff' },
  bubbleTextOther: { color: '#222' },
  timestamp: { fontSize: 10, color: '#aaa', marginTop: 3, marginLeft: 4 },
  timestampOwn: { textAlign: 'right', marginRight: 4 },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 4,
  },
  lateChip: { backgroundColor: '#fff3e0' },
  textInput: { flex: 1, backgroundColor: '#fff' },
})
