import { useEffect } from 'react'
import { useAppStore } from './store'
import { TabBar } from './components/TabBar'
import { AgentList } from './components/AgentList'
import { PortList } from './components/PortList'
import { Footer } from './components/Footer'
import { Settings } from './components/Settings'

export default function App() {
  const { setAgents, setPorts, setLastSyncedAt, setIsLoading, showSettings, setShowSettings, activeTab } = useAppStore()

  useEffect(() => {
    // Initial load
    setIsLoading(true)
    Promise.all([
      window.electronAPI.getAgents(),
      window.electronAPI.getPorts(),
    ]).then(([agents, ports]) => {
      setAgents(agents)
      setPorts(ports)
      setLastSyncedAt(new Date())
      setIsLoading(false)
    })

    // Subscribe to updates
    const unsubscribeAgents = window.electronAPI.onAgentsUpdated((agents) => {
      setAgents(agents)
      setLastSyncedAt(new Date())
    })

    const unsubscribePorts = window.electronAPI.onPortsUpdated((ports) => {
      setPorts(ports)
    })

    return () => {
      unsubscribeAgents()
      unsubscribePorts()
    }
  }, [setAgents, setPorts, setLastSyncedAt, setIsLoading])

  if (showSettings) {
    return (
      <div className="flex flex-col h-full relative">
        <Settings onClose={() => setShowSettings(false)} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <TabBar />
      {activeTab === 'agents' ? <AgentList /> : <PortList />}
      <Footer />
    </div>
  )
}
