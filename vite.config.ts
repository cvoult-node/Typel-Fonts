import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main:    path.resolve(__dirname, 'index.html'),
          social:  path.resolve(__dirname, 'social.html'),
          editor:  path.resolve(__dirname, 'editor.html'),
          feed:    path.resolve(__dirname, 'feed.html'),
          profile: path.resolve(__dirname, 'profile.html'),
          demo:    path.resolve(__dirname, 'font-demo.html'),
        },
      },
    },
  };
});
