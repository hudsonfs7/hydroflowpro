import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 3000,
    strictPort: true,
    host: '0.0.0.0'
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'leaflet', 
      'firebase/app', 
      'firebase/firestore', 
      'firebase/auth', 
      'recharts',
      'lucide-react'
    ]
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'leaflet'],
          firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          charts: ['recharts']
        }
      }
    }
  }
})
