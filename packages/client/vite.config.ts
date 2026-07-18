import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(rootDir, '../../assets');

/** Serve repo-root /assets during `vite dev` (card art downloads). */
function serveCardAssets(): Plugin {
  return {
    name: 'serve-card-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/assets/')) return next();
        const rel = decodeURIComponent(req.url.slice('/assets/'.length).split('?')[0] ?? '');
        const filePath = path.normalize(path.join(assetsDir, rel));
        if (!filePath.startsWith(assetsDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          res.statusCode = 404;
          res.end('Not found');
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const types: Record<string, string> = {
          '.webp': 'image/webp',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.md': 'text/markdown',
        };
        res.setHeader('content-type', types[ext] ?? 'application/octet-stream');
        fs.createReadStream(filePath).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), serveCardAssets()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8787' },
      '/': {
        target: 'http://127.0.0.1:8787',
        ws: true,
        bypass: (req) => {
          if (req.headers.upgrade === 'websocket') return undefined;
          if (req.url?.startsWith('/api')) return undefined;
          if (req.url?.startsWith('/assets')) return req.url; // handled by plugin
          return req.url;
        },
      },
    },
  },
});
