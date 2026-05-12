jest.mock('../services/supabase', () => ({ supabase: {} }))

import { getMajorityPref } from '../services/foodOrders'
import { FoodOrder } from '../types'

const makeOrder = (id: string, pref: string): FoodOrder => ({
  id,
  event_id: 'event-1',
  user_id: `user-${id}`,
  food_pref: pref,
  order_text: null,
  created_at: '2026-01-01T00:00:00Z',
})

describe('getMajorityPref', () => {
  it('gibt null zurück wenn keine Bestellungen vorhanden sind', () => {
    expect(getMajorityPref([])).toBeNull()
  })

  it('gibt null zurück wenn keine Bestellung eine Essensrichtung hat', () => {
    const orders = [{ ...makeOrder('1', ''), food_pref: '' }]
    expect(getMajorityPref(orders as any)).toBeNull()
  })

  it('gibt die einzige Richtung zurück bei einer Bestellung', () => {
    const result = getMajorityPref([makeOrder('1', 'italian')])
    expect(result?.pref).toBe('italian')
    expect(result?.count).toBe(1)
  })

  it('ermittelt korrekt die Mehrheit bei eindeutiger Führung', () => {
    const orders = [
      makeOrder('1', 'italian'),
      makeOrder('2', 'italian'),
      makeOrder('3', 'greek'),
    ]
    const result = getMajorityPref(orders)
    expect(result?.pref).toBe('italian')
    expect(result?.count).toBe(2)
  })

  it('gibt die Richtung mit den meisten Stimmen zurück bei mehreren Optionen', () => {
    const orders = [
      makeOrder('1', 'asian'),
      makeOrder('2', 'turkish'),
      makeOrder('3', 'asian'),
      makeOrder('4', 'asian'),
      makeOrder('5', 'turkish'),
    ]
    const result = getMajorityPref(orders)
    expect(result?.pref).toBe('asian')
    expect(result?.count).toBe(3)
  })

  it('ignoriert Bestellungen ohne Essensrichtung', () => {
    const orders = [
      makeOrder('1', 'greek'),
      { ...makeOrder('2', ''), food_pref: null as any },
      makeOrder('3', 'greek'),
    ]
    const result = getMajorityPref(orders)
    expect(result?.pref).toBe('greek')
    expect(result?.count).toBe(2)
  })
})
