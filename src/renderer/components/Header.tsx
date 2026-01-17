import { StarFilledIcon, ReloadIcon, GearIcon } from '@radix-ui/react-icons'
import { useAppStore } from '../store'

export function Header() {
  const { agents, setAgents, setLastSyncedAt, setShowSettings } = useAppStore()
  const activeCount = agents.filter(a => a.status === 'running' || a.status === 'waiting').length

  const handleRefresh = async () => {
    const updatedAgents = await window.electronAPI.refreshAgents()
    setAgents(updatedAgents)
    setLastSyncedAt(new Date())
  }

  return (
    <header className="drag-region flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <StarFilledIcon className="w-4 h-4 text-[--color-accent]" />
        <span className="text-[--color-text-primary] font-medium">agents</span>
        {activeCount > 0 && (
          <span className="badge badge-success">{activeCount}</span>
        )}
      </div>
      <div className="no-drag flex items-center gap-1">
        <button onClick={handleRefresh} className="icon-btn" title="Refresh">
          <ReloadIcon className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setShowSettings(true)} className="icon-btn" title="Settings">
          <GearIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  )
}
