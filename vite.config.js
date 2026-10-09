import { defineConfig } from 'vite';
import baseConfig from './vite.config.base.js';

// `vitest bench` runs in Vitest's `benchmark` mode. Benchmarks run in plain
// Node rather than jsdom, whose DOM globals would distort the timings, and
// without the unit tests' setup file, which only resets mocks between tests.
export default defineConfig(({ mode }) => {
  if (mode !== 'benchmark') {
    return baseConfig;
  }

  return {
    ...baseConfig,
    test: {
      ...baseConfig.test,
      environment: 'node',
      setupFiles: [],
    },
  };
});
