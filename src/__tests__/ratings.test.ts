jest.mock('../services/supabase', () => ({ supabase: {} }))

import { computeAverages } from '../services/ratings'
import { Rating } from '../types'

const makeRating = (host: number, food: number, evening: number): Rating => ({
  id: Math.random().toString(),
  event_id: 'event-1',
  user_id: 'user-1',
  host_rating: host,
  food_rating: food,
  evening_rating: evening,
  comment: null,
  created_at: '2026-01-01T00:00:00Z',
})

describe('computeAverages', () => {
  it('gibt null zurück wenn keine Bewertungen vorhanden sind', () => {
    expect(computeAverages([])).toBeNull()
  })

  it('gibt bei einer einzelnen Bewertung genau deren Werte zurück', () => {
    const result = computeAverages([makeRating(4, 5, 3)])
    expect(result?.host).toBe(4)
    expect(result?.food).toBe(5)
    expect(result?.evening).toBe(3)
    expect(result?.count).toBe(1)
  })

  it('berechnet den Durchschnitt korrekt über mehrere Bewertungen', () => {
    const ratings = [
      makeRating(4, 2, 5),
      makeRating(2, 4, 3),
    ]
    const result = computeAverages(ratings)
    expect(result?.host).toBe(3)
    expect(result?.food).toBe(3)
    expect(result?.evening).toBe(4)
    expect(result?.count).toBe(2)
  })

  it('berechnet den Durchschnitt korrekt bei nicht ganzzahligen Ergebnissen', () => {
    const ratings = [
      makeRating(5, 5, 5),
      makeRating(4, 4, 4),
      makeRating(3, 3, 3),
    ]
    const result = computeAverages(ratings)
    expect(result?.host).toBeCloseTo(4)
    expect(result?.food).toBeCloseTo(4)
    expect(result?.evening).toBeCloseTo(4)
    expect(result?.count).toBe(3)
  })

  it('gibt die korrekte Anzahl der Bewertungen zurück', () => {
    const ratings = [makeRating(3, 3, 3), makeRating(4, 4, 4), makeRating(5, 5, 5)]
    expect(computeAverages(ratings)?.count).toBe(3)
  })
})
