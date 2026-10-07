import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Served from GitHub Pages at https://<user>.github.io/EDIViewer/ — keep `base`
// in sync with the repository name.
export default defineConfig({
  base: '/EDIViewer/',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500,
  },
})
