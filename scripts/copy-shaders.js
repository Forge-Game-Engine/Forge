#!/usr/bin/env node

import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  writeFile,
  unlink,
} from 'node:fs/promises';
import { dirname, join, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const srcDir = join(projectRoot, 'src');
const distDir = join(projectRoot, 'dist');

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

function glslFileToExportName(filename) {
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

async function copyGlslFilesToDist() {
  const shaderFiles = await findFiles(srcDir, /\.glsl$/);

  console.log(`Found ${shaderFiles.length} shader files to copy`);

  for (const shaderFile of shaderFiles) {
    const srcPath = join(srcDir, shaderFile);
    const distPath = join(distDir, shaderFile);

    await mkdir(dirname(distPath), { recursive: true });
    await copyFile(srcPath, distPath);
    console.log(`Copied: ${shaderFile}`);
  }

  console.log('Shader files copied successfully!');
}

async function convertGlslToJavaScript() {
  const shaderFiles = await findFiles(distDir, /\.glsl$/);

  console.log(`Converting ${shaderFiles.length} GLSL files to JavaScript...`);

  for (const shaderFile of shaderFiles) {
    const glslPath = join(distDir, shaderFile);
    const jsPath = join(distDir, shaderFile.replace(/\.glsl$/, '.js'));
    const dtsPath = join(distDir, shaderFile.replace(/\.glsl$/, '.d.ts'));

    const shaderSource = await readFile(glslPath, 'utf-8');
    const filename = basename(shaderFile);
    const exportName = glslFileToExportName(filename);

    const jsContent = `export const ${exportName} = \`${shaderSource}\`;\n`;
    const dtsContent = `export declare const ${exportName}: string;\n`;

    await writeFile(jsPath, jsContent, 'utf-8');
    await writeFile(dtsPath, dtsContent, 'utf-8');

    console.log(
      `Converted: ${basename(glslPath)} -> ${basename(jsPath)} + ${basename(dtsPath)}`,
    );
  }
}

async function regenerateBarrelFiles() {
  const indexFiles = await findFiles(distDir, /index\.js$/);

  console.log(`Regenerating ${indexFiles.length} barrel files...`);

  for (const indexFile of indexFiles) {
    const indexPath = join(distDir, indexFile);
    const indexDir = dirname(indexPath);

    const originalContent = await readFile(indexPath, 'utf-8');

    const importMatches = [
      ...originalContent.matchAll(
        /(?:import\s+(\w+)\s+from\s+['"](.+?)['"]|export\s+\{([^}]+)\}\s+from\s+['"](.+?)['"]|export\s+const\s+(\w+)\s*=\s*(\w+))/g,
      ),
    ];

    if (importMatches.length === 0) {
      continue;
    }

    let newContent = '';
    const processedExports = new Set();

    for (const match of importMatches) {
      if (match[0].startsWith('import')) {
        const importedName = match[1];
        const importPath = match[2];

        if (importPath.endsWith('.glsl?raw')) {
          const glslFileName = importPath.replace('.glsl?raw', '');
          const glslBaseName = basename(glslFileName);
          const exportName = glslFileToExportName(glslBaseName + '.glsl');

          const lines = originalContent.split('\n');
          for (const line of lines) {
            const exportMatch = line.match(
              new RegExp(`export\\s+const\\s+(\\w+)\\s*=\\s*${importedName}`),
            );
            if (exportMatch) {
              const publicExportName = exportMatch[1];
              if (!processedExports.has(publicExportName)) {
                newContent += `export { ${exportName} as ${publicExportName} } from '${glslFileName}.js';\n`;
                processedExports.add(publicExportName);
              }
            }
          }
        } else {
          newContent += match[0] + '\n';
        }
      } else if (match[0].startsWith('export {')) {
        const exportClause = match[3];
        const exportPath = match[4];

        if (!exportPath.endsWith('.glsl?raw')) {
          newContent += match[0] + '\n';
        }
      } else if (match[0].startsWith('export const')) {
        continue;
      }
    }

    if (newContent && newContent !== originalContent) {
      await writeFile(indexPath, newContent, 'utf-8');
      console.log(`Updated: ${relative(distDir, indexPath)}`);
    }
  }
}

async function main() {
  await copyGlslFilesToDist();
  await convertGlslToJavaScript();
  await regenerateBarrelFiles();

  console.log(
    'All done! GLSL files have been converted to JavaScript modules.',
  );
}

main().catch((error) => {
  console.error('Error in post-build script:', error);
  process.exit(1);
});
