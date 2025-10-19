import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  server: {
    host: '127.0.0.1', // see https://vite.dev/guide/troubleshooting.html#dev-containers-vs-code-port-forwarding
  },
  root: path.resolve(__dirname, 'demo'),
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'jsdom',
    setupFiles: ['setup-tests.ts'],
  },
});
