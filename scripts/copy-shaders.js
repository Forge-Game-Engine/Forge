#!/usr/bin/env node

/**
 * Convert shader files (.glsl) to TypeScript (.ts) files before build
 */

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const srcDir = join(projectRoot, 'src');

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

/**
 * Convert a GLSL filename to a valid TypeScript export name
 * e.g., "sprite.frag.glsl" -> "spriteFragGlsl"
 */
function glslFileToExportName(filename) {
  // Split by dots and dashes, convert to camelCase
  const parts = filename.split(/[.\-]/);

  return parts
    .map((part, index) => {
      if (index === 0) {
        return part;
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
}

async function convertShaders() {
  // Find all .glsl files in src
  const shaderFiles = await findFiles(srcDir, /\.glsl$/);

  console.log(`Found ${shaderFiles.length} shader files to convert`);

  for (const shaderFile of shaderFiles) {
    const srcPath = join(srcDir, shaderFile);
    const tsPath = join(srcDir, shaderFile.replace(/\.glsl$/, '.ts'));

    // Read the shader source
    const shaderSource = await readFile(srcPath, 'utf-8');

    // Get the export name from the filename
    const filename = basename(shaderFile);
    const exportName = glslFileToExportName(filename);

    // Create TypeScript file content with the shader source as a string literal
    const tsContent = `export const ${exportName} = \`${shaderSource}\`;\n`;

    // Ensure the directory exists
    await mkdir(dirname(tsPath), { recursive: true });

    // Write the TypeScript file
    await writeFile(tsPath, tsContent, 'utf-8');
    console.log(`Converted: ${shaderFile} -> ${basename(tsPath)}`);
  }

  console.log('Shader files converted successfully!');
}

convertShaders().catch((error) => {
  console.error('Error converting shader files:', error);
  process.exit(1);
});
