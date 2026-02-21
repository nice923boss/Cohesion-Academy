import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/Cohesion-Academy/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
