import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Split heavy vendors into their own cached chunks for faster loads.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('victory')) return 'recharts';
          if (id.includes('firebase') || id.includes('@firebase')) return 'firebase';
          if (id.includes('/react') || id.includes('react-dom') || id.includes('scheduler')) return 'react';
          return 'vendor';
        },
      },
    },
  },
})
