#!/usr/bin/env node

/**
 * Post-processes .d.ts files to add .js extensions to relative imports.
 * This is required for proper TypeScript module resolution with ESM and package exports.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else if (file.endsWith('.d.ts')) {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

function addJsExtensions(content, filePath) {
  const fileDir = path.dirname(filePath);
  
  // Add .js extension to relative imports that don't already have an extension
  // Matches: from './path' or from '../path' but not from './path.js'
  content = content.replace(
    /from\s+['"](\.[^'"]*?)(?<!\.js)['"]/g,
    (match, p1) => {
      // Don't add .js if the path already ends with .js or contains a query/hash
      if (p1.includes('?') || p1.includes('#')) {
        return match;
      }
      
      // Resolve the path to check if it's a directory
      const resolvedPath = path.resolve(fileDir, p1);
      const indexPath = path.join(resolvedPath, 'index.d.ts');
      
      // If the target is a directory with index.d.ts, add /index.js
      if (fs.existsSync(indexPath)) {
        return `from '${p1}/index.js'`;
      }
      
      return `from '${p1}.js'`;
    }
  );

  // Also handle export * from './path'
  content = content.replace(
    /export\s+\*\s+from\s+['"](\.[^'"]*?)(?<!\.js)['"]/g,
    (match, p1) => {
      if (p1.includes('?') || p1.includes('#')) {
        return match;
      }
      
      // Resolve the path to check if it's a directory
      const resolvedPath = path.resolve(fileDir, p1);
      const indexPath = path.join(resolvedPath, 'index.d.ts');
      
      // If the target is a directory with index.d.ts, add /index.js
      if (fs.existsSync(indexPath)) {
        return `export * from '${p1}/index.js'`;
      }
      
      return `export * from '${p1}.js'`;
    }
  );

  return content;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const newContent = addJsExtensions(content, filePath);
  
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Fixed imports in: ${filePath}`);
  }
}

const distPath = path.join(__dirname, '..', 'dist');
const dtsFiles = getAllFiles(distPath);

console.log(`Processing ${dtsFiles.length} .d.ts files...`);
dtsFiles.forEach(processFile);
console.log('Done!');
