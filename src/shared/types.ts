export type AgentType = 'claude' | 'cursor' | 'chatgpt' | 'copilot' | 'aider' | 'v0' | 'codex' | 'unknown'

export type AgentStatus = 'running' | 'idle' | 'waiting' | 'error' | 'completed'

export interface ActivityItem {
  id: string
  type: 'read' | 'edit' | 'write' | 'bash' | 'search' | 'other'
  description: string
  target?: string
  timestamp: Date
}

export interface Agent {
  id: string
  type: AgentType
  name: string
  projectName: string
  gitBranch: string | null
  workingDirectory: string
  status: AgentStatus
  currentActivity: string | null
  activities: ActivityItem[]
  startedAt: Date
  progress: number | null
  pid?: number
  sessionId?: string
  waitingForPermission?: boolean
  isSubagent?: boolean
}

export interface AgentState {
  agents: Agent[]
  lastSyncedAt: Date | null
}

export interface ClaudeLogEntry {
  type: string
  timestamp?: string
  message?: {
    type: string
    content?: string | Array<{ type: string; text?: string; name?: string; input?: unknown }>
  }
  tool_use?: {
    name: string
    input: unknown
  }
  session_id?: string
  cwd?: string
}

export interface PortInfo {
  port: number
  pid: number
  processName: string
}
