// vite.config.base.ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '127.0.0.1',
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'jsdom',
    setupFiles: ['setup-tests.ts'],
  },
});
