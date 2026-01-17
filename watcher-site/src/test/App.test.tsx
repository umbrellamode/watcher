import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { mockWriteText } from './setup'

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWriteText.mockClear()
  })

  describe('Header', () => {
    it('renders the header title', () => {
      render(<App />)
      expect(screen.getByText('/watcher')).toBeInTheDocument()
    })

    it('renders the subtitle', () => {
      render(<App />)
      expect(screen.getByText('Monitor your AI coding agents')).toBeInTheDocument()
    })
  })

  describe('Installation Section', () => {
    it('renders the installation label', () => {
      render(<App />)
      expect(screen.getByText('Installation')).toBeInTheDocument()
    })

    it('renders the install command', () => {
      render(<App />)
      expect(screen.getByText(/curl -fsSL https:\/\/watcher\.umbrellamode\.com\/install\.sh \| bash/)).toBeInTheDocument()
    })

    it('renders the macOS note', () => {
      render(<App />)
      expect(screen.getByText('macOS only. Requires Claude Code.')).toBeInTheDocument()
    })

    it('renders the command prompt', () => {
      render(<App />)
      expect(screen.getByText('$')).toBeInTheDocument()
    })
  })

  describe('Copy Button', () => {
    it('renders a copy button', () => {
      render(<App />)
      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
    })

    it('copies the install command when clicked', async () => {
      const user = userEvent.setup()
      render(<App />)

      const copyButton = screen.getByRole('button', { name: /copy/i })
      await user.click(copyButton)

      expect(mockWriteText).toHaveBeenCalledWith(
        'curl -fsSL https://watcher.umbrellamode.com/install.sh | bash'
      )
    })

    it('shows "Copied" text after clicking', async () => {
      const user = userEvent.setup()
      render(<App />)

      const copyButton = screen.getByRole('button', { name: /copy/i })
      await user.click(copyButton)

      expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument()
    })

    it('reverts to "Copy" after 2 seconds', async () => {
      vi.useFakeTimers()
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<App />)

      const copyButton = screen.getByRole('button', { name: /copy/i })
      await user.click(copyButton)

      expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument()

      // Advance timers and wait for state update
      await vi.advanceTimersByTimeAsync(2100)

      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()

      vi.useRealTimers()
    })
  })

  describe('Features Section', () => {
    it('renders the features label', () => {
      render(<App />)
      expect(screen.getByText('Features')).toBeInTheDocument()
    })

    it('renders all feature items', () => {
      render(<App />)
      expect(screen.getByText('See all active Claude sessions')).toBeInTheDocument()
      expect(screen.getByText('Get notified on permissions')).toBeInTheDocument()
      expect(screen.getByText('Track what Claude is doing')).toBeInTheDocument()
    })
  })

  describe('Footer', () => {
    it('renders copyright text', () => {
      render(<App />)
      expect(screen.getByText(/© 2025 umbrellamode/)).toBeInTheDocument()
    })

    it('renders GitHub link', () => {
      render(<App />)
      const githubLink = screen.getByRole('link', { name: /github/i })
      expect(githubLink).toBeInTheDocument()
      expect(githubLink).toHaveAttribute('href', 'https://github.com/umbrellamode/watcher')
    })

    it('GitHub link opens in new tab', () => {
      render(<App />)
      const githubLink = screen.getByRole('link', { name: /github/i })
      expect(githubLink).toHaveAttribute('target', '_blank')
      expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  describe('Hero Section', () => {
    it('renders the hero placeholder', () => {
      render(<App />)
      expect(screen.getByText('[App preview]')).toBeInTheDocument()
    })
  })
})
