import { defineConfig } from 'vite';
import path from 'node:path';
import baseConfig from './vite.config.base.js';

export default defineConfig({
  ...baseConfig,
  root: path.resolve(__dirname, 'demo'),
});
