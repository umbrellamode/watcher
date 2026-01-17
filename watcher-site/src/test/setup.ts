import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined)
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
})

// Export for tests to access
export { mockWriteText }
