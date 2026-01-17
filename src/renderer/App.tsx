import { useEffect } from 'react'
import { useAppStore } from './store'
import { Header } from './components/Header'
import { AgentList } from './components/AgentList'
import { Footer } from './components/Footer'
import { Settings } from './components/Settings'

export default function App() {
  const { setAgents, setLastSyncedAt, setIsLoading, showSettings, setShowSettings } = useAppStore()

  useEffect(() => {
    // Initial load
    setIsLoading(true)
    window.electronAPI.getAgents().then((agents) => {
      setAgents(agents)
      setLastSyncedAt(new Date())
      setIsLoading(false)
    })

    // Subscribe to updates
    const unsubscribe = window.electronAPI.onAgentsUpdated((agents) => {
      setAgents(agents)
      setLastSyncedAt(new Date())
    })

    return unsubscribe
  }, [setAgents, setLastSyncedAt, setIsLoading])

  if (showSettings) {
    return (
      <div className="flex flex-col h-full relative">
        <Settings onClose={() => setShowSettings(false)} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Header />
      <AgentList />
      <Footer />
    </div>
  )
}
