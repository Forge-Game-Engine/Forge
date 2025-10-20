#!/usr/bin/env node

/**
 * Post-build script to convert GLSL files in dist to TypeScript modules
 * 1. Copy .glsl files from src to dist
 * 2. Convert .glsl files in dist to .ts files with string exports
 * 3. Update barrel files in dist to re-export from .ts files
 */

import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

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

async function convertGlslToTs() {
  // Find all .glsl files in dist
  const shaderFiles = await findFiles(distDir, /\.glsl$/);

  console.log(`Converting ${shaderFiles.length} GLSL files to TypeScript...`);

  for (const shaderFile of shaderFiles) {
    const glslPath = join(distDir, shaderFile);
    const tsPath = join(distDir, shaderFile.replace(/\.glsl$/, '.ts'));

    // Read the shader source
    const shaderSource = await readFile(glslPath, 'utf-8');

    // Get the export name from the filename
    const filename = basename(shaderFile);
    const exportName = glslFileToExportName(filename);

    // Create TypeScript file content with the shader source as a string literal
    const tsContent = `export const ${exportName} = \`${shaderSource}\`;\n`;

    // Write the TypeScript file
    await writeFile(tsPath, tsContent, 'utf-8');
    console.log(`Converted: ${basename(glslPath)} -> ${basename(tsPath)}`);
  }
}

async function updateBarrelFiles() {
  console.log('Updating barrel files in dist...');

  // Update sprite/index.js
  const spriteIndexPath = join(distDir, 'rendering/shaders/sprite/index.js');
  const spriteIndexContent = `export { spriteFragGlsl as spriteFragmentShader } from './sprite.frag.js';
export { spriteVertGlsl as spriteVertexShader } from './sprite.vert.js';
`;
  await writeFile(spriteIndexPath, spriteIndexContent, 'utf-8');
  console.log('Updated: sprite/index.js');

  // Update includes/index.js
  const includesIndexPath = join(
    distDir,
    'rendering/shaders/includes/index.js',
  );
  const includesIndexContent = `export { perlinNoiseFragGlsl as perlinNoiseFragmentShader } from './perlin-noise.frag.js';
export { perlinNoiseIncludeGlsl as perlinNoiseShaderInclude } from './perlin-noise.include.js';
export { cubicIncludeGlsl as cubicShaderInclude } from './cubic.include.js';
export { quinticIncludeGlsl as quinticShaderInclude } from './quintic.include.js';
export { randomGradientIncludeGlsl as randomGradientShaderInclude } from './random-gradient.include.js';
export { sdfCircleIncludeGlsl as sdfCircleShaderInclude } from './sdf-circle.include.js';
export { sdfBoxIncludeGlsl as sdfBoxShaderInclude } from './sdf-box.include.js';
export { sdfOrientedBoxIncludeGlsl as sdfOrientedBoxShaderInclude } from './sdf-oriented-box.include.js';
export { radialGradientIncludeGlsl as radialGradientShaderInclude } from './radial-gradient.include.js';
export { sdfEquilateralTriangleIncludeGlsl as sdfEquilateralTriangleInclude } from './sdf-equilateral-triangle.include.js';
export { sdfRhombusIncludeGlsl as sdfRhombusInclude } from './sdf-rhombus.include.js';
export { sdfTrapezoidIncludeGlsl as sdfTrapezoidInclude } from './sdf-trapezoid.include.js';
export { sdfOctagonIncludeGlsl as sdfOctagonInclude } from './sdf-octagon.include.js';
export { sdfHexagonIncludeGlsl as sdfHexagonInclude } from './sdf-hexagon.include.js';
`;
  await writeFile(includesIndexPath, includesIndexContent, 'utf-8');
  console.log('Updated: includes/index.js');

  // Update gradients/index.js
  const gradientsIndexPath = join(
    distDir,
    'rendering/shaders/gradients/index.js',
  );
  const gradientsIndexContent = `export { radialGradientFragGlsl as radialGradientShader } from './radial-gradient.frag.js';
`;
  await writeFile(gradientsIndexPath, gradientsIndexContent, 'utf-8');
  console.log('Updated: gradients/index.js');

  // Update lib/index.js
  const libIndexPath = join(distDir, 'rendering/shaders/lib/index.js');
  const libIndexContent = `export {
  perlinNoiseFragmentShader,
  perlinNoiseShaderInclude,
  cubicShaderInclude,
  quinticShaderInclude,
  randomGradientShaderInclude,
  sdfCircleShaderInclude,
  sdfOrientedBoxShaderInclude,
  radialGradientShaderInclude,
} from '../includes/index.js';
`;
  await writeFile(libIndexPath, libIndexContent, 'utf-8');
  console.log('Updated: lib/index.js');
}

async function compileTypeScriptFiles() {
  console.log('Converting TypeScript files to JavaScript in dist...');

  // Find all .ts shader files in dist
  const tsFiles = await findFiles(
    join(distDir, 'rendering/shaders'),
    /\.(frag|vert|include)\.ts$/,
  );

  for (const tsFile of tsFiles) {
    const tsPath = join(distDir, 'rendering/shaders', tsFile);
    const jsPath = tsPath.replace(/\.ts$/, '.js');
    const dtsPath = tsPath.replace(/\.ts$/, '.d.ts');

    // Read the TypeScript content
    const tsContent = await readFile(tsPath, 'utf-8');

    // Write .js file (same as .ts for simple exports)
    await writeFile(jsPath, tsContent, 'utf-8');

    // Write .d.ts file
    await writeFile(dtsPath, tsContent, 'utf-8');

    console.log(`Compiled: ${basename(tsPath)} -> ${basename(jsPath)}`);
  }

  console.log('TypeScript to JavaScript conversion complete!');
}

async function main() {
  // Step 1: Copy .glsl files from src to dist
  await copyShaders();

  // Step 2: Convert .glsl files in dist to .ts files
  await convertGlslToTs();

  // Step 3: Update barrel files to import from .ts files
  await updateBarrelFiles();

  // Step 4: Compile the .ts files to .js
  await compileTypeScriptFiles();

  console.log(
    'All done! GLSL files have been converted to TypeScript modules.',
  );
}

main().catch((error) => {
  console.error('Error in post-build script:', error);
  process.exit(1);
});
