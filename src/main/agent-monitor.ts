import { EventEmitter } from 'events'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import type { Agent, AgentType, AgentStatus, ClaudeLogEntry, ActivityItem } from '../shared/types'

const execAsync = promisify(exec)

export class AgentMonitor extends EventEmitter {
  private agents: Map<string, Agent> = new Map()
  private scanInterval: NodeJS.Timeout | null = null
  private claudeProjectsDir: string
  private claudePidMap: Map<string, number> = new Map() // workingDir -> pid

  constructor() {
    super()
    this.claudeProjectsDir = path.join(os.homedir(), '.claude', 'projects')
  }

  start() {
    this.scan()
    this.scanInterval = setInterval(() => this.scan(), 3000)
    this.watchClaudeProjects()
  }

  stop() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval)
      this.scanInterval = null
    }
  }

  getAgents(): Agent[] {
    // Only return active agents (running or waiting)
    return Array.from(this.agents.values())
      .filter(a => a.status === 'running' || a.status === 'waiting')
      .sort((a, b) => {
        const statusOrder: Record<AgentStatus, number> = {
          running: 0,
          waiting: 1,
          idle: 2,
          completed: 3,
          error: 4,
        }
        return statusOrder[a.status] - statusOrder[b.status]
      })
  }

  async scan() {
    // Clean up stale agents (older than 10 minutes of inactivity)
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000
    for (const [id, agent] of this.agents) {
      if (agent.status === 'idle' || agent.status === 'completed') {
        const lastActivity = agent.activities[0]?.timestamp
        if (lastActivity && new Date(lastActivity).getTime() < tenMinutesAgo) {
          this.agents.delete(id)
        }
      }
    }

    // Update Claude PID map before scanning sessions
    this.claudePidMap = await this.getClaudeProcesses()

    await Promise.all([
      this.scanClaudeSessions(),
      this.scanProcesses(),
    ])
    this.emit('agents-updated', this.getAgents())
  }

  private async scanClaudeSessions() {
    try {
      if (!fs.existsSync(this.claudeProjectsDir)) return

      const projectDirs = fs.readdirSync(this.claudeProjectsDir)

      for (const projectDir of projectDirs) {
        const projectPath = path.join(this.claudeProjectsDir, projectDir)
        const stat = fs.statSync(projectPath)
        if (!stat.isDirectory()) continue

        const files = fs.readdirSync(projectPath)
        const jsonlFiles = files.filter(f => f.endsWith('.jsonl'))

        for (const jsonlFile of jsonlFiles) {
          const filePath = path.join(projectPath, jsonlFile)
          await this.processClaudeLogFile(filePath, projectDir)
        }
      }
    } catch (error) {
      console.error('Error scanning Claude sessions:', error)
    }
  }

  private async processClaudeLogFile(filePath: string, projectDir: string) {
    try {
      const stat = fs.statSync(filePath)
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000

      // Only consider recent sessions (active in last 10 minutes)
      if (stat.mtimeMs < tenMinutesAgo) return

      const sessionId = path.basename(filePath, '.jsonl')
      const agentId = `claude-${sessionId}`

      // Read the file content
      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.trim().split('\n').filter(Boolean)

      if (lines.length === 0) return

      let workingDir = this.decodeProjectPath(projectDir)
      let status: AgentStatus = 'running'
      let lastActivity = 'Active session'
      let waitingForPermission = false
      let isSubagent = false
      const activities: ActivityItem[] = []

      // Check if this is a subagent by looking at the first few entries
      const firstLines = lines.slice(0, 10)
      for (const line of firstLines) {
        try {
          const entry: ClaudeLogEntry = JSON.parse(line)
          // Check for subagent_type in the session initialization or parent_session_id
          if (entry.type === 'init' || entry.type === 'system') {
            const content = JSON.stringify(entry)
            if (content.includes('subagent') || content.includes('parent_session')) {
              isSubagent = true
              break
            }
          }
        } catch {
          // Skip invalid JSON
        }
      }

      // Parse entries to determine status and activities
      const recentLines = lines.slice(-50) // Look at more lines for activity history
      let lastToolUseTime: number | null = null

      for (const line of recentLines) {
        try {
          const entry: ClaudeLogEntry = JSON.parse(line)
          const timestamp = entry.timestamp ? new Date(entry.timestamp) : new Date()

          if (entry.cwd) {
            workingDir = entry.cwd
          }

          // Parse tool uses for activity
          if (entry.message?.content && Array.isArray(entry.message.content)) {
            for (const block of entry.message.content) {
              if (block.type === 'tool_use' && block.name) {
                const activity = this.parseToolUse(block.name, block.input, timestamp)
                if (activity) {
                  activities.unshift(activity) // Add to front (newest first)
                  lastActivity = activity.description
                  lastToolUseTime = timestamp.getTime()
                }
              }
            }
          }

          // Also handle top-level tool_use
          if (entry.tool_use) {
            const activity = this.parseToolUse(entry.tool_use.name, entry.tool_use.input, timestamp)
            if (activity) {
              activities.unshift(activity)
              lastActivity = activity.description
              lastToolUseTime = timestamp.getTime()
            }
          }

          if (entry.type === 'result') {
            status = 'completed'
            lastActivity = 'Task completed'
          }
        } catch {
          // Skip invalid JSON lines
        }
      }

      // Detect if waiting for permission
      // If there's a recent tool use but no result and file hasn't been updated
      const timeSinceModified = Date.now() - stat.mtimeMs
      if (timeSinceModified > 5000 && timeSinceModified < 60000 && lastToolUseTime) {
        const timeSinceLastTool = Date.now() - lastToolUseTime
        if (timeSinceLastTool > 5000 && timeSinceLastTool < 60000) {
          status = 'waiting'
          waitingForPermission = true
        }
      }

      // Only mark as idle if no activity for 2+ minutes
      // This prevents flickering when Claude is thinking or waiting for user input
      if (timeSinceModified > 2 * 60 * 1000) {
        status = 'idle'
      }

      // Get project name and git branch
      const projectName = path.basename(workingDir)
      const gitBranch = await this.getGitBranch(workingDir)

      // Limit activities to 10 most recent
      const limitedActivities = activities.slice(0, 10)

      // Try to find PID for this session
      const pid = this.claudePidMap.get(workingDir)

      const existingAgent = this.agents.get(agentId)
      const agent: Agent = {
        id: agentId,
        type: 'claude',
        name: 'Claude',
        projectName,
        gitBranch,
        workingDirectory: workingDir,
        status,
        currentActivity: lastActivity,
        activities: limitedActivities,
        startedAt: existingAgent?.startedAt || new Date(stat.birthtimeMs),
        progress: null,
        sessionId,
        waitingForPermission,
        pid,
        isSubagent,
      }

      this.agents.set(agentId, agent)
    } catch (error) {
      console.error('Error processing Claude log file:', error)
    }
  }

  private parseToolUse(name: string, input: unknown, timestamp: Date): ActivityItem | null {
    const id = `${name}-${timestamp.getTime()}`
    const inputObj = input as Record<string, unknown>

    switch (name) {
      case 'Read':
        const filePath = inputObj?.file_path as string
        return {
          id,
          type: 'read',
          description: `Reading ${this.shortenPath(filePath)}`,
          target: filePath,
          timestamp,
        }

      case 'Edit':
        const editPath = inputObj?.file_path as string
        return {
          id,
          type: 'edit',
          description: `Editing ${this.shortenPath(editPath)}`,
          target: editPath,
          timestamp,
        }

      case 'Write':
        const writePath = inputObj?.file_path as string
        return {
          id,
          type: 'write',
          description: `Creating ${this.shortenPath(writePath)}`,
          target: writePath,
          timestamp,
        }

      case 'Bash':
        const command = inputObj?.command as string
        const shortCmd = command?.split('\n')[0]?.slice(0, 40) || 'command'
        return {
          id,
          type: 'bash',
          description: `Running ${shortCmd}${command?.length > 40 ? '...' : ''}`,
          target: command,
          timestamp,
        }

      case 'Glob':
      case 'Grep':
        const pattern = inputObj?.pattern as string
        return {
          id,
          type: 'search',
          description: `Searching for ${pattern?.slice(0, 30) || 'files'}`,
          target: pattern,
          timestamp,
        }

      case 'Task':
        const taskDesc = inputObj?.description as string
        return {
          id,
          type: 'other',
          description: taskDesc || 'Running task...',
          timestamp,
        }

      case 'WebFetch':
      case 'WebSearch':
        return {
          id,
          type: 'other',
          description: name === 'WebFetch' ? 'Fetching web content' : 'Searching the web',
          timestamp,
        }

      default:
        return {
          id,
          type: 'other',
          description: `Using ${name}`,
          timestamp,
        }
    }
  }

  private shortenPath(filePath: string | undefined): string {
    if (!filePath) return 'file'
    const parts = filePath.split('/')
    if (parts.length <= 2) return filePath
    return parts.slice(-2).join('/')
  }

  private async getGitBranch(dir: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', {
        cwd: dir,
        timeout: 2000,
      })
      return stdout.trim() || null
    } catch {
      return null
    }
  }

  private decodeProjectPath(encoded: string): string {
    // Claude encodes paths by replacing / with -
    return encoded.replace(/^-/, '/').replace(/-/g, '/')
  }

  private async scanProcesses() {
    try {
      // Scan for other AI agents via process list
      const { stdout } = await execAsync('ps aux')
      const lines = stdout.split('\n')

      for (const line of lines) {
        const lowerLine = line.toLowerCase()

        // Detect Cursor Agent
        if (lowerLine.includes('cursor') && lowerLine.includes('agent')) {
          this.upsertProcessAgent('cursor', 'Cursor Agent', line)
        }

        // Detect Aider
        if (lowerLine.includes('aider') && !lowerLine.includes('raider')) {
          this.upsertProcessAgent('aider', 'Aider', line)
        }

        // Detect GitHub Copilot CLI
        if (lowerLine.includes('gh') && lowerLine.includes('copilot')) {
          this.upsertProcessAgent('copilot', 'GitHub Copilot', line)
        }
      }
    } catch (error) {
      console.error('Error scanning processes:', error)
    }
  }

  private upsertProcessAgent(type: AgentType, name: string, processLine: string) {
    const parts = processLine.trim().split(/\s+/)
    const pid = parseInt(parts[1], 10)
    if (isNaN(pid)) return

    const agentId = `${type}-${pid}`

    if (!this.agents.has(agentId)) {
      const agent: Agent = {
        id: agentId,
        type,
        name,
        projectName: 'Unknown',
        gitBranch: null,
        workingDirectory: '~',
        status: 'running',
        currentActivity: 'Active',
        activities: [],
        startedAt: new Date(),
        progress: null,
        pid,
      }
      this.agents.set(agentId, agent)
    }
  }

  private watchClaudeProjects() {
    try {
      if (!fs.existsSync(this.claudeProjectsDir)) {
        fs.mkdirSync(this.claudeProjectsDir, { recursive: true })
      }

      fs.watch(this.claudeProjectsDir, { recursive: true }, (eventType, filename) => {
        if (filename?.endsWith('.jsonl')) {
          this.scan()
        }
      })
    } catch (error) {
      console.error('Error watching Claude projects directory:', error)
    }
  }

  // Get Claude Code processes and their working directories
  private async getClaudeProcesses(): Promise<Map<string, number>> {
    const pidMap = new Map<string, number>()
    try {
      // Use lsof to find claude processes and their cwd
      // -c claude matches processes with "claude" in the name
      // -d cwd shows only the current working directory file descriptor
      const { stdout } = await execAsync('lsof -c claude -d cwd -Fn 2>/dev/null || true', {
        timeout: 5000,
      })

      const lines = stdout.split('\n')
      let currentPid: number | null = null

      for (const line of lines) {
        if (line.startsWith('p')) {
          // Process ID line
          currentPid = parseInt(line.slice(1), 10)
        } else if (line.startsWith('n') && currentPid) {
          // Name (path) line - this is the working directory
          const workingDir = line.slice(1)
          if (workingDir && !pidMap.has(workingDir)) {
            pidMap.set(workingDir, currentPid)
          }
        }
      }
    } catch (error) {
      // lsof may fail if no claude processes are running
      console.debug('No Claude processes found or lsof failed:', error)
    }
    return pidMap
  }

  // Kill an agent by its ID
  async killAgent(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId)
    if (!agent) {
      console.error('Agent not found:', agentId)
      return false
    }

    const pid = agent.pid
    if (!pid) {
      console.error('No PID for agent:', agentId)
      return false
    }

    try {
      process.kill(pid, 'SIGTERM')
      // Give it a moment, then rescan
      setTimeout(() => this.scan(), 500)
      return true
    } catch (error) {
      console.error('Failed to kill agent:', error)
      return false
    }
  }
}
