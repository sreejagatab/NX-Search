import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Stub navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  configurable: true,
})

// Stub import.meta.env
Object.assign(import.meta, {
  env: {
    VITE_NEURONX_API_URL: 'http://localhost:8000',
    VITE_NEURONX_API_KEY: 'test-key',
  },
})
