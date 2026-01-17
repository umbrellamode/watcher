# AgentWatch UI Overhaul Design

## Overview

Transform AgentWatch from a basic window app into a polished macOS menu bar application with native styling, meaningful activity display, and proactive notifications.

## Goals

1. Convert to menu bar app (no dock icon)
2. Follow macOS native visual style
3. Show meaningful activity text instead of "Active session"
4. Notify when Claude asks for permissions (sound + badge)
5. Notify when tasks complete (silent notification)
6. Differentiate sessions by project folder + git branch
7. Add detail view showing recent tool calls
8. Launch at login by default

## Architecture

### Menu Bar App

- Use Electron `Tray` API for menu bar icon
- Frameless popup window with vibrancy blur
- Position anchored below tray icon
- Click outside to hide (app stays running)
- `app.dock.hide()` on macOS to remove dock icon

### Icon States

- Default: Monochrome template icon (works in light/dark mode)
- Attention: Red badge dot when permissions pending
- Badge count: Number of unread notifications

### Window Specs

- Width: 320px
- Height: Adapts to content, max 500px with scroll
- Rounded corners: 12px
- Vibrancy: `menu` for native blur effect

## UI Design

### Visual Style (macOS Native)

- Light/dark mode follows system
- SF Pro system font
- Native vibrancy blur background
- Subtle separators, no heavy borders
- 12px rounded corners on popup

### Agent Cards

Each card displays:
- Left: Agent icon with status dot overlay
- Center top: "Claude · projectname (branch)"
- Center bottom: Activity text in secondary color
- Right: Duration timer (0:42)
- Bottom: Indeterminate progress bar when running

### Status Dot Colors

- Green: Running/active
- Yellow: Waiting for permission
- Gray: Idle/completed

### Header

- "AI Agents" title
- Pill showing active count: "3 active"
- Refresh button
- Settings gear

### Footer

- "Last synced just now" timestamp

## Detail View

### Interaction

- Click card to expand inline
- Click again to collapse
- Only one card expanded at a time

### Content

Shows last 5-10 actions from JSONL:
- Relative timestamp: "2m ago"
- Action icon + description:
  - "Read src/components/Header.tsx"
  - "Edited src/App.tsx"
  - "Ran npm test"
  - "Searched for *.tsx files"

### Visual Treatment

- Compact list with muted text
- Icons per tool type
- Max height with scroll
- Working directory path at bottom

## Notification System

### Permission Detection

Watch JSONL for:
- `tool_use` entries followed by delay (waiting for approval)
- Permission-related text patterns
- File stops updating but session not complete

### Permission Notification

1. Menu bar icon shows red badge dot
2. Increment badge count
3. macOS notification: "Claude needs approval"
4. Play system alert sound

### Completion Notification

1. Silent notification: "Claude finished"
2. Badge clears after 5 seconds or popup opened

### Badge Behavior

- Shows unread count
- Clears when popup opened and viewed
- Permission badges persist until handled

## Agent Differentiation

Display format: "Claude · projectname (branch)"

Examples:
- "Claude · agentstatus (main)"
- "Claude · my-website (feature/auth)"

Get git branch from working directory using `git rev-parse --abbrev-ref HEAD`.

## Settings Panel

Minimal settings:
- Launch at login: toggle (default on)
- Notification sound: toggle
- Scan interval: 1s, 5s, 10s dropdown

## Launch at Login

- Use `auto-launch` package or electron-builder config
- Register as login item on first run
- Toggle available in settings
- Uses macOS `LSSharedFileList` API

## Files to Modify/Create

### Main Process
- `src/main/index.ts` - Tray setup, window management
- `src/main/agent-monitor.ts` - Git branch detection, permission detection
- `src/main/notifications.ts` - New file for notification logic

### Renderer
- `src/renderer/App.tsx` - Layout updates
- `src/renderer/components/AgentCard.tsx` - New card design with expansion
- `src/renderer/components/Header.tsx` - Native styling
- `src/renderer/components/ActivityFeed.tsx` - New component
- `src/renderer/store.ts` - Add notification state, expanded card state
- `src/shared/types.ts` - Add activity history, notification types

### Assets
- Menu bar icon (template image for light/dark mode)
- Agent type icons (Claude, Cursor, Copilot, etc.)
