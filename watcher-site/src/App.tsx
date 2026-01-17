import { useState, useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'

const INSTALL_COMMAND = 'curl -fsSL https://watcher.umbrellamode.com/install.sh | bash'

function App() {
  const [copied, setCopied] = useState(false)
  const [installCount, setInstallCount] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setInstallCount(data.installs))
      .catch(() => setInstallCount(null))
  }, [])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(INSTALL_COMMAND)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <div className="header-title">/watcher</div>
        <div className="header-subtitle">Monitor your AI coding agents</div>
        {installCount !== null && (
          <div className="install-count">{installCount.toLocaleString()} installs</div>
        )}
      </header>

      {/* Installation */}
      <section className="section">
        <div className="section-label">Installation</div>
        <div className="code-block">
          <code>
            <span className="prompt">$ </span>
            {INSTALL_COMMAND}
          </code>
          <button
            className={`copy-button ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="section-note">macOS only. Requires Claude Code.</p>
      </section>

      {/* Hero Screenshot */}
      <section className="hero">
        <img
          src="/preview.png"
          alt="Watcher app showing active Claude sessions"
          className="hero-image"
        />
      </section>

      {/* Features */}
      <section className="section">
        <div className="section-label">Features</div>
        <ul className="features-list">
          <li>See all active Claude sessions</li>
          <li>Get notified on permissions</li>
          <li>Track what Claude is doing</li>
        </ul>
      </section>

      {/* Footer */}
      <footer className="footer">
        <span>&copy; 2025 umbrellamode</span>
        <a
          href="https://github.com/umbrellamode/watcher"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </footer>
      <Analytics />
    </div>
  )
}

export default App
