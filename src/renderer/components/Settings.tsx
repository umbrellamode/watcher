import { useState, useEffect } from 'react'
import { Cross2Icon } from '@radix-ui/react-icons'

type WindowMode = 'menubar' | 'standalone'

interface AppSettings {
  launchAtLogin: boolean
  notificationSound: boolean
  scanInterval: number
  portWhitelist: number[]
  windowMode: WindowMode
}

interface SettingsProps {
  onClose: () => void
}

export function Settings({ onClose }: SettingsProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    window.electronAPI.getSettings().then(setSettings)
  }, [])

  const handleToggle = async (key: keyof AppSettings) => {
    if (!settings) return
    const newValue = !settings[key]
    await window.electronAPI.setSetting(key, newValue)
    setSettings({ ...settings, [key]: newValue })
  }

  const handleIntervalChange = async (interval: number) => {
    if (!settings) return
    await window.electronAPI.setSetting('scanInterval', interval)
    setSettings({ ...settings, scanInterval: interval })
  }

  const handlePortWhitelistChange = async (value: string) => {
    if (!settings) return
    const ports = value
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n > 0 && n <= 65535)
    await window.electronAPI.setSetting('portWhitelist', ports)
    setSettings({ ...settings, portWhitelist: ports })
  }

  const handleWindowModeChange = async (mode: WindowMode) => {
    if (!settings) return
    await window.electronAPI.setSetting('windowMode', mode)
    setSettings({ ...settings, windowMode: mode })
  }

  if (!settings) return null

  return (
    <div className="flex flex-col h-full">
      <header className="drag-region flex items-center justify-between mb-6">
        <span className="text-[--color-text-primary] font-medium">settings</span>
        <button onClick={onClose} className="no-drag icon-btn">
          <Cross2Icon className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 space-y-5">
        <SettingToggle
          label="launch at login"
          checked={settings.launchAtLogin}
          onChange={() => handleToggle('launchAtLogin')}
        />

        <SettingToggle
          label="notification sound"
          checked={settings.notificationSound}
          onChange={() => handleToggle('notificationSound')}
        />

        <div className="flex items-center justify-between">
          <span className="text-[--color-text-secondary]">scan interval</span>
          <select
            value={settings.scanInterval}
            onChange={(e) => handleIntervalChange(Number(e.target.value))}
            className="text-[11px] bg-[--color-bg-card] border-none rounded px-2 py-1 text-[--color-text-primary] outline-none"
          >
            <option value={1000}>1s</option>
            <option value={3000}>3s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
          </select>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[--color-text-secondary]">port whitelist</span>
          </div>
          <input
            type="text"
            defaultValue={settings.portWhitelist.join(', ')}
            onBlur={(e) => handlePortWhitelistChange(e.target.value)}
            placeholder="3000, 4000"
            className="w-full text-[11px] bg-[--color-bg-card] border-none rounded px-2 py-1.5 text-[--color-text-primary] outline-none placeholder:text-[--color-text-muted]"
          />
          <p className="text-[10px] text-[--color-text-muted]">
            comma-separated ports to show (empty = all)
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[--color-text-secondary]">window mode</span>
            <select
              value={settings.windowMode}
              onChange={(e) => handleWindowModeChange(e.target.value as WindowMode)}
              className="text-[11px] bg-[--color-bg-card] border-none rounded px-2 py-1 text-[--color-text-primary] outline-none"
            >
              <option value="menubar">menubar</option>
              <option value="standalone">standalone</option>
            </select>
          </div>
          <p className="text-[10px] text-[--color-text-muted]">
            restart app to apply
          </p>
        </div>
      </div>

      <footer className="mt-6 text-[10px] text-[--color-text-muted] text-center">
        agentwatch v1.0.0
      </footer>
    </div>
  )
}

function SettingToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[--color-text-secondary]">{label}</span>
      <button
        onClick={onChange}
        className={`relative w-8 h-5 rounded-full transition-colors ${
          checked ? 'bg-[--color-success]' : 'bg-[--color-bg-card]'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-3.5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}
