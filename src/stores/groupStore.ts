import { create } from 'zustand'
import { Group, GroupMember } from '../types'

interface GroupState {
  groups: Group[]
  currentGroup: Group | null
  members: GroupMember[]
  groupLoading: boolean
  setGroups: (groups: Group[]) => void
  setCurrentGroup: (group: Group | null) => void
  setMembers: (members: GroupMember[]) => void
  setGroupLoading: (loading: boolean) => void
  removeGroup: (groupId: string) => void
}

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  currentGroup: null,
  members: [],
  groupLoading: true,
  setGroups: (groups) => set({ groups }),
  setCurrentGroup: (group) => set({ currentGroup: group }),
  setMembers: (members) => set({ members }),
  setGroupLoading: (loading) => set({ groupLoading: loading }),
  removeGroup: (groupId) => {
    const groups = get().groups.filter(g => g.id !== groupId)
    const current = get().currentGroup
    set({
      groups,
      currentGroup: current?.id === groupId ? (groups[0] ?? null) : current,
    })
  },
}))
