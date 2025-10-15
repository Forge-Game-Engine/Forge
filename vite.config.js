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
      entry: {
        index: path.resolve(__dirname, 'src/index.ts'),
        animations: path.resolve(__dirname, 'src/animations/index.ts'),
        'asset-loading': path.resolve(__dirname, 'src/asset-loading/index.ts'),
        audio: path.resolve(__dirname, 'src/audio/index.ts'),
        ecs: path.resolve(__dirname, 'src/ecs/index.ts'),
        events: path.resolve(__dirname, 'src/events/index.ts'),
        input: path.resolve(__dirname, 'src/input/index.ts'),
        lifecycle: path.resolve(__dirname, 'src/input/lifecycle.ts'),
        math: path.resolve(__dirname, 'src/math/index.ts'),
        particles: path.resolve(__dirname, 'src/particles/index.ts'),
        physics: path.resolve(__dirname, 'src/physics/index.ts'),
        pooling: path.resolve(__dirname, 'src/pooling/index.ts'),
        rendering: path.resolve(__dirname, 'src/rendering/index.ts'),
        timer: path.resolve(__dirname, 'src/timer/index.ts'),
        ui: path.resolve(__dirname, 'src/ui/index.ts'),
        utilities: path.resolve(__dirname, 'src/utilities/index.ts'),
      },
      formats: ['es', 'cjs'],
      name: 'Forge',
      fileName: (format, entryName) =>
        `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
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
