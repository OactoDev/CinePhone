import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { awsApi } from './server/awsApi.ts'
import { lumaProxy } from './server/lumaProxy.ts'

// HTTPS + LAN host are required so phones can grant motion-sensor permission.
// lumaProxy + awsApi keep all secrets (Luma key, AWS creds) server-side (dev only).
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl(), lumaProxy(), awsApi()],
  server: {
    host: true, // expose on the local network -> https://<lan-ip>:5173
  },
})
