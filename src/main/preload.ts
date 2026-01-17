import { contextBridge, ipcRenderer } from 'electron'
import type { Agent, PortInfo } from '../shared/types'

export interface AppSettings {
  launchAtLogin: boolean
  notificationSound: boolean
  scanInterval: number
}

contextBridge.exposeInMainWorld('electronAPI', {
  getAgents: (): Promise<Agent[]> => ipcRenderer.invoke('get-agents'),
  refreshAgents: (): Promise<Agent[]> => ipcRenderer.invoke('refresh-agents'),
  onAgentsUpdated: (callback: (agents: Agent[]) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, agents: Agent[]) => callback(agents)
    ipcRenderer.on('agents-updated', subscription)
    return () => ipcRenderer.removeListener('agents-updated', subscription)
  },
  getPorts: (): Promise<PortInfo[]> => ipcRenderer.invoke('ports:get'),
  killPort: (pid: number): Promise<boolean> => ipcRenderer.invoke('ports:kill', pid),
  onPortsUpdated: (callback: (ports: PortInfo[]) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, ports: PortInfo[]) => callback(ports)
    ipcRenderer.on('ports-updated', subscription)
    return () => ipcRenderer.removeListener('ports-updated', subscription)
  },
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('get-settings'),
  setSetting: (key: string, value: unknown): Promise<void> => ipcRenderer.invoke('set-setting', key, value),
})

declare global {
  interface Window {
    electronAPI: {
      getAgents: () => Promise<Agent[]>
      refreshAgents: () => Promise<Agent[]>
      onAgentsUpdated: (callback: (agents: Agent[]) => void) => () => void
      getPorts: () => Promise<PortInfo[]>
      killPort: (pid: number) => Promise<boolean>
      onPortsUpdated: (callback: (ports: PortInfo[]) => void) => () => void
      getSettings: () => Promise<AppSettings>
      setSetting: (key: string, value: unknown) => Promise<void>
    }
  }
}
