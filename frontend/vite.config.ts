import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  //   allow inframe for telegram login and web app
  server: {
    port: 5173,
    allowedHosts: ['apps-telegram.trelkbot.com'],
    hmr: {
      // El host debe ser el dominio desde el cual accedes en el navegador
      host: 'apps-telegram.trelkbot.com',
      protocol: 'wss',
      // clientPort: 443
    },
    proxy: {
      '/users/api': {
        target: 'http://localhost:3008',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:3008',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:3008',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          i18n: ['i18next', 'react-i18next'],
        },
      },
    },
  },
});
