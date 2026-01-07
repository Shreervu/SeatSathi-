import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env for the app code
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    },
    // Ensure pdfjs-dist worker can be loaded if needed locally, though CDN is used in code
    optimizeDeps: {
      include: ['pdfjs-dist']
    }
  }
})