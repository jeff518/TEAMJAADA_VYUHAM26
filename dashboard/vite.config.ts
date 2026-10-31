import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      '/documents': {
        target: process.env.VITE_API_URL || 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      '/audit-logs': {
        target: process.env.VITE_API_URL || 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      '/dashboard/stats': {
        target: process.env.VITE_API_URL || 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      '/classified-storage': {
        target: process.env.VITE_API_URL || 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
