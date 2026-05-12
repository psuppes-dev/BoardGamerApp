import { getNextHost } from '../utils/hostRotation'
import { GroupMember } from '../types'

const makeMember = (hostOrder: number): GroupMember => ({
  id: `id-${hostOrder}`,
  group_id: 'group-1',
  user_id: `user-${hostOrder}`,
  host_order: hostOrder,
  joined_at: '2026-01-01T00:00:00Z',
})

const members = [
  makeMember(0),
  makeMember(1),
  makeMember(2),
  makeMember(3),
]

describe('getNextHost', () => {
  it('gibt null zurück wenn keine Mitglieder vorhanden sind', () => {
    expect(getNextHost([], 0)).toBeNull()
  })

  it('gibt das erste Mitglied zurück wenn noch kein Event stattgefunden hat', () => {
    const host = getNextHost(members, 0)
    expect(host?.host_order).toBe(0)
  })

  it('gibt das zweite Mitglied zurück nach einem vergangenen Event', () => {
    const host = getNextHost(members, 1)
    expect(host?.host_order).toBe(1)
  })

  it('rotiert korrekt zurück zum Anfang nach vollständiger Runde', () => {
    const host = getNextHost(members, 4)
    expect(host?.host_order).toBe(0)
  })

  it('funktioniert korrekt bei einer unsortierten Mitgliederliste', () => {
    const shuffled = [makeMember(3), makeMember(1), makeMember(0), makeMember(2)]
    const host = getNextHost(shuffled, 1)
    expect(host?.host_order).toBe(1)
  })

  it('gibt das einzige Mitglied immer zurück bei einer Einzelperson-Gruppe', () => {
    const single = [makeMember(0)]
    expect(getNextHost(single, 0)?.host_order).toBe(0)
    expect(getNextHost(single, 5)?.host_order).toBe(0)
    expect(getNextHost(single, 99)?.host_order).toBe(0)
  })
})
