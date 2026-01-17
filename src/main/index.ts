import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen } from 'electron'
import * as path from 'path'
import { AgentMonitor } from './agent-monitor'
import { checkAndNotify, clearBadge } from './notifications'
import { initSettings, getSettings, setSetting } from './settings'
import type { Agent } from '../shared/types'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let agentMonitor: AgentMonitor | null = null
let previousAgents: Map<string, Agent> = new Map()

function createTrayIcon() {
  // 18x18 sparkle icon for menu bar
  const icon18 = 'iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAfUlEQVR4nL2S0QmAMAwFbxa/RFdwJ0ewK7iTI1j65SyRQgpFrKIpffA+c+FIoGFGYKgBclpzPBBqaInWpOcykLNqiTb80XEXiGgPYAWmP8NS6C20A2Zg+wDyurx4hCeofxsuxWeQnUrnXyygvtZDonomrZSoZ9JKiT8W2yYnnfg/z3+XbRwAAAAASUVORK5CYII='

  // 36x36 for retina
  const icon36 = 'iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAzUlEQVR4nO3XwQ3CMAxG4TcLJ0RXYCdGwCuwEyNg9cQsRkhByiEERJv6P2DJ99d+VZvCf7aZCTggNFZWZhyYEeKKshJsVgWZCleUnZW4QoHNGkGmwhXZbFMjJpXNOkGmwhVbs03l6nsxr70DF+CYGRGj4taIiKVxIyPil7gdcAKuGwZ5uQkfXxMj4/zbiJFxvjRijTgfFfFueg//DbFPxzkjaN8JSjsTuQpXjy2Fq8eW/ufhKlwttlSuFls6V80mwVWzSXDVZ6nn/ofR8wC9Zf8Z02L/iwAAAABJRU5ErkJggg=='

  const icon = nativeImage.createFromDataURL(`data:image/png;base64,${icon18}`)
  icon.addRepresentation({
    scaleFactor: 2,
    dataURL: `data:image/png;base64,${icon36}`
  })
  icon.setTemplateImage(true)
  return icon
}

function updateTrayBadge(count: number) {
  if (!tray) return

  if (count > 0) {
    // On macOS, we can set a badge on the dock (if visible) or use title
    tray.setTitle(String(count))
  } else {
    tray.setTitle('')
  }
}

function createWindow() {
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize

  mainWindow = new BrowserWindow({
    width: 360,
    height: 500,
    minWidth: 320,
    minHeight: 300,
    maxWidth: 400,
    maxHeight: 600,
    x: screenWidth - 380,
    y: 0,
    frame: false,
    transparent: true,
    vibrancy: 'menu',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    show: false,
    skipTaskbar: true,
    resizable: true,
    alwaysOnTop: false,
    roundedCorners: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:4444')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'))
  }

  mainWindow.on('blur', () => {
    // Hide window when it loses focus (clicking outside)
    if (mainWindow && !mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function toggleWindow() {
  if (!mainWindow) {
    createWindow()
  }

  if (mainWindow!.isVisible()) {
    mainWindow!.hide()
  } else {
    showWindow()
  }
}

function showWindow() {
  if (!mainWindow) return

  // Clear badge when window is shown
  clearBadge(updateTrayBadge)

  // Position window near the tray icon
  const trayBounds = tray?.getBounds()
  const windowBounds = mainWindow.getBounds()

  if (trayBounds) {
    // Center window horizontally under the tray icon
    let x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2)
    let y = Math.round(trayBounds.y + trayBounds.height + 4)

    // Keep window on screen
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
    if (x + windowBounds.width > screenWidth) {
      x = screenWidth - windowBounds.width - 10
    }
    if (x < 10) x = 10
    if (y + windowBounds.height > screenHeight) {
      y = screenHeight - windowBounds.height - 10
    }

    mainWindow.setPosition(x, y)
  }

  mainWindow.show()
  mainWindow.focus()
}

function createTray() {
  const icon = createTrayIcon()
  tray = new Tray(icon)
  tray.setToolTip('AgentWatch - AI Agent Monitor')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show AgentWatch',
      click: () => showWindow()
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      }
    },
  ])

  tray.on('click', () => {
    toggleWindow()
  })

  tray.on('right-click', () => {
    tray?.popUpContextMenu(contextMenu)
  })
}

app.whenReady().then(() => {
  // Initialize settings (including auto-launch)
  initSettings()

  // Hide dock icon on macOS (menu bar app style)
  if (process.platform === 'darwin') {
    app.dock?.hide()
  }

  createTray()
  createWindow()

  agentMonitor = new AgentMonitor()
  agentMonitor.start()

  agentMonitor.on('agents-updated', (agents: Agent[]) => {
    mainWindow?.webContents.send('agents-updated', agents)

    // Check for notifications
    checkAndNotify(agents, previousAgents, updateTrayBadge)

    // Update previous agents map
    previousAgents.clear()
    for (const agent of agents) {
      previousAgents.set(agent.id, { ...agent })
    }

    // Update tray tooltip with active count
    const activeCount = agents.filter((a: Agent) =>
      a.status === 'running' || a.status === 'waiting'
    ).length
    tray?.setToolTip(`AgentWatch - ${activeCount} active agent${activeCount !== 1 ? 's' : ''}`)
  })

  ipcMain.handle('get-agents', () => {
    return agentMonitor?.getAgents() || []
  })

  ipcMain.handle('refresh-agents', async () => {
    await agentMonitor?.scan()
    return agentMonitor?.getAgents() || []
  })

  ipcMain.handle('get-settings', () => {
    return getSettings()
  })

  ipcMain.handle('set-setting', (_event, key: string, value: unknown) => {
    setSetting(key as keyof ReturnType<typeof getSettings>, value as never)
  })

  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow()
    }
    showWindow()
  })
})

app.on('window-all-closed', () => {
  // Don't quit on macOS when window is closed (tray app stays running)
  if (process.platform !== 'darwin') {
    agentMonitor?.stop()
    app.quit()
  }
})

app.on('before-quit', () => {
  agentMonitor?.stop()
})
