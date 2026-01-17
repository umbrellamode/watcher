import { useState, useEffect } from 'react'
import {
  StarFilledIcon,
  PersonIcon,
  CodeIcon,
  LightningBoltIcon,
  ChatBubbleIcon,
  FileTextIcon,
  Pencil2Icon,
  PlayIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  RocketIcon,
  CheckIcon,
  ReloadIcon,
  ExclamationTriangleIcon,
  CrossCircledIcon,
  Cross2Icon
} from '@radix-ui/react-icons'
import type { Agent, AgentType, AgentStatus, ActivityItem } from '../../shared/types'
import { cn } from '../lib/utils'
import { useAppStore } from '../store'

interface AgentCardProps {
  agent: Agent
}

export function AgentCard({ agent }: AgentCardProps) {
  const { expandedAgentId, toggleExpanded } = useAppStore()
  const isExpanded = expandedAgentId === agent.id
  const [elapsedTime, setElapsedTime] = useState(getElapsedTime(agent.startedAt))

  useEffect(() => {
    if (agent.status === 'running' || agent.status === 'waiting') {
      const interval = setInterval(() => {
        setElapsedTime(getElapsedTime(agent.startedAt))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [agent.startedAt, agent.status])

  const showProgress = agent.status === 'running'

  // Format: "projectname (branch)" or just "projectname"
  const projectDisplay = agent.gitBranch
    ? `${agent.projectName} (${agent.gitBranch})`
    : agent.projectName

  return (
    <div
      className={cn('agent-card', isExpanded && 'expanded')}
      onClick={() => toggleExpanded(agent.id)}
    >
      <div className="flex items-center gap-3">
        {/* Icon + Status */}
        <div className="flex items-center gap-2">
          <AgentIcon type={agent.type} status={agent.status} />
          <StatusDot status={agent.status} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {agent.isSubagent && (
              <span className="px-1.5 py-0.5 text-[9px] font-medium uppercase rounded bg-[--color-accent]/20 text-[--color-accent] shrink-0">
                Sub
              </span>
            )}
            <span className="text-[--color-text-primary] truncate">
              {projectDisplay}
            </span>
            <span className="text-[--color-text-muted] tabular-nums shrink-0">
              {elapsedTime}
            </span>
          </div>
          <div className="text-[--color-text-secondary] truncate text-[11px]">
            {agent.currentActivity || getStatusText(agent.status)}
          </div>
        </div>

        {/* Kill button - only show if agent has PID */}
        {agent.pid && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              window.electronAPI.killAgent(agent.id)
            }}
            className="p-1 rounded hover:bg-[--color-bg-card] text-[--color-text-muted] hover:text-[--color-error] transition-colors shrink-0"
            title="Kill session"
          >
            <Cross2Icon className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Expand indicator */}
        <ChevronRightIcon
          className={cn(
            'w-3.5 h-3.5 text-[--color-text-muted] transition-transform shrink-0',
            isExpanded && 'rotate-90'
          )}
        />
      </div>

      {/* Progress Bar */}
      {showProgress && (
        <div className="progress-bar">
          <div
            className={cn(
              'progress-bar-fill',
              agent.progress === null && 'indeterminate'
            )}
            style={agent.progress !== null ? { width: `${agent.progress}%` } : undefined}
          />
        </div>
      )}

      {/* Expanded Activity Feed */}
      {isExpanded && agent.activities.length > 0 && (
        <div className="activity-feed" onClick={(e) => e.stopPropagation()}>
          {agent.activities.slice(0, 6).map((activity) => (
            <ActivityItemRow key={activity.id} activity={activity} />
          ))}
          <div className="text-[10px] text-[--color-text-muted] pt-2 truncate">
            {agent.workingDirectory}
          </div>
        </div>
      )}
    </div>
  )
}

function ActivityItemRow({ activity }: { activity: ActivityItem }) {
  return (
    <div className="activity-item">
      <ActivityIcon type={activity.type} />
      <span className="activity-item-text">{activity.description}</span>
      <span className="activity-item-time">{getRelativeTime(activity.timestamp)}</span>
    </div>
  )
}

function ActivityIcon({ type }: { type: ActivityItem['type'] }) {
  const iconProps = { className: 'w-3 h-3 text-[--color-text-muted]' }

  switch (type) {
    case 'read':
      return <FileTextIcon {...iconProps} />
    case 'edit':
      return <Pencil2Icon {...iconProps} />
    case 'write':
      return <FileTextIcon {...iconProps} />
    case 'bash':
      return <PlayIcon {...iconProps} />
    case 'search':
      return <MagnifyingGlassIcon {...iconProps} />
    default:
      return <CodeIcon {...iconProps} />
  }
}

function StatusDot({ status }: { status: AgentStatus }) {
  return <span className={cn('status-dot', status)} />
}

function AgentIcon({ type, status }: { type: AgentType; status: AgentStatus }) {
  const iconProps = { className: 'w-4 h-4' }

  // For Claude agents, show state-based icons
  if (type === 'claude') {
    switch (status) {
      case 'running':
        return (
          <span className="text-[--color-success]">
            <ReloadIcon className="w-4 h-4 animate-spin" />
          </span>
        )
      case 'waiting':
        return (
          <span className="text-[--color-warning]">
            <ExclamationTriangleIcon {...iconProps} />
          </span>
        )
      case 'completed':
        return (
          <span className="text-[--color-text-muted]">
            <CheckIcon {...iconProps} />
          </span>
        )
      case 'error':
        return (
          <span className="text-[--color-error]">
            <CrossCircledIcon {...iconProps} />
          </span>
        )
      default: // idle
        return (
          <span className="text-[--color-text-muted]">
            <StarFilledIcon {...iconProps} />
          </span>
        )
    }
  }

  // For other agent types, use their default icons
  const icons: Record<AgentType, { icon: JSX.Element; color: string }> = {
    claude: { icon: <StarFilledIcon {...iconProps} />, color: 'text-[--color-accent]' },
    cursor: { icon: <CodeIcon {...iconProps} />, color: 'text-[--color-text-secondary]' },
    chatgpt: { icon: <PersonIcon {...iconProps} />, color: 'text-[--color-success]' },
    copilot: { icon: <LightningBoltIcon {...iconProps} />, color: 'text-[--color-text-secondary]' },
    aider: { icon: <RocketIcon {...iconProps} />, color: 'text-[--color-warning]' },
    v0: { icon: <ChatBubbleIcon {...iconProps} />, color: 'text-[--color-text-secondary]' },
    codex: { icon: <CodeIcon {...iconProps} />, color: 'text-[--color-accent]' },
    unknown: { icon: <PersonIcon {...iconProps} />, color: 'text-[--color-text-muted]' },
  }

  const { icon, color } = icons[type] || icons.unknown
  return <span className={color}>{icon}</span>
}

function getElapsedTime(startedAt: Date): string {
  const start = new Date(startedAt).getTime()
  const now = Date.now()
  const seconds = Math.floor((now - start) / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function getRelativeTime(timestamp: Date): string {
  const now = Date.now()
  const diff = now - new Date(timestamp).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 5) return 'now'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h`
}

function getStatusText(status: AgentStatus): string {
  const texts: Record<AgentStatus, string> = {
    running: 'Working...',
    waiting: 'Waiting for approval...',
    idle: 'Idle',
    error: 'Error',
    completed: 'Done',
  }
  return texts[status]
}
