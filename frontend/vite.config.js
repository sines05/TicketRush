import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // loadEnv with prefix '' loads all env vars from .env* plus process.env
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_URL || process.env.VITE_API_URL || 'http://localhost:8080';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true
        },
        '/ws': {
          target: 'ws://localhost:8080',
          ws: true
        }
      }
    }
  };
});
