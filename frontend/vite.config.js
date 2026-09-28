import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { host: "127.0.0.1", proxy: { "/api": { target: "http://127.0.0.1:8000", ws: true }, "/analyze": "http://127.0.0.1:8000", "/reset": "http://127.0.0.1:8000", "/demo-flight": "http://127.0.0.1:8000" } },
  preview: { host: "127.0.0.1", proxy: { "/api": { target: "http://127.0.0.1:8000", ws: true }, "/analyze": "http://127.0.0.1:8000", "/reset": "http://127.0.0.1:8000", "/demo-flight": "http://127.0.0.1:8000" } },
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

