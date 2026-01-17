import { EventEmitter } from 'events'
import { exec } from 'child_process'
import { promisify } from 'util'
import type { PortInfo } from '../shared/types'
import { getPortWhitelist } from './settings'

const execAsync = promisify(exec)

export class PortMonitor extends EventEmitter {
  private ports: Map<number, PortInfo> = new Map()
  private scanInterval: NodeJS.Timeout | null = null

  start() {
    this.scan()
    this.scanInterval = setInterval(() => this.scan(), 3000)
  }

  stop() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval)
      this.scanInterval = null
    }
  }

  getPorts(): PortInfo[] {
    return Array.from(this.ports.values()).sort((a, b) => a.port - b.port)
  }

  async scan() {
    try {
      const { stdout } = await execAsync('lsof -i -P -n -sTCP:LISTEN', {
        timeout: 5000,
      })

      const newPorts = new Map<number, PortInfo>()
      const lines = stdout.split('\n').slice(1) // Skip header

      for (const line of lines) {
        if (!line.trim()) continue

        const parts = line.trim().split(/\s+/)
        if (parts.length < 9) continue

        const processName = parts[0]
        const pid = parseInt(parts[1], 10)

        // Parse the port from the NAME column (e.g., "127.0.0.1:8000" or "*:3000")
        const nameCol = parts[8]
        const portMatch = nameCol.match(/:(\d+)$/)
        if (!portMatch) continue

        const port = parseInt(portMatch[1], 10)
        if (isNaN(port) || isNaN(pid)) continue

        // Use port as key to avoid duplicates (same port can appear multiple times)
        if (!newPorts.has(port)) {
          newPorts.set(port, { port, pid, processName })
        }
      }

      // Filter ports by whitelist
      const whitelist = getPortWhitelist()
      const filteredPorts = new Map<number, PortInfo>()
      for (const [port, info] of newPorts) {
        if (whitelist.length === 0 || whitelist.includes(port)) {
          filteredPorts.set(port, info)
        }
      }

      // Check if ports changed
      const changed =
        filteredPorts.size !== this.ports.size ||
        Array.from(filteredPorts.keys()).some(
          (port) =>
            !this.ports.has(port) ||
            this.ports.get(port)!.pid !== filteredPorts.get(port)!.pid
        )

      if (changed) {
        this.ports = filteredPorts
        this.emit('ports-updated', this.getPorts())
      }
    } catch (error) {
      // lsof returns exit code 1 when no listening ports found
      if ((error as NodeJS.ErrnoException).code !== '1') {
        // If no ports found, emit empty array if we had ports before
        if (this.ports.size > 0) {
          this.ports.clear()
          this.emit('ports-updated', [])
        }
      }
    }
  }

  async killProcess(pid: number): Promise<boolean> {
    try {
      process.kill(pid, 'SIGTERM')
      // Give it a moment to terminate, then rescan
      setTimeout(() => this.scan(), 500)
      return true
    } catch (error) {
      console.error('Failed to kill process:', error)
      return false
    }
  }
}
