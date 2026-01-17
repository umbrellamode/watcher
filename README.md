# Watcher

Monitor your AI coding agents from the menu bar.

## Features

- See all active Claude Code sessions
- Get notified on permission requests
- Track what Claude is doing in real-time

## Installation

```bash
curl -fsSL https://watcher.umbrellamode.com/install.sh | bash
```

macOS only. Requires [Claude Code](https://claude.ai/code).

## Manual Installation

Download the latest release from [Releases](https://github.com/umbrellamode/watcher/releases) and drag Watcher.app to your Applications folder.

## How It Works

Watcher monitors Claude Code sessions running on your machine and displays their status in your menu bar. When Claude requests permissions, you'll get a notification so you can respond quickly.

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build
```

## Inspiration

Inspired by [@mattprd's tweet](https://x.com/mattprd/status/2012424118595907594).

## License

MIT
