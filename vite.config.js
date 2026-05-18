import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  server: {
    port: 5173,
    strictPort: true, // fail instead of auto-incrementing so the redirect URI always matches
  },
});
