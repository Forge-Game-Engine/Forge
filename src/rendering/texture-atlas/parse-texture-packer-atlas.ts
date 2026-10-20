import type { AtlasRegionRect } from './atlas-region.js';

/**
 * The contents of a TexturePacker "JSON (Hash)" or "JSON (Array)" file, as
 * {@link parseTexturePackerAtlas} returns them: the image size and scale the
 * file declares, and one texel rect per frame. Pass it, with the atlas
 * image's texture, to `createTexturePackerAtlas`.
 */
export interface TexturePackerAtlasData {
  /**
   * The image file the atlas was exported with (`meta.image`), used only in
   * error messages. `null` when the file doesn't name one. The image is
   * never loaded from it, since bundlers rename files.
   */
  readonly imageName: string | null;

  /**
   * The atlas image's size in texels (`meta.size`).
   */
  readonly size: Readonly<{ width: number; height: number }>;

  /**
   * How many texels of the image make up one pixel of the art it was
   * packed from (`meta.scale`): `2` for an export at twice the art's size.
   * `1` when the file doesn't say.
   */
  readonly scale: number;

  /**
   * One rect per frame. The array form keeps the file's order. The hash
   * form keeps JavaScript's property order, which puts names that look like
   * array indices (`"0"`, `"12"`) first, so look regions up by name, or
   * export as "JSON (Array)" when order matters.
   */
  readonly regions: readonly Readonly<AtlasRegionRect>[];
}

/**
 * The most frames a file may have. Atlas files can be content a player
 * supplies, so this bounds the work a hostile file can cause.
 */
const maxFrameCount = 100_000;

type JsonRecord = Record<string, unknown>;

interface AtlasSize {
  readonly width: number;
  readonly height: number;
}

interface FrameRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

const fail = (message: string): never => {
  throw new Error(`Invalid TexturePacker atlas JSON: ${message}`);
};

const describeValue = (value: unknown): string => {
  if (value === undefined) {
    return 'nothing';
  }

  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return 'an array';
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return `a ${typeof value}`;
};

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readRecord = (value: unknown, path: string): JsonRecord => {
  if (!isRecord(value)) {
    return fail(`${path} must be an object, got ${describeValue(value)}.`);
  }

  return value;
};

/**
 * Reads a whole number of texels: at least `0` for a position, above `0`
 * for a size.
 */
const readTexels = (
  record: JsonRecord,
  field: string,
  path: string,
  kind: 'position' | 'size',
): number => {
  const value = record[field];
  const isSize = kind === 'size';

  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < (isSize ? 1 : 0)
  ) {
    const range = isSize ? 'above 0' : 'of at least 0';

    return fail(
      `${path}.${field} must be a whole number of texels ${range}, got ${describeValue(value)}.`,
    );
  }

  return value;
};

const readFiniteNumber = (
  record: JsonRecord,
  field: string,
  path: string,
): number => {
  const value = record[field];

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fail(
      `${path}.${field} must be a finite number, got ${describeValue(value)}.`,
    );
  }

  return value;
};

const readOptionalBoolean = (
  record: JsonRecord,
  field: string,
  path: string,
): boolean | undefined => {
  const value = record[field];

  if (value !== undefined && typeof value !== 'boolean') {
    return fail(
      `${path}.${field} must be true or false, got ${describeValue(value)}.`,
    );
  }

  return value;
};

/**
 * Reads `meta.scale`, which TexturePacker and Aseprite write as a string
 * (`"1"`) and free-tex-packer as a number.
 */
const readScale = (meta: JsonRecord): number => {
  const value = meta['scale'];

  if (value === undefined) {
    return 1;
  }

  const scale =
    typeof value === 'string' && value.trim() !== '' ? Number(value) : value;

  if (typeof scale !== 'number' || !Number.isFinite(scale) || scale <= 0) {
    return fail(
      `meta.scale must be a number above 0, or a string holding one, got ${describeValue(value)}.`,
    );
  }

  return scale;
};

const readImageName = (meta: JsonRecord): string | null => {
  const value = meta['image'];

  if (value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    return fail(`meta.image must be a string, got ${describeValue(value)}.`);
  }

  return value;
};

const readSize = (meta: JsonRecord): AtlasSize => {
  const size = readRecord(meta['size'], 'meta.size');

  return Object.freeze({
    width: readTexels(size, 'w', 'meta.size', 'size'),
    height: readTexels(size, 'h', 'meta.size', 'size'),
  });
};

const validateSpanFits = (
  path: string,
  [startField, start]: [string, number],
  [sizeField, size]: [string, number],
  [limitPath, limit]: [string, number],
): void => {
  if (start + size > limit) {
    fail(
      `${path} (${startField} ${start}, ${sizeField} ${size}) reaches past ${limitPath} of ${limit} texels.`,
    );
  }
};

const readFrameRect = (
  frame: JsonRecord,
  path: string,
  atlasSize: AtlasSize,
): FrameRect => {
  const rectPath = `${path}.frame`;
  const rect = readRecord(frame['frame'], rectPath);
  const x = readTexels(rect, 'x', rectPath, 'position');
  const y = readTexels(rect, 'y', rectPath, 'position');
  const w = readTexels(rect, 'w', rectPath, 'size');
  const h = readTexels(rect, 'h', rectPath, 'size');

  validateSpanFits(
    rectPath,
    ['x', x],
    ['w', w],
    ['meta.size.w', atlasSize.width],
  );
  validateSpanFits(
    rectPath,
    ['y', y],
    ['h', h],
    ['meta.size.h', atlasSize.height],
  );

  return { x, y, w, h };
};

const validateNotRotated = (frame: JsonRecord, path: string): void => {
  if (readOptionalBoolean(frame, 'rotated', path) === true) {
    fail(
      `${path} is rotated. Forge doesn't draw rotated frames; turn off rotation in the packer ("Allow rotation" in TexturePacker and free-tex-packer) and export again.`,
    );
  }
};

/**
 * Whether a frame's trim fields are read. A frame that says
 * `trimmed: false` is untrimmed, as every reader of the format treats it,
 * since some exporters write a `sourceSize` that only restates `frame`.
 * One without either trim field is untrimmed too.
 */
const hasTrim = (frame: JsonRecord, path: string): boolean => {
  const trimmed = readOptionalBoolean(frame, 'trimmed', path);
  const hasSpriteSourceSize = frame['spriteSourceSize'] !== undefined;
  const hasSourceSize = frame['sourceSize'] !== undefined;

  if (trimmed === false || (!hasSpriteSourceSize && !hasSourceSize)) {
    return false;
  }

  if (!hasSourceSize) {
    return fail(`${path} has a spriteSourceSize but no sourceSize.`);
  }

  if (!hasSpriteSourceSize) {
    return fail(`${path} has a sourceSize but no spriteSourceSize.`);
  }

  return true;
};

type FrameTrim = Pick<
  AtlasRegionRect,
  'sourceWidth' | 'sourceHeight' | 'trimX' | 'trimY'
>;

const readTrim = (
  frame: JsonRecord,
  path: string,
  rect: FrameRect,
): FrameTrim => {
  const trimPath = `${path}.spriteSourceSize`;
  const sourcePath = `${path}.sourceSize`;
  const trim = readRecord(frame['spriteSourceSize'], trimPath);
  const source = readRecord(frame['sourceSize'], sourcePath);
  const trimX = readTexels(trim, 'x', trimPath, 'position');
  const trimY = readTexels(trim, 'y', trimPath, 'position');
  const sourceWidth = readTexels(source, 'w', sourcePath, 'size');
  const sourceHeight = readTexels(source, 'h', sourcePath, 'size');

  for (const field of ['w', 'h'] as const) {
    const trimSize = readTexels(trim, field, trimPath, 'size');

    if (trimSize !== rect[field]) {
      fail(
        `${trimPath}.${field} (${trimSize}) doesn't match frame.${field} (${rect[field]}).`,
      );
    }
  }

  validateSpanFits(
    trimPath,
    ['x', trimX],
    ['w', rect.w],
    ['sourceSize.w', sourceWidth],
  );
  validateSpanFits(
    trimPath,
    ['y', trimY],
    ['h', rect.h],
    ['sourceSize.h', sourceHeight],
  );

  return { sourceWidth, sourceHeight, trimX, trimY };
};

/**
 * Reads a frame's optional pivot. TexturePacker normalizes it to the
 * untrimmed frame with `(0, 0)` at its top-left, Y-down, the same as
 * `AtlasRegionRect.pivot`, so it's copied as it is.
 */
const readPivot = (
  frame: JsonRecord,
  path: string,
): Pick<AtlasRegionRect, 'pivot'> => {
  if (frame['pivot'] === undefined) {
    return {};
  }

  const pivotPath = `${path}.pivot`;
  const pivot = readRecord(frame['pivot'], pivotPath);

  return {
    pivot: Object.freeze({
      x: readFiniteNumber(pivot, 'x', pivotPath),
      y: readFiniteNumber(pivot, 'y', pivotPath),
    }),
  };
};

const parseFrame = (
  name: string,
  value: unknown,
  path: string,
  atlasSize: AtlasSize,
): Readonly<AtlasRegionRect> => {
  const frame = readRecord(value, path);

  validateNotRotated(frame, path);

  const rect = readFrameRect(frame, path, atlasSize);
  const trim = hasTrim(frame, path) ? readTrim(frame, path, rect) : {};

  return Object.freeze({
    name,
    x: rect.x,
    y: rect.y,
    width: rect.w,
    height: rect.h,
    ...trim,
    ...readPivot(frame, path),
  });
};

const validateFrameCount = (count: number): void => {
  if (count === 0) {
    fail('frames is empty. The atlas must have at least one frame.');
  }

  if (count > maxFrameCount) {
    fail(
      `frames has ${count} frames, more than the ${maxFrameCount} an atlas may have.`,
    );
  }
};

const parseFrameArray = (
  frames: readonly unknown[],
  atlasSize: AtlasSize,
): Readonly<AtlasRegionRect>[] => {
  const indicesByName = new Map<string, number>();

  return frames.map((value, index) => {
    const entryPath = `frames[${index}]`;
    const frame = readRecord(value, entryPath);
    const name = frame['filename'];

    if (typeof name !== 'string' || name.length === 0) {
      return fail(
        `${entryPath}.filename must be a non-empty string, got ${describeValue(name)}.`,
      );
    }

    const path = `${entryPath} (${JSON.stringify(name)})`;
    const firstIndex = indicesByName.get(name);

    if (firstIndex !== undefined) {
      return fail(
        `${path} has the same filename as frames[${firstIndex}]. Frame names must be unique.`,
      );
    }

    indicesByName.set(name, index);

    return parseFrame(name, frame, path, atlasSize);
  });
};

const parseFrameHash = (
  frames: JsonRecord,
  atlasSize: AtlasSize,
): Readonly<AtlasRegionRect>[] =>
  Object.entries(frames).map(([name, value]) => {
    if (name.length === 0) {
      return fail('frames has a frame with an empty name.');
    }

    return parseFrame(
      name,
      value,
      `frames[${JSON.stringify(name)}]`,
      atlasSize,
    );
  });

const parseFrames = (
  root: JsonRecord,
  atlasSize: AtlasSize,
): Readonly<AtlasRegionRect>[] => {
  const frames = root['frames'];

  if (frames === undefined && root['textures'] !== undefined) {
    return fail(
      'it has a textures list instead of frames, so it describes a multi-page atlas. Export each page as its own "JSON (Hash)" or "JSON (Array)" file and load each as its own atlas.',
    );
  }

  if (Array.isArray(frames)) {
    validateFrameCount(frames.length);

    return parseFrameArray(frames, atlasSize);
  }

  if (!isRecord(frames)) {
    return fail(
      `frames must be an object (JSON (Hash)) or an array (JSON (Array)), got ${describeValue(frames)}.`,
    );
  }

  validateFrameCount(Object.keys(frames).length);

  return parseFrameHash(frames, atlasSize);
};

/**
 * Reads a TexturePacker "JSON (Hash)" or "JSON (Array)" file, the format
 * TexturePacker, free-tex-packer and Aseprite's sprite sheet export write,
 * into texel rects. Does no GL work, so it also reads JSON a game already
 * has (a bundler's JSON import). Pass the result, with the atlas image's
 * texture, to `createTexturePackerAtlas`, or load both files with
 * `TextureAtlasCache`.
 *
 * Each frame becomes one rect: `frame` is the packed rect, and
 * `spriteSourceSize` and `sourceSize` its trim (a frame with
 * `trimmed: false` is untrimmed). A frame's `pivot` is copied as it is,
 * since TexturePacker's is Y-down with `(0, 0)` at the untrimmed frame's
 * top-left, like Forge's; without one, the region pivots at its center.
 * Frame names are kept as written, extension included (turn on "Trim
 * sprite names" in TexturePacker to drop `.png`). Fields this doesn't
 * list, such as `animations`, `duration` and `meta.frameTags`, are
 * ignored.
 *
 * Rotated frames aren't supported: export with rotation off. Multi-page
 * files aren't either: export each page as its own file.
 * @param json - The parsed JSON file.
 * @returns The file's image size, scale and frame rects, frozen.
 * @throws An error, starting `Invalid TexturePacker atlas JSON:` and naming
 * the frame and field, if the file isn't an object with `frames` and
 * `meta.size`, `frames` is empty or has more than 100 000 frames, a field
 * has the wrong type or a value out of range, a frame is rotated or
 * reaches past `meta.size`, a trim doesn't fit its `sourceSize`, a
 * `spriteSourceSize` size doesn't match its `frame`, two frames share a
 * name, or it's a multi-page file.
 */
export function parseTexturePackerAtlas(json: unknown): TexturePackerAtlasData {
  const root = readRecord(json, 'the root');
  const meta = readRecord(root['meta'], 'meta');
  const size = readSize(meta);

  return Object.freeze({
    imageName: readImageName(meta),
    size,
    scale: readScale(meta),
    regions: Object.freeze(parseFrames(root, size)),
  });
}
