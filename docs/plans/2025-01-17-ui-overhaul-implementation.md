# Implementation Plan: AgentWatch UI Overhaul

## Phase 1: Menu Bar App Conversion

### 1.1 Update main process for tray
- [ ] Modify `src/main/index.ts` to create Tray instead of showing window
- [ ] Create frameless BrowserWindow for popup
- [ ] Position popup below tray icon on click
- [ ] Hide dock icon with `app.dock.hide()`
- [ ] Handle click-outside to hide popup

### 1.2 Create menu bar icon
- [ ] Create template icon PNG (22x22 for 1x, 44x44 for 2x)
- [ ] Add to `src/main/assets/` directory
- [ ] Icon should be monochrome for macOS template image

## Phase 2: Native macOS Styling

### 2.1 Update renderer styles
- [ ] Add vibrancy/transparency to window
- [ ] Update Tailwind config for macOS-like colors
- [ ] Use system font (SF Pro via -apple-system)
- [ ] Update Header component for native look
- [ ] Update Footer component
- [ ] Add proper dark/light mode support

### 2.2 Redesign AgentCard
- [ ] New layout: icon | name+activity | duration
- [ ] Add status dot overlay on icon
- [ ] Add indeterminate progress bar
- [ ] Style for native macOS appearance

## Phase 3: Meaningful Activity Text

### 3.1 Improve JSONL parsing
- [ ] Update `agent-monitor.ts` to extract better activity descriptions
- [ ] Parse tool_use entries for specific tool names and targets
- [ ] Format activity text: "Editing src/App.tsx...", "Running npm test..."
- [ ] Store recent activities (last 10) per agent

### 3.2 Add git branch detection
- [ ] Add function to get git branch from working directory
- [ ] Update Agent type to include branch field
- [ ] Format display as "projectname (branch)"

## Phase 4: Detail View

### 4.1 Create ActivityFeed component
- [ ] New component showing list of recent actions
- [ ] Icons per tool type
- [ ] Relative timestamps
- [ ] Scrollable if many items

### 4.2 Add card expansion
- [ ] Update store with expandedAgentId state
- [ ] Update AgentCard to expand/collapse on click
- [ ] Show ActivityFeed when expanded
- [ ] Animate expansion smoothly

## Phase 5: Notification System

### 5.1 Permission detection
- [ ] Update agent-monitor.ts to detect waiting state
- [ ] Track time since last JSONL write
- [ ] Detect tool_use without subsequent result
- [ ] Add `waitingForPermission` flag to Agent type

### 5.2 Implement notifications
- [ ] Create `src/main/notifications.ts`
- [ ] Use Electron `Notification` API
- [ ] Play sound for permission requests
- [ ] Silent notifications for completions
- [ ] Update tray icon badge on notifications

### 5.3 Badge management
- [ ] Track notification count in main process
- [ ] Update tray icon with badge
- [ ] Clear badges when popup opened
- [ ] IPC for renderer to mark as read

## Phase 6: Settings & Launch at Login

### 6.1 Auto-launch setup
- [ ] Add `auto-launch` package
- [ ] Enable by default on first run
- [ ] Store preference in electron-store or similar

### 6.2 Settings panel
- [ ] Create Settings component
- [ ] Toggle: Launch at login
- [ ] Toggle: Notification sounds
- [ ] Dropdown: Scan interval
- [ ] Wire up to main process via IPC

## Build Order

Execute in this order to maintain working app throughout:

1. Phase 1 (Menu bar) - Core architecture change
2. Phase 2 (Styling) - Visual foundation
3. Phase 3 (Activity text) - Data improvements
4. Phase 4 (Detail view) - UI enhancement
5. Phase 5 (Notifications) - Key feature
6. Phase 6 (Settings) - Polish

## Testing Checkpoints

After each phase:
- Run `npm run dev` to verify app launches
- Check for TypeScript errors
- Verify existing functionality still works
- Test new features added in that phase
