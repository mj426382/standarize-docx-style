import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Konfiguracja Vite z proxy /api do backendu w trybie dev.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3026',
        changeOrigin: true,
      },
    },
  },
});
