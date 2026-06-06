import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',   // Safari iOS 16+ / Chrome Android 105+
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
  test: {
    environment: 'node',
  },
})
