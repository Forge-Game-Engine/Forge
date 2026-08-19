import { CURRENT_FONT_ATLAS_FORMAT_VERSION } from './font-atlas-data.js';
import type { FontAtlasFileData } from './font-atlas-file-data.js';

/** Sane upper bound on how many glyphs a single atlas can declare. */
const MAX_GLYPH_COUNT = 100_000;

/** Sane upper bound on how many kerning pairs a single atlas can declare. */
const MAX_KERNING_PAIR_COUNT = 1_000_000;

const KERNING_KEY_PATTERN = /^\d+:\d+$/;

/**
 * Validates that `json` is a well-formed, current-version
 * `FontAtlasFileData` object, throwing a descriptive error otherwise. This
 * is the boundary check for atlas files, which may be moddable/user-supplied
 * content rather than developer-authored assets.
 * @param json - The parsed JSON to validate.
 * @param sourcePath - The path the JSON was loaded from, for error messages.
 * @returns `json`, narrowed to `FontAtlasFileData`.
 * @throws An error if `json` is not a valid, current-version atlas file.
 */
export function validateFontAtlasFileData(
  json: unknown,
  sourcePath: string,
): FontAtlasFileData {
  const fail = (reason: string): never => {
    throw new Error(`Invalid font atlas JSON at "${sourcePath}": ${reason}`);
  };

  if (typeof json !== 'object' || json === null) {
    fail('expected the root value to be a JSON object.');
  }

  const data = json as Record<string, unknown>;

  if (data.formatVersion !== CURRENT_FONT_ATLAS_FORMAT_VERSION) {
    fail(
      `unsupported formatVersion "${String(data.formatVersion)}", expected ${CURRENT_FONT_ATLAS_FORMAT_VERSION}.`,
    );
  }

  if (data.type !== 'msdf') {
    fail(`unsupported type "${String(data.type)}", expected "msdf".`);
  }

  if (typeof data.atlasImage !== 'string' || data.atlasImage.length === 0) {
    fail('atlasImage must be a non-empty string.');
  }

  validateAtlasSize(data.atlasSize, fail);
  validateDistanceRange(data.distanceRange, fail);
  validateMetrics(data.metrics, fail);
  validateGlyphs(data.glyphs, fail);
  validateKerning(data.kerning, fail);

  return data as unknown as FontAtlasFileData;
}

function validateAtlasSize(
  atlasSize: unknown,
  fail: (reason: string) => never,
): void {
  if (typeof atlasSize !== 'object' || atlasSize === null) {
    fail('atlasSize must be an object.');

    return;
  }

  const { width, height } = atlasSize as Record<string, unknown>;

  if (!isPositiveFiniteNumber(width) || !isPositiveFiniteNumber(height)) {
    fail(
      'atlasSize.width and atlasSize.height must be positive finite numbers.',
    );
  }
}

function validateDistanceRange(
  distanceRange: unknown,
  fail: (reason: string) => never,
): void {
  if (!isPositiveFiniteNumber(distanceRange)) {
    fail('distanceRange must be a positive finite number.');
  }
}

function validateMetrics(
  metrics: unknown,
  fail: (reason: string) => never,
): void {
  if (typeof metrics !== 'object' || metrics === null) {
    fail('metrics must be an object.');

    return;
  }

  const { lineHeight, ascender, descender, capHeight } = metrics as Record<
    string,
    unknown
  >;

  if (
    !Number.isFinite(lineHeight) ||
    !Number.isFinite(ascender) ||
    !Number.isFinite(descender) ||
    !Number.isFinite(capHeight)
  ) {
    fail(
      'metrics.lineHeight, metrics.ascender, metrics.descender, and metrics.capHeight must all be finite numbers.',
    );
  }
}

function validateGlyphs(
  glyphs: unknown,
  fail: (reason: string) => never,
): void {
  if (!Array.isArray(glyphs)) {
    fail('glyphs must be an array.');

    return;
  }

  if (glyphs.length > MAX_GLYPH_COUNT) {
    fail(
      `glyphs has ${glyphs.length} entries, exceeding the maximum of ${MAX_GLYPH_COUNT}.`,
    );
  }

  for (const [index, glyph] of glyphs.entries()) {
    validateGlyph(glyph, index, fail);
  }
}

function validateGlyph(
  glyph: unknown,
  index: number,
  fail: (reason: string) => never,
): void {
  if (typeof glyph !== 'object' || glyph === null) {
    fail(`glyphs[${index}] must be an object.`);

    return;
  }

  const { codePoint, advance, planeBounds, atlasBounds } = glyph as Record<
    string,
    unknown
  >;

  if (!Number.isInteger(codePoint) || (codePoint as number) < 0) {
    fail(`glyphs[${index}].codePoint must be a non-negative integer.`);
  }

  if (!Number.isFinite(advance)) {
    fail(`glyphs[${index}].advance must be a finite number.`);
  }

  validateRectOrNull(planeBounds, `glyphs[${index}].planeBounds`, fail);
  validateRectOrNull(atlasBounds, `glyphs[${index}].atlasBounds`, fail);
}

function validateRectOrNull(
  rect: unknown,
  fieldPath: string,
  fail: (reason: string) => never,
): void {
  if (rect === null) {
    return;
  }

  if (typeof rect !== 'object') {
    fail(`${fieldPath} must be a Rect or null.`);

    return;
  }

  const { left, bottom, right, top } = rect as Record<string, unknown>;

  if (
    !Number.isFinite(left) ||
    !Number.isFinite(bottom) ||
    !Number.isFinite(right) ||
    !Number.isFinite(top)
  ) {
    fail(
      `${fieldPath}'s left, bottom, right, and top must all be finite numbers.`,
    );
  }
}

function validateKerning(
  kerning: unknown,
  fail: (reason: string) => never,
): void {
  if (typeof kerning !== 'object' || kerning === null) {
    fail('kerning must be an object.');

    return;
  }

  const entries = Object.entries(kerning as Record<string, unknown>);

  if (entries.length > MAX_KERNING_PAIR_COUNT) {
    fail(
      `kerning has ${entries.length} entries, exceeding the maximum of ${MAX_KERNING_PAIR_COUNT}.`,
    );
  }

  for (const [key, value] of entries) {
    if (!KERNING_KEY_PATTERN.test(key)) {
      fail(
        `kerning key "${key}" is not of the form "<leftCodePoint>:<rightCodePoint>".`,
      );
    }

    if (!Number.isFinite(value)) {
      fail(`kerning["${key}"] must be a finite number.`);
    }
  }
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
