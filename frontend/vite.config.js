import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // loadEnv with prefix '' loads all env vars from .env* plus process.env
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_URL || process.env.VITE_API_URL || 'http://localhost:8080';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true
        },
        '/ws': {
          target: apiTarget.replace('http://', 'ws://'),
          ws: true
        }
      }
    }
  };
});
