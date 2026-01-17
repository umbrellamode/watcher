import { create } from 'zustand'
import type { Agent, PortInfo } from '../shared/types'

type ActiveTab = 'agents' | 'ports'

interface AppState {
  agents: Agent[]
  ports: PortInfo[]
  activeTab: ActiveTab
  lastSyncedAt: Date | null
  isLoading: boolean
  expandedAgentId: string | null
  showSettings: boolean
  setAgents: (agents: Agent[]) => void
  setPorts: (ports: PortInfo[]) => void
  setActiveTab: (tab: ActiveTab) => void
  setLastSyncedAt: (date: Date) => void
  setIsLoading: (loading: boolean) => void
  toggleExpanded: (agentId: string) => void
  setShowSettings: (show: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  agents: [],
  ports: [],
  activeTab: 'agents',
  lastSyncedAt: null,
  isLoading: false,
  expandedAgentId: null,
  showSettings: false,
  setAgents: (agents) => set({ agents }),
  setPorts: (ports) => set({ ports }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setLastSyncedAt: (date) => set({ lastSyncedAt: date }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  toggleExpanded: (agentId) => set((state) => ({
    expandedAgentId: state.expandedAgentId === agentId ? null : agentId
  })),
  setShowSettings: (show) => set({ showSettings: show }),
}))
