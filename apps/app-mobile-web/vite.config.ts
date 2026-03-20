import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  envPrefix: ['VITE_', 'EXPO_PUBLIC_'],
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '^/auth/(?!google/callback(?:$|/)).*': 'http://localhost:3000',
      '/lists': 'http://localhost:3000',
      '/tasks': 'http://localhost:3000',
      '/history': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
      '/users': 'http://localhost:3000',
      '/ai': 'http://localhost:3000',
    },
  },
});
