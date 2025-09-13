import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { client_port } from '../constants'
// TODO: client port and server port should be different
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: client_port,
  }
})
