import { useAppStore } from '../store'
import { AgentCard } from './AgentCard'
import { StarFilledIcon } from '@radix-ui/react-icons'

export function AgentList() {
  const { agents, isLoading } = useAppStore()

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-[--color-text-muted] text-sm">Loading...</div>
      </div>
    )
  }

  if (agents.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-[--color-bg-card] flex items-center justify-center mb-3">
          <StarFilledIcon className="w-6 h-6 text-[--color-text-muted]" />
        </div>
        <h2 className="text-[13px] font-medium text-[--color-text-primary] mb-1">
          No active agents
        </h2>
        <p className="text-[11px] text-[--color-text-muted] max-w-[200px]">
          Start a Claude Code session and it will appear here automatically.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-1">
      <div className="space-y-3">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  )
}
