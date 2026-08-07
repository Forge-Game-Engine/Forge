import { Vector2 } from '../math/index.js';
import {
  FontAtlas,
  FontAtlasGlyph,
  getKerningKey,
} from './types/font-atlas.js';
import { ImageCache } from './asset-caches/index.js';

/**
 * The subset of `msdf-atlas-gen`'s JSON output this loader reads. Other
 * fields the tool emits (e.g. per-glyph `index`, `atlas.type`) are ignored.
 */
interface MsdfAtlasGenJson {
  atlas: {
    distanceRange: number;
    width: number;
    height: number;
    yOrigin?: 'bottom' | 'top';
  };
  metrics: {
    emSize: number;
    lineHeight: number;
    ascender: number;
    descender: number;
  };
  glyphs: {
    unicode: number;
    advance: number;
    planeBounds?: { left: number; bottom: number; right: number; top: number };
    atlasBounds?: { left: number; bottom: number; right: number; top: number };
  }[];
  kerning?: { unicode1: number; unicode2: number; advance: number }[];
}

/**
 * Converts a glyph's `atlasBounds` (pixels, measured from the bottom-left
 * per `msdf-atlas-gen`'s default `yOrigin: "bottom"`) into
 * `uvOffset`/`uvScale` (0 to 1, top-left origin), matching
 * `SpriteEcsComponent.uvOffset`'s convention.
 */
function toUvRect(
  atlasBounds: { left: number; bottom: number; right: number; top: number },
  atlasWidth: number,
  atlasHeight: number,
  yOrigin: 'bottom' | 'top',
): { uvOffset: Vector2; uvScale: Vector2 } {
  const top =
    yOrigin === 'bottom'
      ? 1 - atlasBounds.top / atlasHeight
      : atlasBounds.top / atlasHeight;
  const bottom =
    yOrigin === 'bottom'
      ? 1 - atlasBounds.bottom / atlasHeight
      : atlasBounds.bottom / atlasHeight;

  return {
    uvOffset: { x: atlasBounds.left / atlasWidth, y: top },
    uvScale: {
      x: (atlasBounds.right - atlasBounds.left) / atlasWidth,
      y: bottom - top,
    },
  };
}

function parseGlyphs(
  json: MsdfAtlasGenJson,
): ReadonlyMap<number, FontAtlasGlyph> {
  const glyphs = new Map<number, FontAtlasGlyph>();
  const {
    width: atlasWidth,
    height: atlasHeight,
    yOrigin = 'bottom',
  } = json.atlas;

  for (const glyph of json.glyphs) {
    const uvRect = glyph.atlasBounds
      ? toUvRect(glyph.atlasBounds, atlasWidth, atlasHeight, yOrigin)
      : undefined;

    glyphs.set(glyph.unicode, {
      advance: glyph.advance,
      planeBounds: glyph.planeBounds,
      uvOffset: uvRect?.uvOffset,
      uvScale: uvRect?.uvScale,
    });
  }

  return glyphs;
}

function parseKerning(json: MsdfAtlasGenJson): ReadonlyMap<string, number> {
  const kerning = new Map<string, number>();

  for (const pair of json.kerning ?? []) {
    kerning.set(getKerningKey(pair.unicode1, pair.unicode2), pair.advance);
  }

  return kerning;
}

/**
 * Loads an MSDF font atlas produced by
 * [`msdf-atlas-gen`](https://github.com/Chlumsky/msdf-atlas-gen): its JSON
 * metrics file and its atlas PNG. Data-only - build the GPU-side
 * `Renderable` for drawing text with the loaded atlas via
 * `createMsdfTextRenderable` (`/rendering`).
 * @param jsonPath - The URL of the atlas's `msdf-atlas-gen` JSON metrics file.
 * @param imagePath - The URL of the atlas's PNG texture.
 * @param imageCache - The image cache to load `imagePath` through.
 * @returns The parsed font atlas.
 * @throws An error if the JSON metrics file can't be fetched or parsed.
 */
export async function loadFontAtlas(
  jsonPath: string,
  imagePath: string,
  imageCache: ImageCache,
): Promise<FontAtlas> {
  const response = await fetch(jsonPath);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch font atlas metrics at "${jsonPath}": ${response.status} ${response.statusText}`,
    );
  }

  const json = (await response.json()) as MsdfAtlasGenJson;
  const image = await imageCache.getOrLoad(imagePath);

  return {
    image,
    atlasWidth: json.atlas.width,
    atlasHeight: json.atlas.height,
    distanceRange: json.atlas.distanceRange,
    emSize: json.metrics.emSize,
    lineHeight: json.metrics.lineHeight,
    ascender: json.metrics.ascender,
    descender: json.metrics.descender,
    glyphs: parseGlyphs(json),
    kerning: parseKerning(json),
  };
}
