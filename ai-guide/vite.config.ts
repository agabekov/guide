import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  // Set base so assets load correctly on GitHub Pages: https://<user>.github.io/<repo>/
  base: '/guide/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        question: resolve(__dirname, 'question.html'),
        assistant: resolve(__dirname, 'assistant.html'),
      },
    },
  },
})
