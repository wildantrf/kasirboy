import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// MejaFlow frontend. Build output is a static bundle suitable for HTTPS static hosting.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    target: 'es2022',
  },
});
