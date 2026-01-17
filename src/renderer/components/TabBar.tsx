import { GearIcon } from '@radix-ui/react-icons'
import { useAppStore } from '../store'
import { cn } from '../lib/utils'

export function TabBar() {
  const { agents, ports, activeTab, setActiveTab, setShowSettings } = useAppStore()

  const agentCount = agents.filter(a => a.status === 'running' || a.status === 'waiting').length
  const portCount = ports.length

  return (
    <header className="drag-region flex items-center justify-between mb-4">
      <div className="no-drag flex items-center gap-1">
        <button
          onClick={() => setActiveTab('agents')}
          className={cn(
            'tab-btn',
            activeTab === 'agents' && 'active'
          )}
        >
          <span>Agents</span>
          {agentCount > 0 && (
            <span className="badge badge-success">{agentCount}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('ports')}
          className={cn(
            'tab-btn',
            activeTab === 'ports' && 'active'
          )}
        >
          <span>Ports</span>
          {portCount > 0 && (
            <span className="badge badge-muted">{portCount}</span>
          )}
        </button>
      </div>
      <div className="no-drag flex items-center gap-1">
        <button onClick={() => setShowSettings(true)} className="icon-btn" title="Settings">
          <GearIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  )
}
