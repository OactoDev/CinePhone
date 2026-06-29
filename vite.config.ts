import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { awsApi } from './server/awsApi.ts'
import { falProxy } from './server/falProxy.ts'
import { lumaProxy } from './server/lumaProxy.ts'

// HTTPS + LAN host are required so phones can grant motion-sensor permission.
// falProxy/lumaProxy + awsApi keep all secrets (API keys, AWS creds) server-side (dev only).
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl(), falProxy(), lumaProxy(), awsApi()],
  server: {
    host: true, // expose on the local network -> https://<lan-ip>:5173
  },
})
