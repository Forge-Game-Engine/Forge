#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

async function loadGenerateBMFont() {
  try {
    return (await import('msdf-bmfont-xml')).default;
  } catch (error) {
    if (error?.code !== 'ERR_MODULE_NOT_FOUND') {
      throw error;
    }

    const globalGenerateBMFont = await loadGlobalGenerateBMFont();

    if (globalGenerateBMFont) {
      return globalGenerateBMFont;
    }

    throw new Error(
      'msdf-bmfont-xml is required to generate a font atlas but is not installed. Run `npm install --save-dev msdf-bmfont-xml` or `npm install -g msdf-bmfont-xml` and try again.',
      { cause: error },
    );
  }
}

// A global install isn't a resolvable specifier for `import()` (ESM ignores
// NODE_PATH), so a global msdf-bmfont-xml needs its absolute location looked
// up and imported directly.
async function loadGlobalGenerateBMFont() {
  try {
    const globalRoot = execFileSync('npm', ['root', '-g'], {
      encoding: 'utf-8',
    }).trim();
    const packageDir = join(globalRoot, 'msdf-bmfont-xml');
    const packageJson = JSON.parse(
      readFileSync(join(packageDir, 'package.json'), 'utf-8'),
    );
    const entryPath = join(packageDir, packageJson.main ?? 'index.js');

    return (await import(pathToFileURL(entryPath).href)).default;
  } catch {
    return null;
  }
}

// Printable ASCII, the same default charset most BMFont/MSDF tools use.
const ASCII_CHARSET = Array.from({ length: 126 - 32 + 1 }, (_, i) =>
  String.fromCharCode(32 + i),
);

const CHARSET_PRESETS = {
  ascii: ASCII_CHARSET,
};

const CURRENT_FONT_ATLAS_FORMAT_VERSION = 1;

const args = process.argv.slice(2);

function readFlag(name, defaultValue) {
  const index = args.indexOf(`--${name}`);

  if (index === -1 || index === args.length - 1) {
    return defaultValue;
  }

  return args[index + 1];
}

function printHelp() {
  console.log(`
Usage: npx forge-generate-font-atlas --font <path> --out <path> [options]
   or: npm run generate-font-atlas -- --font <path> --out <path> [options]
       (from within the Forge repo itself)

Generates a multi-channel signed distance field (MSDF) font atlas from a
.ttf/.otf font file: an atlas PNG plus a normalized FontAtlasData JSON file.

Requires msdf-bmfont-xml, an optional peer dependency of
@forge-game-engine/forge - install it with
\`npm install --save-dev msdf-bmfont-xml\` first.

Options:
  --font <path>            Path to the input .ttf/.otf font file. Required.
  --out <path>              Output path, without extension. Writes
                             <out>.png and <out>.json. Required.
  --charset <name|string|path>
                             "ascii" (default) for printable ASCII, a literal
                             string of characters, or a path to a text file
                             containing the characters to include.
  --size <n>                 Font size the distance field is authored at, in
                              pixels. Defaults to 42.
  --distance-range <n>       The distance field's encoded range, in pixels.
                              Defaults to 4.
  --texture-width <n>        Atlas texture width, in pixels. Defaults to 512.
  --texture-height <n>       Atlas texture height, in pixels. Defaults to 512.
  --help, -h                 Show this help information.
`);
}

if (args.includes('--help') || args.includes('-h')) {
  printHelp();
  process.exit(0);
}

function resolveCharset(charsetArg) {
  if (charsetArg in CHARSET_PRESETS) {
    return CHARSET_PRESETS[charsetArg];
  }

  if (existsSync(charsetArg)) {
    return readFileSync(charsetArg, 'utf-8');
  }

  return charsetArg;
}

/**
 * Converts one BMFont `chars[]` entry (pixel-space, Y-down from the line's
 * top) into a `GlyphMetrics`-shaped object (em units, Y-up, relative to the
 * baseline).
 */
function normalizeGlyph(char, fontSize, base, atlasWidth, atlasHeight) {
  const hasInk = char.width > 0 && char.height > 0;

  const planeBounds = hasInk
    ? {
        left: char.xoffset / fontSize,
        top: (base - char.yoffset) / fontSize,
        right: (char.xoffset + char.width) / fontSize,
        bottom: (base - char.yoffset - char.height) / fontSize,
      }
    : null;

  const atlasBounds = hasInk
    ? {
        left: char.x / atlasWidth,
        top: 1 - char.y / atlasHeight,
        right: (char.x + char.width) / atlasWidth,
        bottom: 1 - (char.y + char.height) / atlasHeight,
      }
    : null;

  return {
    codePoint: char.id,
    advance: char.xadvance / fontSize,
    planeBounds,
    atlasBounds,
  };
}

/**
 * Normalizes msdf-bmfont-xml's raw BMFont-JSON output into Forge's own,
 * versioned `FontAtlasFileData` schema (see `src/text/font-atlas`), so
 * runtime consumers never depend on a third-party generator's own format.
 */
function normalizeBmfontJson(raw, atlasImageFilename) {
  if (raw.distanceField?.fieldType !== 'msdf') {
    throw new Error(
      `Expected a "msdf" distance field, got "${raw.distanceField?.fieldType}". Forge's text renderer only supports MSDF atlases (see design/msdf-text-rendering.md, DL-05).`,
    );
  }

  if (raw.pages.length !== 1) {
    throw new Error(
      `Expected exactly one atlas page, got ${raw.pages.length}. Multi-page atlases are not supported; reduce the charset or increase the texture size.`,
    );
  }

  const fontSize = raw.info.size;
  const { base, lineHeight, scaleW, scaleH } = raw.common;

  const glyphs = raw.chars.map((char) =>
    normalizeGlyph(char, fontSize, base, scaleW, scaleH),
  );

  const inkTops = glyphs
    .filter((glyph) => glyph.planeBounds !== null)
    .map((glyph) => glyph.planeBounds.top);
  const inkBottoms = glyphs
    .filter((glyph) => glyph.planeBounds !== null)
    .map((glyph) => glyph.planeBounds.bottom);

  const kerning = {};

  for (const pair of raw.kernings) {
    kerning[`${pair.first}:${pair.second}`] = pair.amount / fontSize;
  }

  return {
    formatVersion: CURRENT_FONT_ATLAS_FORMAT_VERSION,
    type: 'msdf',
    atlasImage: atlasImageFilename,
    atlasSize: { width: scaleW, height: scaleH },
    distanceRange: raw.distanceField.distanceRange,
    metrics: {
      lineHeight: lineHeight / fontSize,
      // `base` (BMFont's "line-top to baseline" distance) and
      // `lineHeight - base` are the font's *nominal* ascent/descent line
      // metrics, but they routinely undershoot the font's actually rendered
      // ink - e.g. this engine's shipped default font renders "b"/"d"/"h"/
      // "i"/"l" taller than `base` accounts for, and "("/")"/"j" lower than
      // `lineHeight - base` accounts for. `ascender`/`descender` exist
      // specifically to bound the block's *visible* ink for `verticalAlign`
      // (see `getVerticalAlignOffset` in `shape-text.ts`), so a metric that
      // undershoots real ink makes every alignment sit off by the shortfall
      // - `'top'`/`'bottom'`-anchored glyphs poke past the anchor, and
      // `'middle'` centers on the wrong point. Deriving them from the
      // actual rendered bounds of every glyph in this charset instead
      // guarantees no glyph ever pokes past a `'top'`/`'bottom'`-aligned
      // anchor.
      ascender: inkTops.length > 0 ? Math.max(...inkTops) : base / fontSize,
      descender:
        inkBottoms.length > 0
          ? Math.min(...inkBottoms)
          : (base - lineHeight) / fontSize,
    },
    glyphs,
    kerning,
  };
}

function generateBMFontAsync(generateBMFont, fontPath, options) {
  return new Promise((resolvePromise, rejectPromise) => {
    generateBMFont(fontPath, options, (error, textures, font) => {
      if (error) {
        rejectPromise(
          error instanceof Error ? error : new Error(String(error)),
        );

        return;
      }

      resolvePromise({ textures, font });
    });
  });
}

async function main() {
  const fontPath = readFlag('font');
  const outPath = readFlag('out');

  if (!fontPath || !outPath) {
    printHelp();
    throw new Error('--font and --out are required.');
  }

  const generateBMFont = await loadGenerateBMFont();

  const charsetArg = readFlag('charset', 'ascii');
  const fontSize = Number(readFlag('size', '42'));
  const distanceRange = Number(readFlag('distance-range', '4'));
  const textureWidth = Number(readFlag('texture-width', '512'));
  const textureHeight = Number(readFlag('texture-height', '512'));

  const resolvedOutPath = resolve(outPath);
  const outDir = dirname(resolvedOutPath);

  mkdirSync(outDir, { recursive: true });

  const { textures, font } = await generateBMFontAsync(
    generateBMFont,
    resolve(fontPath),
    {
      charset: resolveCharset(charsetArg),
      outputType: 'json',
      fontSize,
      distanceRange,
      fieldType: 'msdf',
      textureSize: [textureWidth, textureHeight],
    },
  );

  if (textures.length !== 1) {
    throw new Error(
      `Expected exactly one atlas texture, got ${textures.length}. Multi-page atlases are not supported; reduce the charset or increase the texture size.`,
    );
  }

  const raw = JSON.parse(font.data);
  const atlasImageFilename = `${resolveOutBasename(resolvedOutPath)}.png`;
  const fileData = normalizeBmfontJson(raw, atlasImageFilename);

  writeFileSync(`${resolvedOutPath}.png`, textures[0].texture);
  writeFileSync(`${resolvedOutPath}.json`, JSON.stringify(fileData, null, 2));

  console.log(
    `> Generated font atlas: ${resolvedOutPath}.png + ${resolvedOutPath}.json (${fileData.glyphs.length} glyphs, ${Object.keys(fileData.kerning).length} kerning pairs)`,
  );
}

function resolveOutBasename(resolvedOutPath) {
  const separatorIndex = resolvedOutPath.lastIndexOf('/');

  return separatorIndex === -1
    ? resolvedOutPath
    : resolvedOutPath.slice(separatorIndex + 1);
}

try {
  await main();
} catch (error) {
  console.error('❌ Error generating font atlas:', error);
  process.exit(1);
}
