import type { VercelRequest, VercelResponse } from '@vercel/node'
import { redis, INSTALL_COUNT_KEY } from './lib/redis'

const installScript = String.raw`#!/bin/bash
set -e

# Watcher Installer
# Usage: curl -fsSL https://watcher.umbrellamode.com/install.sh | bash

REPO="umbrellamode/watcher"
APP_NAME="Watcher"
INSTALL_DIR="/Applications"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Installing ${APP_NAME}...${NC}"

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    ARCH_SUFFIX="arm64"
elif [ "$ARCH" = "x86_64" ]; then
    ARCH_SUFFIX="x64"
else
    echo -e "${RED}Unsupported architecture: $ARCH${NC}"
    exit 1
fi

echo "Detected architecture: $ARCH_SUFFIX"

# Get latest release
echo "Fetching latest release..."
LATEST_RELEASE=$(curl -s "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$LATEST_RELEASE" ]; then
    echo -e "${RED}Failed to fetch latest release${NC}"
    exit 1
fi

echo "Latest version: $LATEST_RELEASE"

# Download URL - electron-builder uses different naming
if [ "$ARCH_SUFFIX" = "arm64" ]; then
    FILENAME="${APP_NAME}-${LATEST_RELEASE#v}-arm64-mac.zip"
else
    FILENAME="${APP_NAME}-${LATEST_RELEASE#v}-mac.zip"
fi
DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${LATEST_RELEASE}/${FILENAME}"

# Create temp directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Download
echo "Downloading ${APP_NAME}..."
curl -L -o "${TEMP_DIR}/app.zip" "$DOWNLOAD_URL"

# Unzip
echo "Extracting..."
unzip -q "${TEMP_DIR}/app.zip" -d "${TEMP_DIR}"

# Find the .app
APP_PATH=$(find "${TEMP_DIR}" -name "*.app" -maxdepth 2 | head -1)

if [ -z "$APP_PATH" ]; then
    echo -e "${RED}Failed to find app in archive${NC}"
    exit 1
fi

# Remove existing installation
if [ -d "${INSTALL_DIR}/${APP_NAME}.app" ]; then
    echo "Removing existing installation..."
    rm -rf "${INSTALL_DIR}/${APP_NAME}.app"
fi

# Move to Applications
echo "Installing to ${INSTALL_DIR}..."
mv "$APP_PATH" "${INSTALL_DIR}/"

# Remove quarantine attribute
xattr -cr "${INSTALL_DIR}/${APP_NAME}.app" 2>/dev/null || true

echo -e "${GREEN}✓ ${APP_NAME} installed successfully!${NC}"
echo ""
echo "You can now launch ${APP_NAME} from your Applications folder."
echo "It will appear as an icon in your menu bar."
echo ""

# Ask to launch
read -p "Launch ${APP_NAME} now? [Y/n] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    open "${INSTALL_DIR}/${APP_NAME}.app"
fi
`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Track install (fire and forget - don't block response)
  redis.incr(INSTALL_COUNT_KEY).catch(err => {
    console.error('Failed to increment install count:', err)
  })

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Content-Disposition', 'inline; filename="install.sh"')
  res.status(200).send(installScript)
}
