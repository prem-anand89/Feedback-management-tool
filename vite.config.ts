import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // GitHub Pages serves project sites from /<repo-name>/, so assets need that
  // prefix when building in CI. Local dev and other hosts keep the root path.
  base: process.env.GITHUB_ACTIONS ? '/Feedback-management-tool/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
  },
})
