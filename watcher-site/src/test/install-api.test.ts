import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// Read the install script file content for testing
// We read the TypeScript source to validate the bash script content
const apiFilePath = join(__dirname, '../../api/install.sh.ts')
const apiFileContent = readFileSync(apiFilePath, 'utf-8')

// Extract the script content between String.raw` and the closing `
const scriptMatch = apiFileContent.match(/String\.raw`([\s\S]*?)`/)
const installScript = scriptMatch ? scriptMatch[1] : ''

const EXPECTED_REPO = 'umbrellamode/watcher'
const EXPECTED_APP_NAME = 'Watcher'

describe('Install Script API', () => {
  describe('Install Script Content', () => {
    it('should contain the correct repository', () => {
      expect(installScript).toContain(`REPO="${EXPECTED_REPO}"`)
    })

    it('should contain the correct app name', () => {
      expect(installScript).toContain(`APP_NAME="${EXPECTED_APP_NAME}"`)
    })

    it('should be a valid bash script', () => {
      expect(installScript).toMatch(/^#!\/bin\/bash/)
      expect(installScript).toContain('set -e')
    })

    it('should detect architecture', () => {
      expect(installScript).toContain('uname -m')
      expect(installScript).toContain('arm64')
      expect(installScript).toContain('x86_64')
    })

    it('should fetch latest release from GitHub', () => {
      expect(installScript).toContain('api.github.com/repos')
      expect(installScript).toContain('releases/latest')
    })

    it('should install to Applications folder', () => {
      expect(installScript).toContain('INSTALL_DIR="/Applications"')
    })

    it('should handle cleanup on exit', () => {
      expect(installScript).toContain('trap')
      expect(installScript).toContain('rm -rf')
    })

    it('should remove quarantine attribute', () => {
      expect(installScript).toContain('xattr -cr')
    })

    it('should contain install URL comment', () => {
      expect(installScript).toContain('watcher.umbrellamode.com/install.sh')
    })

    it('should support arm64 architecture', () => {
      expect(installScript).toContain('arm64-mac.zip')
    })

    it('should have colored output support', () => {
      expect(installScript).toContain('RED=')
      expect(installScript).toContain('GREEN=')
      expect(installScript).toContain('BLUE=')
    })
  })

  describe('API Handler Structure', () => {
    it('should export a default handler function', () => {
      expect(apiFileContent).toContain('export default async function handler')
    })

    it('should set Content-Type header', () => {
      expect(apiFileContent).toContain("'Content-Type'")
      expect(apiFileContent).toContain('text/plain')
    })

    it('should set Content-Disposition header', () => {
      expect(apiFileContent).toContain("'Content-Disposition'")
      expect(apiFileContent).toContain('install.sh')
    })

    it('should return 200 status', () => {
      expect(apiFileContent).toContain('status(200)')
    })
  })
})
