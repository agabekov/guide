import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Set base so assets load correctly on GitHub Pages: https://<user>.github.io/<repo>/
  base: '/guide/',
  plugins: [react()],
})
