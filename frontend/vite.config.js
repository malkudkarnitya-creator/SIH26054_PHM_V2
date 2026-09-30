import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          framework: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          animation: ['framer-motion'],
          three: ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
})

