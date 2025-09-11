import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// TODO: add the port constant
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  }
})
