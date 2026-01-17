import { Cross2Icon } from '@radix-ui/react-icons'
import type { PortInfo } from '../../shared/types'

interface PortCardProps {
  port: PortInfo
}

export function PortCard({ port }: PortCardProps) {
  const handleKill = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await window.electronAPI.killPort(port.pid)
  }

  return (
    <div className="port-card">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="port-number">{port.port}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[--color-text-primary] truncate">
            {port.processName}
          </div>
          <div className="text-[--color-text-muted] text-[10px]">
            PID {port.pid}
          </div>
        </div>
      </div>
      <button
        onClick={handleKill}
        className="kill-btn"
        title="Kill process"
      >
        <Cross2Icon className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
