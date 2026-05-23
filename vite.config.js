import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT for GitHub Pages:
// The `base` must match your repository name so assets load correctly.
// If your repo is  https://github.com/<user>/verdant-bills
// then base should be '/verdant-bills/'.
//
// We read it from an env var so you don't have to edit code:
//   - Local dev / user.github.io root repo:  base = '/'
//   - Project repo on GitHub Pages:           set VITE_BASE=/your-repo-name/
const base = process.env.VITE_BASE || '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
})
