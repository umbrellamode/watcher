import AutoLaunch from 'auto-launch'
import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

export type WindowMode = 'menubar' | 'standalone'

export interface AppSettings {
  launchAtLogin: boolean
  notificationSound: boolean
  scanInterval: number // in milliseconds
  portWhitelist: number[] // ports to show in Ports tab (default: [3000, 4000])
  windowMode: WindowMode // 'menubar' for tray app, 'standalone' for normal window
}

const defaults: AppSettings = {
  launchAtLogin: true,
  notificationSound: true,
  scanInterval: 3000,
  portWhitelist: [3000, 4000],
  windowMode: 'menubar',
}

// Simple file-based settings store (electron-store has ESM issues)
const settingsPath = path.join(app.getPath('userData'), 'settings.json')

function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8')
      return { ...defaults, ...JSON.parse(data) }
    }
  } catch (error) {
    console.error('Error loading settings:', error)
  }
  return { ...defaults }
}

function saveSettings(settings: AppSettings): void {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
  } catch (error) {
    console.error('Error saving settings:', error)
  }
}

let currentSettings: AppSettings = defaults
let autoLauncher: AutoLaunch | null = null

export function initSettings(): void {
  currentSettings = loadSettings()

  // Initialize auto-launcher
  autoLauncher = new AutoLaunch({
    name: 'AgentWatch',
    path: app.getPath('exe'),
  })

  // Apply launch at login setting
  setLaunchAtLogin(currentSettings.launchAtLogin)
}

export function getSettings(): AppSettings {
  return { ...currentSettings }
}

export function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
  currentSettings[key] = value
  saveSettings(currentSettings)

  // Handle side effects
  if (key === 'launchAtLogin') {
    setLaunchAtLogin(value as boolean)
  }
}

async function setLaunchAtLogin(enabled: boolean): Promise<void> {
  if (!autoLauncher) return

  try {
    const isEnabled = await autoLauncher.isEnabled()
    if (enabled && !isEnabled) {
      await autoLauncher.enable()
    } else if (!enabled && isEnabled) {
      await autoLauncher.disable()
    }
  } catch (error) {
    console.error('Error setting auto-launch:', error)
  }
}

export function getScanInterval(): number {
  return currentSettings.scanInterval
}

export function shouldPlaySound(): boolean {
  return currentSettings.notificationSound
}

export function getPortWhitelist(): number[] {
  return currentSettings.portWhitelist
}

export function getWindowMode(): WindowMode {
  return currentSettings.windowMode
}
