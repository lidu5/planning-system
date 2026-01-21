import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Make environment variables available to the frontend
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(loadEnv('production', process.cwd()).VITE_API_BASE_URL || 'http://localhost:8000'),
  },
})
