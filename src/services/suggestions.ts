import { supabase } from './supabase'
import { GameSuggestion } from '../types'

export async function fetchSuggestions(eventId: string, userId: string): Promise<GameSuggestion[]> {
  const [{ data: suggestions }, { data: votes }] = await Promise.all([
    supabase
      .from('game_suggestions')
      .select('*, profile:profiles(*)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true }),
    supabase
      .from('votes')
      .select('suggestion_id, user_id')
      .eq('event_id', eventId),
  ])

  if (!suggestions) return []
  const votesData = votes ?? []

  return suggestions.map(s => ({
    ...s,
    vote_count: votesData.filter(v => v.suggestion_id === s.id).length,
    user_voted: votesData.some(v => v.suggestion_id === s.id && v.user_id === userId),
  })) as GameSuggestion[]
}

export async function addSuggestion(
  eventId: string,
  userId: string,
  gameName: string,
  description?: string
): Promise<void> {
  const { error } = await supabase.from('game_suggestions').insert({
    event_id: eventId,
    suggested_by: userId,
    game_name: gameName,
    description: description ?? null,
  })
  if (error) throw new Error(error.message)
}

export async function castVote(eventId: string, suggestionId: string, userId: string): Promise<void> {
  await supabase.from('votes').delete().eq('event_id', eventId).eq('user_id', userId)
  const { error } = await supabase.from('votes').insert({
    event_id: eventId,
    suggestion_id: suggestionId,
    user_id: userId,
  })
  if (error) throw new Error(error.message)
}

export async function removeVote(eventId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('votes')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function closeVoting(eventId: string): Promise<void> {
  const { error } = await supabase
    .from('events')
    .update({ voting_open: false })
    .eq('id', eventId)
  if (error) throw new Error(error.message)
}
