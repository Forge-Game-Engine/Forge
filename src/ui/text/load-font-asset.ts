import { Vector2 } from '../../math/index.js';
import { RenderContext } from '../../rendering/render-context.js';
import type {
  BmFontJson,
  FontAsset,
  GlyphMetrics,
  SdfType,
} from './types/font-asset.js';

/** Module-level cache keyed by `"${jsonUrl}|${atlasUrl}"`. */
const fontAssetCache = new Map<string, FontAsset>();

/** Module-level WebGLTexture cache keyed by atlas URL. */
const textureCache = new Map<string, WebGLTexture>();

function loadAtlasImage(url: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      img.onload = null;
      img.onerror = null;
      resolve(img);
    };

    img.onerror = () => {
      img.onload = null;
      img.onerror = null;
      reject(new Error(`Failed to load font atlas image at "${url}".`));
    };

    img.src = url;
  });
}

function uploadTexture(
  gl: WebGL2RenderingContext,
  image: HTMLImageElement,
): WebGLTexture {
  const texture = gl.createTexture();

  if (!texture) {
    throw new Error('Failed to create WebGLTexture for font atlas.');
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);

  return texture;
}

async function getOrLoadTexture(
  gl: WebGL2RenderingContext,
  atlasUrl: string,
): Promise<WebGLTexture> {
  const cached = textureCache.get(atlasUrl);

  if (cached) {
    return cached;
  }

  const image = await loadAtlasImage(atlasUrl);
  const texture = uploadTexture(gl, image);

  textureCache.set(atlasUrl, texture);

  return texture;
}

function parseBmFont(json: BmFontJson, texture: WebGLTexture): FontAsset {
  const { common, chars, kernings, distanceField } = json;
  const scaleW = common.scaleW;
  const scaleH = common.scaleH;

  const glyphs = new Map<number, GlyphMetrics>();

  for (const c of chars) {
    glyphs.set(c.id, {
      codepoint: c.id,
      uvRect: {
        x: c.x / scaleW,
        y: c.y / scaleH,
        w: c.width / scaleW,
        h: c.height / scaleH,
      },
      size: { w: c.width, h: c.height },
      bearing: { x: c.xoffset, y: c.yoffset },
      advance: c.xadvance,
    });
  }

  let kerningMap: Map<number, Map<number, number>> | undefined;

  if (kernings && kernings.length > 0) {
    kerningMap = new Map();

    for (const k of kernings) {
      let inner = kerningMap.get(k.first);

      if (!inner) {
        inner = new Map();
        kerningMap.set(k.first, inner);
      }

      inner.set(k.second, k.amount);
    }
  }

  const lineHeight = common.lineHeight;
  const base = common.base;
  const sdfType: SdfType = distanceField?.fieldType === 'msdf' ? 'msdf' : 'sdf';
  const distanceRange = distanceField?.distanceRange ?? 4;

  return {
    texture,
    atlasSize: new Vector2(scaleW, scaleH),
    lineHeight,
    ascent: base,
    descent: lineHeight - base,
    base,
    distanceRange,
    sdfType,
    glyphs,
    kerning: kerningMap,
  };
}

/**
 * Loads a font asset from a BMFont JSON file and an atlas image, uploads the
 * atlas as a `WebGLTexture`, and returns a {@link FontAsset} ready for
 * {@link createUiText}.
 *
 * Results are cached by `(jsonUrl, atlasUrl)` pair so repeated calls share a
 * single `WebGLTexture` and do not re-fetch.
 *
 * @param renderContext - The WebGL render context used to upload the texture.
 * @param jsonUrl - URL of the BMFont JSON metrics file.
 * @param atlasUrl - URL of the atlas image (PNG).
 * @returns A promise that resolves to the ready-to-use {@link FontAsset}.
 */
export async function loadFontAsset(
  renderContext: RenderContext,
  jsonUrl: string,
  atlasUrl: string,
): Promise<FontAsset> {
  const cacheKey = `${jsonUrl}|${atlasUrl}`;
  const cached = fontAssetCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const [json, texture] = await Promise.all([
    fetch(jsonUrl).then((r) => r.json() as Promise<BmFontJson>),
    getOrLoadTexture(renderContext.gl, atlasUrl),
  ]);

  const font = parseBmFont(json, texture);

  fontAssetCache.set(cacheKey, font);

  return font;
}
