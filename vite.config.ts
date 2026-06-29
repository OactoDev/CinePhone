import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// HTTPS + LAN host are required so phones can grant motion-sensor permission.
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true, // expose on the local network -> https://<lan-ip>:5173
  },
})
