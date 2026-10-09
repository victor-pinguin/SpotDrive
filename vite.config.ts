import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' → relative Pfade, damit der Build auch in Capacitor (file://) funktioniert.
export default defineConfig({
  plugins: [react()],
  base: './',
  // /api → lokaler KI-Server (npm run server) für die Auto-Erkennung
  server: { host: true, port: 5173, proxy: { '/api': 'http://localhost:8787' } },
});
