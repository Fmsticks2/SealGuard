import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: [
      '@reown/appkit',
      '@reown/appkit-adapter-wagmi',
      '@wagmi/core',
      'wagmi',
      'viem'
    ]
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          web3: ['@reown/appkit', '@reown/appkit-adapter-wagmi', 'wagmi', 'viem'],
          ui: ['framer-motion', 'lucide-react']
        }
      }
    }
  },
  server: {
    port: 3000,
    host: true
  }
})