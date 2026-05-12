import { supabase } from './supabase'
import { FoodOrder } from '../types'

export type FoodPref = 'italian' | 'greek' | 'turkish' | 'asian' | 'other'

export const FOOD_PREF_LABELS: Record<FoodPref, string> = {
  italian: 'Italienisch 🍕',
  greek: 'Griechisch 🥙',
  turkish: 'Türkisch 🌯',
  asian: 'Asiatisch 🍜',
  other: 'Sonstiges 🍽️',
}

export const MOCK_MENUS: Record<FoodPref, string[]> = {
  italian: ['Pizza Margherita', 'Pizza Salami', 'Pasta Carbonara', 'Lasagne', 'Tiramisu'],
  greek: ['Gyros-Teller', 'Souvlaki', 'Moussaka', 'Griechischer Salat', 'Baklava'],
  turkish: ['Döner im Fladenbrot', 'Lahmacun', 'Köfte-Teller', 'Börek', 'Ayran'],
  asian: ['Pad Thai', 'Sushi-Box (12 Stück)', 'Ramen', 'Frühlingsrollen', 'Mango-Dessert'],
  other: ['Burger Classic', 'Veggie Burger', 'Caesar Salat', 'Chicken Wrap', 'Pommes'],
}

export async function fetchFoodOrders(eventId: string): Promise<FoodOrder[]> {
  const { data } = await supabase
    .from('food_orders')
    .select('*, profile:profiles(*)')
    .eq('event_id', eventId)
  return (data ?? []) as unknown as FoodOrder[]
}

export async function setFoodPreference(
  eventId: string,
  userId: string,
  foodPref: FoodPref
): Promise<void> {
  const { error } = await supabase
    .from('food_orders')
    .upsert({ event_id: eventId, user_id: userId, food_pref: foodPref }, { onConflict: 'event_id,user_id' })
  if (error) throw new Error(error.message)
}

export async function submitOrder(
  eventId: string,
  userId: string,
  foodPref: FoodPref,
  orderText: string
): Promise<void> {
  const { error } = await supabase
    .from('food_orders')
    .upsert(
      { event_id: eventId, user_id: userId, food_pref: foodPref, order_text: orderText },
      { onConflict: 'event_id,user_id' }
    )
  if (error) throw new Error(error.message)
}

export function getMajorityPref(orders: FoodOrder[]): { pref: FoodPref; count: number } | null {
  const withPref = orders.filter(o => o.food_pref)
  if (withPref.length === 0) return null
  const counts: Record<string, number> = {}
  withPref.forEach(o => { counts[o.food_pref!] = (counts[o.food_pref!] ?? 0) + 1 })
  const [pref, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return { pref: pref as FoodPref, count }
}
