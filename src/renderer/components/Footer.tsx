import { useAppStore } from '../store'

export function Footer() {
  const { lastSyncedAt } = useAppStore()

  const getLastSyncedText = () => {
    if (!lastSyncedAt) return 'never synced'
    const now = Date.now()
    const diff = now - new Date(lastSyncedAt).getTime()
    const seconds = Math.floor(diff / 1000)
    if (seconds < 5) return 'synced just now'
    if (seconds < 60) return `synced ${seconds}s ago`
    return `synced ${Math.floor(seconds / 60)}m ago`
  }

  return (
    <footer className="flex items-center justify-between mt-4 text-[10px]">
      <span className="text-[--color-text-muted]">{getLastSyncedText()}</span>
      <button className="link">view all</button>
    </footer>
  )
}
