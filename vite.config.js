import { defineConfig } from 'vite';
import path from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  server: {
    host: '127.0.0.1', // see https://vite.dev/guide/troubleshooting.html#dev-containers-vs-code-port-forwarding
  },
  build: {
    target: 'es2022',
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: 'index',
      name: 'Forge',
    },
    minify: false,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'jsdom',
    setupFiles: ['setup-tests.ts'],
  },
  plugins: [dts({ tsconfigPath: './tsconfig.build.json', rollupTypes: true })],
});
