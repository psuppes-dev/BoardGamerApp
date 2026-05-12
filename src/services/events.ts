import { supabase } from './supabase'
import { Event } from '../types'

export async function fetchNextEvent(groupId: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*, host:profiles(*)')
    .eq('group_id', groupId)
    .neq('status', 'past')
    .gte('date', new Date().toISOString())
    .order('date', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data as unknown as Event
}

export async function fetchAllEvents(groupId: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*, host:profiles(*)')
    .eq('group_id', groupId)
    .order('date', { ascending: true })

  if (error || !data) return []
  return data as unknown as Event[]
}

export async function countPastEvents(groupId: string): Promise<number> {
  const { count } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId)

  return count ?? 0
}

export async function createEvent(data: {
  groupId: string
  hostId: string
  date: string
  location: string
}): Promise<Event> {
  const { data: event, error } = await supabase
    .from('events')
    .insert({
      group_id: data.groupId,
      host_id: data.hostId,
      date: data.date,
      location: data.location,
      status: 'upcoming',
    })
    .select()
    .single()

  if (error || !event) throw new Error(error?.message ?? 'Termin konnte nicht erstellt werden')
  return event as Event
}
