import { supabase } from './supabase'
import { Group, GroupMember } from '../types'

export async function fetchUserGroups(userId: string): Promise<Group[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('groups(*)')
    .eq('user_id', userId)

  if (error || !data) return []
  return (data as any[]).map(d => d.groups).filter(Boolean) as Group[]
}

export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)

  if (error) throw new Error('Gruppe verlassen fehlgeschlagen.')
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId)

  if (error) throw new Error('Gruppe löschen fehlgeschlagen.')
}

export async function fetchGroupMembers(groupId: string): Promise<GroupMember[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('*, profile:profiles(*)')
    .eq('group_id', groupId)
    .order('host_order')

  if (error || !data) return []
  return data as unknown as GroupMember[]
}

export async function createGroup(name: string, userId: string): Promise<Group> {
  const { data: group, error } = await supabase
    .from('groups')
    .insert({ name, created_by: userId })
    .select()
    .single()

  if (error || !group) throw new Error(error?.message ?? 'Gruppe konnte nicht erstellt werden')

  await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: userId, host_order: 0 })

  return group as Group
}

export async function joinGroupByCode(inviteCode: string, userId: string): Promise<Group> {
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select()
    .eq('invite_code', inviteCode.trim())
    .single()

  if (groupError || !group) throw new Error('Gruppe nicht gefunden. Bitte Einladungscode prüfen.')

  const { data: existing } = await supabase
    .from('group_members')
    .select()
    .eq('group_id', group.id)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) throw new Error('Du bist bereits Mitglied dieser Gruppe.')

  const { data: members } = await supabase
    .from('group_members')
    .select('host_order')
    .eq('group_id', group.id)
    .order('host_order', { ascending: false })
    .limit(1)

  const nextOrder = members && members.length > 0 ? (members[0] as any).host_order + 1 : 0

  const { error: joinError } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: userId, host_order: nextOrder })

  if (joinError) throw new Error('Beitreten fehlgeschlagen.')

  return group as Group
}
