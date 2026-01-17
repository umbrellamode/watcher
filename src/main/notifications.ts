import { Notification, nativeImage, shell } from 'electron'
import type { Agent } from '../shared/types'

interface NotificationState {
  lastPermissionNotifications: Map<string, number> // agentId -> timestamp
  lastCompletionNotifications: Map<string, number> // agentId -> timestamp
  pendingCount: number
}

const state: NotificationState = {
  lastPermissionNotifications: new Map(),
  lastCompletionNotifications: new Map(),
  pendingCount: 0,
}

// Cooldown periods to avoid notification spam
const PERMISSION_COOLDOWN = 30000 // 30 seconds
const COMPLETION_COOLDOWN = 60000 // 60 seconds

export function checkAndNotify(
  currentAgents: Agent[],
  previousAgents: Map<string, Agent>,
  onBadgeUpdate: (count: number) => void
): void {
  for (const agent of currentAgents) {
    const previous = previousAgents.get(agent.id)

    // Check for permission requests (agent changed to waiting state)
    if (agent.waitingForPermission && (!previous || !previous.waitingForPermission)) {
      notifyPermissionNeeded(agent, onBadgeUpdate)
    }

    // Check for completions (agent was running/waiting and is now completed)
    if (previous &&
        (previous.status === 'running' || previous.status === 'waiting') &&
        agent.status === 'completed') {
      notifyCompletion(agent, onBadgeUpdate)
    }
  }
}

function notifyPermissionNeeded(agent: Agent, onBadgeUpdate: (count: number) => void): void {
  const now = Date.now()
  const lastNotification = state.lastPermissionNotifications.get(agent.id) || 0

  // Check cooldown
  if (now - lastNotification < PERMISSION_COOLDOWN) {
    return
  }

  state.lastPermissionNotifications.set(agent.id, now)
  state.pendingCount++
  onBadgeUpdate(state.pendingCount)

  const notification = new Notification({
    title: 'Claude needs approval',
    body: `${agent.projectName}: ${agent.currentActivity || 'Waiting for permission'}`,
    silent: false, // Play sound
    urgency: 'critical',
  })

  notification.on('click', () => {
    // Could open the app or focus the terminal
    shell.beep()
  })

  notification.show()
}

function notifyCompletion(agent: Agent, onBadgeUpdate: (count: number) => void): void {
  const now = Date.now()
  const lastNotification = state.lastCompletionNotifications.get(agent.id) || 0

  // Check cooldown
  if (now - lastNotification < COMPLETION_COOLDOWN) {
    return
  }

  state.lastCompletionNotifications.set(agent.id, now)

  const notification = new Notification({
    title: 'Claude finished',
    body: `${agent.projectName}${agent.gitBranch ? ` (${agent.gitBranch})` : ''}`,
    silent: true, // No sound for completions
  })

  notification.show()

  // Auto-clear completion badge after 5 seconds
  setTimeout(() => {
    if (state.pendingCount > 0) {
      state.pendingCount--
      onBadgeUpdate(state.pendingCount)
    }
  }, 5000)
}

export function clearBadge(onBadgeUpdate: (count: number) => void): void {
  state.pendingCount = 0
  onBadgeUpdate(0)
}

export function getPendingCount(): number {
  return state.pendingCount
}
