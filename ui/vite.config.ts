import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
        autoprefixer(),
      ],
    },
  },
  build: {
    outDir: '../distribution/ui',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidebar: resolve(__dirname, 'sidebar.html'),
        udm: resolve(__dirname, 'udm.html'),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
