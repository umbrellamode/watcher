import { create } from 'zustand'
import type { Agent } from '../shared/types'

interface AppState {
  agents: Agent[]
  lastSyncedAt: Date | null
  isLoading: boolean
  expandedAgentId: string | null
  showSettings: boolean
  setAgents: (agents: Agent[]) => void
  setLastSyncedAt: (date: Date) => void
  setIsLoading: (loading: boolean) => void
  toggleExpanded: (agentId: string) => void
  setShowSettings: (show: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  agents: [],
  lastSyncedAt: null,
  isLoading: false,
  expandedAgentId: null,
  showSettings: false,
  setAgents: (agents) => set({ agents }),
  setLastSyncedAt: (date) => set({ lastSyncedAt: date }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  toggleExpanded: (agentId) => set((state) => ({
    expandedAgentId: state.expandedAgentId === agentId ? null : agentId
  })),
  setShowSettings: (show) => set({ showSettings: show }),
}))
