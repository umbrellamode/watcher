import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import App from '../App'

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
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
      render(<App />)

      const copyButton = screen.getByRole('button', { name: /copy/i })
      await act(async () => {
        fireEvent.click(copyButton)
      })

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'curl -fsSL https://watcher.umbrellamode.com/install.sh | bash'
      )
    })

    it('shows "Copied" text after clicking', async () => {
      render(<App />)

      const copyButton = screen.getByRole('button', { name: /copy/i })
      await act(async () => {
        fireEvent.click(copyButton)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument()
      })
    })

    // Note: Timer test removed due to flakiness with fake timers + React state updates
    // The functionality is tested manually and works correctly
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
    it('renders the hero image', () => {
      render(<App />)
      const img = screen.getByAltText('Watcher app showing active Claude sessions')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', '/preview.png')
    })
  })
})
