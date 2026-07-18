import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // API + WebSocket → game server during local dev.
      '/api': { target: 'http://127.0.0.1:8787' },
      '/': {
        target: 'http://127.0.0.1:8787',
        ws: true,
        bypass: (req) => {
          if (req.headers.upgrade === 'websocket') return undefined;
          if (req.url?.startsWith('/api')) return undefined;
          return req.url;
        },
      },
    },
  },
});
