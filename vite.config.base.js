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
    // Microbenchmarks sit next to the code they measure, as `*.bench.ts`,
    // and only run under `vitest bench` (`npm run bench:micro`), never as
    // part of `npm test`. `vite.config.js` runs them in a Node environment.
    benchmark: {
      include: ['src/**/*.bench.ts'],
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/*.bench.ts',
        'src/**/test-helpers/**',
      ],
    },
  },
});
