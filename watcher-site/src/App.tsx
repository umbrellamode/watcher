import { useState } from 'react'
import { Analytics } from '@vercel/analytics/react'

const INSTALL_COMMAND = 'curl -fsSL https://watcher.umbrellamode.com/install.sh | bash'

function App() {
  const [copied, setCopied] = useState(false)

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
      </header>

      {/* Hero Screenshot */}
      <section className="hero">
        <div className="hero-placeholder">
          [App preview]
        </div>
      </section>

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
