#!/usr/bin/env node
/**
 * generate-font-atlas.mjs
 *
 * Generates an SDF / MSDF font atlas and BMFont JSON metrics file from a
 * TrueType or OpenType font file using the `msdf-bmfont-xml` package.
 *
 * Decision: we wrap msdf-bmfont-xml rather than reimplementing SDF generation.
 * The tool is the de-facto standard, is well-maintained, and its output maps
 * cleanly to the FontAsset type used by the engine.  This script normalises
 * its output file names and copies them to a destination directory.
 *
 * Usage (via npm script):
 *   npm run generate:font -- [options]
 *
 * Or directly:
 *   node scripts/generate-font-atlas.mjs [options]
 *
 * Options:
 *   --font <path>        Path to the .ttf / .otf font file. (required)
 *   --output <dir>       Output directory for .png and .json files. (required)
 *   --name <name>        Base name for output files. Defaults to the font filename.
 *   --size <n>           Font size in pixels for atlas generation. Default: 42
 *   --atlas-size <n>     Atlas dimensions (square). Default: 512
 *   --distance-range <n> SDF distance range in pixels. Default: 4
 *   --type <sdf|msdf>    SDF type. Default: msdf
 *   --charset <path>     Path to a text file listing characters to include.
 *                        Defaults to ASCII printable characters (32–126).
 *   --help               Show this help message.
 *
 * Example:
 *   node scripts/generate-font-atlas.mjs \
 *     --font assets/fonts/OpenSans-Regular.ttf \
 *     --output demo/public/fonts \
 *     --name opensans-regular \
 *     --size 42 --atlas-size 512 --type msdf
 *
 * Output:
 *   <output>/<name>.png  — Atlas texture
 *   <output>/<name>.json — BMFont metrics (compatible with loadFontAsset)
 *
 * Runtime dependency (install as devDependency):
 *   npm install --save-dev msdf-bmfont-xml
 */

import { execFile } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import {
  copyFile,
  rename,
  readFile,
  writeFile,
  readdir,
  unlink,
} from 'node:fs/promises';
import { join, basename, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  let i = 2;

  while (i < argv.length) {
    const key = argv[i];

    if (key === '--help' || key === '-h') {
      args.help = true;
      i++;
      continue;
    }

    const value = argv[i + 1];

    if (key === '--font') {
      args.font = value;
      i += 2;
      continue;
    }
    if (key === '--output') {
      args.output = value;
      i += 2;
      continue;
    }
    if (key === '--name') {
      args.name = value;
      i += 2;
      continue;
    }
    if (key === '--size') {
      args.size = parseInt(value, 10);
      i += 2;
      continue;
    }
    if (key === '--atlas-size') {
      args.atlasSize = parseInt(value, 10);
      i += 2;
      continue;
    }
    if (key === '--distance-range') {
      args.distanceRange = parseInt(value, 10);
      i += 2;
      continue;
    }
    if (key === '--type') {
      args.type = value;
      i += 2;
      continue;
    }
    if (key === '--charset') {
      args.charset = value;
      i += 2;
      continue;
    }

    console.warn(`Unknown argument: ${key}`);
    i++;
  }

  return args;
}

function printHelp() {
  console.log(`
Usage: node scripts/generate-font-atlas.mjs [options]

Options:
  --font <path>        Path to the .ttf / .otf font file. (required)
  --output <dir>       Output directory. (required)
  --name <name>        Base name for output files. Defaults to font filename.
  --size <n>           Font size in pixels for atlas rendering. Default: 42
  --atlas-size <n>     Atlas texture dimensions (square). Default: 512
  --distance-range <n> SDF spread in pixels. Default: 4
  --type <sdf|msdf>    SDF variant. Default: msdf
  --charset <path>     Path to a charset text file. Defaults to ASCII 32-126.
  --help               Show this help message.

Example:
  node scripts/generate-font-atlas.mjs \\
    --font assets/fonts/OpenSans-Regular.ttf \\
    --output demo/public/fonts \\
    --name opensans-regular \\
    --type msdf
`);
}

// ---------------------------------------------------------------------------
// Charset helpers
// ---------------------------------------------------------------------------

function defaultCharset() {
  let chars = '';

  for (let cp = 32; cp <= 126; cp++) {
    chars += String.fromCodePoint(cp);
  }

  // Add common extras
  chars += '…‘’“”–—';

  return chars;
}

// ---------------------------------------------------------------------------
// msdf-bmfont-xml resolution
// ---------------------------------------------------------------------------

function findMsdfBmfont() {
  const candidates = [
    join(projectRoot, 'node_modules', '.bin', 'msdf-bmfont'),
    join(projectRoot, 'node_modules', 'msdf-bmfont-xml', 'bin', 'msdf-bmfont'),
  ];

  for (const p of candidates) {
    if (existsSync(p)) {
      return p;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// JSON normalisation
// ---------------------------------------------------------------------------

/**
 * msdf-bmfont-xml writes `distanceField` or `info.distanceField` depending on
 * version. This function ensures the output JSON has the `distanceField` key
 * at the top level and matches the FontAsset/BmFontJson shape.
 */
async function normaliseJson(jsonPath, type, distanceRange) {
  const raw = JSON.parse(await readFile(jsonPath, 'utf-8'));

  // Ensure distanceField block is present
  if (!raw.distanceField) {
    raw.distanceField = {
      fieldType: type,
      distanceRange,
    };
  }

  await writeFile(jsonPath, JSON.stringify(raw, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!args.font) {
    console.error('Error: --font is required.');
    printHelp();
    process.exit(1);
  }

  if (!args.output) {
    console.error('Error: --output is required.');
    printHelp();
    process.exit(1);
  }

  const fontPath = args.font;
  const outputDir = args.output;
  const baseName =
    args.name ?? basename(fontPath, extname(fontPath)).toLowerCase();
  const size = args.size ?? 42;
  const atlasSize = args.atlasSize ?? 512;
  const distanceRange = args.distanceRange ?? 4;
  const type = args.type ?? 'msdf';

  if (type !== 'sdf' && type !== 'msdf') {
    console.error(`Error: --type must be 'sdf' or 'msdf', got '${type}'.`);
    process.exit(1);
  }

  if (!existsSync(fontPath)) {
    console.error(`Error: Font file not found: ${fontPath}`);
    process.exit(1);
  }

  mkdirSync(outputDir, { recursive: true });

  // Determine charset
  let charset = defaultCharset();

  if (args.charset) {
    if (!existsSync(args.charset)) {
      console.error(`Error: Charset file not found: ${args.charset}`);
      process.exit(1);
    }

    charset = readFileSync(args.charset, 'utf-8');
  }

  // Locate msdf-bmfont binary
  const binaryPath = findMsdfBmfont();

  if (!binaryPath) {
    console.error(
      'Error: msdf-bmfont-xml is not installed.\n' +
        'Install it as a dev dependency:\n' +
        '  npm install --save-dev msdf-bmfont-xml\n',
    );
    process.exit(1);
  }

  console.log(`Generating ${type.toUpperCase()} font atlas for: ${fontPath}`);
  console.log(
    `  size=${size}, atlas=${atlasSize}x${atlasSize}, distanceRange=${distanceRange}`,
  );

  // The installed msdf-bmfont-xml CLI only accepts a charset *file* path
  // (`--charset-file`), not the character list inline, so write the
  // resolved charset to a scratch file in the output directory.
  const charsetFilePath = join(outputDir, `${baseName}.charset.tmp.txt`);
  await writeFile(charsetFilePath, charset, 'utf-8');

  // The CLI's `--filename` option only renames the atlas image; the metrics
  // JSON is always written using the font's internal face name (read from
  // the font file's name table), which rarely matches `--name`. Snapshot the
  // directory so the newly-written JSON can be found and renamed below.
  const filesBefore = new Set(await readdir(outputDir));

  // msdf-bmfont-xml CLI args
  const cliArgs = [
    fontPath,
    '--output-type',
    'json',
    '--filename',
    join(outputDir, baseName),
    '--font-size',
    String(size),
    '--texture-size',
    `${atlasSize},${atlasSize}`,
    '--distance-range',
    String(distanceRange),
    '--field-type',
    type,
    '--charset-file',
    charsetFilePath,
    '--pot',
  ];

  try {
    const { stdout, stderr } = await execFileAsync(binaryPath, cliArgs);

    if (stdout) {
      process.stdout.write(stdout);
    }

    if (stderr) {
      process.stderr.write(stderr);
    }
  } catch (err) {
    console.error('Error running msdf-bmfont:', err.message);

    if (err.stderr) {
      process.stderr.write(err.stderr);
    }

    process.exit(1);
  } finally {
    await unlink(charsetFilePath).catch(() => {});
  }

  // msdf-bmfont-xml may name the texture file with a page suffix (e.g. _0).
  // Rename to <baseName>.png if needed.
  const expectedPng = join(outputDir, `${baseName}.png`);
  const pagedPng = join(outputDir, `${baseName}_0.png`);

  if (!existsSync(expectedPng) && existsSync(pagedPng)) {
    await rename(pagedPng, expectedPng);
  }

  // Find the metrics JSON the CLI just wrote (named after the font's face
  // name, not `--name`) and rename it to `<baseName>.json`.
  const jsonPath = join(outputDir, `${baseName}.json`);

  if (!existsSync(jsonPath)) {
    const filesAfter = await readdir(outputDir);
    const newJsonFile = filesAfter.find(
      (f) => f.endsWith('.json') && !filesBefore.has(f),
    );

    if (newJsonFile) {
      await rename(join(outputDir, newJsonFile), jsonPath);
    }
  }

  // Normalise the JSON so it always has the distanceField block.
  if (existsSync(jsonPath)) {
    await normaliseJson(jsonPath, type, distanceRange);
  }

  console.log(`Done!`);
  console.log(`  Atlas: ${expectedPng}`);
  console.log(`  JSON:  ${jsonPath}`);
}

try {
  await main();
} catch (err) {
  console.error('Unexpected error:', err);
  process.exit(1);
}
