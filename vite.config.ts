import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const { PORT = '8080' } = loadEnv(mode, process.cwd(), 'PORT');
  const target = `http://127.0.0.1:${PORT}`;
  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: {
        '/socket.io': { target, ws: true },
        '/health': { target },
      },
    },
  };
});
