/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Must stay absolute: invite links live at /j/<code>, and a relative base
  // would make that page ask for /j/assets/... and render a blank screen.
  base: '/',
  test: {
    // Service tests run in plain node; only the component tests need a DOM,
    // so the environment is chosen per file with a docblock comment.
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
  },
})
