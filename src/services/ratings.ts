import { supabase } from './supabase'
import { Rating } from '../types'

export async function fetchRatings(eventId: string): Promise<Rating[]> {
  const { data } = await supabase
    .from('ratings')
    .select('*')
    .eq('event_id', eventId)
  return (data ?? []) as Rating[]
}

export async function submitRating(
  eventId: string,
  userId: string,
  hostRating: number,
  foodRating: number,
  eveningRating: number,
  comment?: string
): Promise<void> {
  const { error } = await supabase.from('ratings').insert({
    event_id: eventId,
    user_id: userId,
    host_rating: hostRating,
    food_rating: foodRating,
    evening_rating: eveningRating,
    comment: comment ?? null,
  })
  if (error) throw new Error(error.message)
}

export function computeAverages(ratings: Rating[]) {
  if (ratings.length === 0) return null
  const avg = (vals: number[]) => vals.reduce((s, v) => s + v, 0) / vals.length
  return {
    host: avg(ratings.map(r => r.host_rating)),
    food: avg(ratings.map(r => r.food_rating)),
    evening: avg(ratings.map(r => r.evening_rating)),
    count: ratings.length,
  }
}
