#!/usr/bin/env node

/**
 * Build script using TypeScript Compiler (tsc)
 * This script compiles the TypeScript source to JavaScript and generates type definitions,
 * then resolves the forge/* path aliases to relative paths
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Building with TypeScript Compiler...\n');

try {
  // Clean dist folder
  const distPath = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true });
    console.log('✓ Cleaned dist folder');
  }

  // Compile TypeScript
  console.log('\nCompiling TypeScript to JavaScript...');
  execSync('tsc --project tsconfig.build.json --skipLibCheck', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  console.log('✓ TypeScript compilation complete');

  // Resolve path aliases
  console.log('\nResolving forge/* path aliases...');
  resolvePathAliases(distPath);
  console.log('✓ Path aliases resolved');

  console.log('\n✓ Build complete!');
} catch (error) {
  console.error('\n✗ Build failed:', error.message);
  process.exit(1);
}

/**
 * Recursively resolve forge/* imports to relative paths
 */
function resolvePathAliases(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      resolvePathAliases(filePath);
    } else if (file.endsWith('.js') || file.endsWith('.d.ts')) {
      resolveFileAliases(filePath);
    }
  });
}

/**
 * Resolve forge/* aliases in a single file
 */
function resolveFileAliases(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const fileDir = path.dirname(filePath);
  const distPath = path.join(__dirname, '..', 'dist');
  
  // Find all forge/* imports
  const forgeImportRegex = /from\s+['"]forge\/([^'"]+)['"]/g;
  let match;
  let modified = false;
  
  while ((match = forgeImportRegex.exec(content)) !== null) {
    const forgeModule = match[1];
    const targetPath = path.join(distPath, forgeModule);
    
    // Calculate relative path from current file to target
    let relativePath = path.relative(fileDir, targetPath);
    
    // Normalize to forward slashes and ensure it starts with ./
    relativePath = relativePath.replace(/\\/g, '/');
    if (!relativePath.startsWith('.')) {
      relativePath = './' + relativePath;
    }
    
    // Replace the forge import with relative import
    const oldImport = `from 'forge/${forgeModule}'`;
    const newImport = `from '${relativePath}'`;
    content = content.replace(oldImport, newImport);
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
  }
}
