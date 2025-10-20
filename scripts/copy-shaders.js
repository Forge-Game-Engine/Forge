#!/usr/bin/env node

/**
 * Copy shader files (.glsl) from src to dist after TypeScript compilation
 */

import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const srcDir = join(projectRoot, 'src');
const distDir = join(projectRoot, 'dist');

/**
 * Recursively find all files matching a pattern
 */
async function findFiles(dir, pattern) {
  const files = [];

  async function walk(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && entry.name.match(pattern)) {
        files.push(relative(dir, fullPath));
      }
    }
  }

  await walk(dir);
  return files;
}

async function copyShaders() {
  // Find all .glsl files in src
  const shaderFiles = await findFiles(srcDir, /\.glsl$/);

  console.log(`Found ${shaderFiles.length} shader files to copy`);

  for (const shaderFile of shaderFiles) {
    const srcPath = join(srcDir, shaderFile);
    const distPath = join(distDir, shaderFile);

    // Ensure the directory exists
    await mkdir(dirname(distPath), { recursive: true });

    // Copy the file
    await copyFile(srcPath, distPath);
    console.log(`Copied: ${shaderFile}`);
  }

  console.log('Shader files copied successfully!');
}

copyShaders().catch((error) => {
  console.error('Error copying shader files:', error);
  process.exit(1);
});
