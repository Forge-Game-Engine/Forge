#!/usr/bin/env node

import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const srcDir = join(projectRoot, 'src');
const distDir = join(projectRoot, 'dist');
const args = new Set(process.argv.slice(2));
const isDebug = args.has('--debug') || args.has('-d');
const isHelp = args.has('--help') || args.has('-h');

if (isHelp) {
  console.log(`
Usage: node copy-shaders.js [options]

Options:
  --help, -h     Show help information
  --debug, -d    Enable debug logging
`);
  process.exit(0);
}

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
  const parts = filename.split(/[.-]/);

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

  if (isDebug) {
    console.log(`Found ${shaderFiles.length} shader files to copy`);
  }

  for (const shaderFile of shaderFiles) {
    const srcPath = join(srcDir, shaderFile);
    const distPath = join(distDir, shaderFile);

    await mkdir(dirname(distPath), { recursive: true });
    await copyFile(srcPath, distPath);

    if (isDebug) {
      console.log(`> Copied: ${shaderFile}`);
    }
  }

  if (isDebug) {
    console.log('Shader files copied successfully!');
  }
}

async function convertGlslToJavaScript() {
  const shaderFiles = await findFiles(distDir, /\.glsl$/);

  if (isDebug) {
    console.log(`Converting ${shaderFiles.length} GLSL files to JavaScript...`);
  }

  for (const shaderFile of shaderFiles) {
    const glslPath = join(distDir, shaderFile);
    const jsPath = join(distDir, shaderFile.replace(/\.glsl$/, '.js'));
    const dtsPath = join(distDir, shaderFile.replace(/\.glsl$/, '.d.ts'));

    const shaderSource = await readFile(glslPath, 'utf-8');
    const filename = basename(shaderFile);
    const exportName = glslFileToExportName(filename);

    const escapedShaderSource = shaderSource.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
    const jsContent = `export const ${exportName} = \`${escapedShaderSource}\`;\n`;
    const dtsContent = `export declare const ${exportName}: string;\n`;

    await writeFile(jsPath, jsContent, 'utf-8');
    await writeFile(dtsPath, dtsContent, 'utf-8');

    if (isDebug) {
      console.log(
        `> Converted: ${basename(glslPath)} -> ${basename(jsPath)} + ${basename(dtsPath)}`,
      );
    }
  }
}

function parseIndexMatches(originalContent) {
  const IMPORT_REGEX = /import\s+(\w+)\s+from\s+['"](.+?)['"]/g;
  const EXPORT_FROM_REGEX = /export\s+\{([^}]+)\}\s+from\s+['"](.+?)['"]/g;
  const EXPORT_CONST_REGEX = /export\s+const\s+(\w+)\s*=\s*(\w+)/g;

  const rawImportMatches = [...originalContent.matchAll(IMPORT_REGEX)];
  const rawExportFromMatches = [...originalContent.matchAll(EXPORT_FROM_REGEX)];
  const rawExportConstMatches = [...originalContent.matchAll(EXPORT_CONST_REGEX)];

  const importMatches = [];

  for (const m of rawImportMatches) {
    importMatches.push({
      kind: 'import',
      full: m[0],
      importedName: m[1],
      importPath: m[2],
    });
  }
  for (const m of rawExportFromMatches) {
    importMatches.push({
      kind: 'export_from',
      full: m[0],
      exportList: m[1],
      exportPath: m[2],
    });
  }
  for (const m of rawExportConstMatches) {
    importMatches.push({
      kind: 'export_const',
      full: m[0],
      exportConstLeft: m[1],
      exportConstRight: m[2],
    });
  }

  return importMatches;
}

function buildNewIndexContent(importMatches, originalContent) {
  const lines = originalContent.split('\n');
  const processedExports = new Set();
  const parts = [];

  const handleGlslImport = (importedName, importPath) => {
    const glslFileName = importPath.replace('.glsl?raw', '');
    const glslBaseName = basename(glslFileName);
    const exportName = glslFileToExportName(glslBaseName + '.glsl');

    let out = '';
    const exportRegex = new RegExp(`export\\s+const\\s+(\\w+)\\s*=\\s*${importedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    for (const line of lines) {
      const exportMatch = line.match(exportRegex);
      if (exportMatch) {
        const publicExportName = exportMatch[1];
        if (!processedExports.has(publicExportName)) {
          out += `export { ${exportName} as ${publicExportName} } from '${glslFileName}.js';\n`;
          processedExports.add(publicExportName);
        }
      }
    }
    return out;
  };

  for (const m of importMatches) {
    if (m.kind === 'import') {
      if (m.importPath && m.importPath.endsWith('.glsl?raw')) {
        parts.push(handleGlslImport(m.importedName, m.importPath));
      } else {
        parts.push(m.full + '\n');
      }
    } else if (m.kind === 'export_from') {
      if (!m.exportPath || !m.exportPath.endsWith('.glsl?raw')) {
        parts.push(m.full + '\n');
      }
      // skip export_from entries that point at .glsl?raw - handled via imports
    }
    // export_const entries are intentionally skipped
  }

  return parts.join('');
}

async function regenerateBarrelFiles() {
  const indexFiles = await findFiles(distDir, /index\.js$/);

  if (isDebug) {
    console.log(`Regenerating ${indexFiles.length} barrel files...`);
  }

  for (const indexFile of indexFiles) {
    const indexPath = join(distDir, indexFile);
    const originalContent = await readFile(indexPath, 'utf-8');

    const importMatches = parseIndexMatches(originalContent);
    if (importMatches.length === 0) {
      continue;
    }

    const newContent = buildNewIndexContent(importMatches, originalContent);

    if (newContent && newContent !== originalContent) {
      await writeFile(indexPath, newContent, 'utf-8');

      if (isDebug) {
        console.log(`> Updated: ${relative(distDir, indexPath)}`);
      }
    }
  }
}

async function main() {
  await copyGlslFilesToDist();
  await convertGlslToJavaScript();
  await regenerateBarrelFiles();

  console.log('> GLSL files successfully copied and converted');
}

try {
  await main();
} catch (error) {
  console.error('❌ Error in GLSL post-build script:', error);

  if (!isDebug) {
    console.error(
      '\nYou can run this script with the --debug flag for more details.',
    );
  }

  process.exit(1);
}
