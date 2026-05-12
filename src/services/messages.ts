import { supabase } from './supabase'
import { Message } from '../types'

export async function fetchMessages(groupId: string): Promise<Message[]> {
  const { data } = await supabase
    .from('messages')
    .select('*, profile:profiles(*)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(100)
  return (data ?? []) as unknown as Message[]
}

export async function sendMessage(
  groupId: string,
  senderId: string,
  text: string,
  type: 'broadcast' | 'late-notice' = 'broadcast'
): Promise<void> {
  const { error } = await supabase.from('messages').insert({
    group_id: groupId,
    sender_id: senderId,
    text,
    type,
  })
  if (error) throw new Error(error.message)
}
