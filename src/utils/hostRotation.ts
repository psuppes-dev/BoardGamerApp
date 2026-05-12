import { GroupMember } from '../types'

export function getNextHost(members: GroupMember[], pastEventsCount: number): GroupMember | null {
  if (members.length === 0) return null
  const sorted = [...members].sort((a, b) => a.host_order - b.host_order)
  return sorted[pastEventsCount % sorted.length]
}

export function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(isoString))
}

export function formatTime(isoString: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString))
}

export function getDaysUntil(isoString: string): number {
  const diff = new Date(isoString).getTime() - new Date().getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function formatMessageTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }
  return (
    date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) +
    ' ' +
    date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  )
}
