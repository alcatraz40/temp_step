import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true, // Allow connections from any IP address
    // Proxy API requests in development to avoid CORS issues
    proxy: {
      '/api': {
        target: 'http://localhost:7081',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    // Generate sourcemaps for better debugging in production
    sourcemap: true,
    // Optimize output for production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console logs for now for debugging
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code into separate chunks
          vendor: ['react', 'react-dom', 'styled-components', 'react-youtube'],
        },
      },
    },
  },
  // Ensure environment variables starting with VITE_ are accessible
  envPrefix: ['VITE_'],
}) 