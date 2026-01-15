import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isProduction = mode === 'production';
    
    return {
      // Base path for GitHub Pages - use repo name in production, root in dev
      base: isProduction ? '/Coven/' : '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          // Proxy API requests to Django backend (only used in dev)
          '/api': {
            target: 'http://localhost:8000',
            changeOrigin: true,
            secure: false,
          },
        },
      },
      build: {
        outDir: 'dist',
        assetsDir: 'assets',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
