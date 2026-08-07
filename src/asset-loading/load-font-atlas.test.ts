import { describe, expect, it, vi } from 'vitest';
import { ImageCache } from './asset-caches/index.js';
import { loadFontAtlas } from './load-font-atlas.js';

const msdfAtlasGenJson = {
  atlas: {
    distanceRange: 4,
    width: 512,
    height: 256,
    yOrigin: 'bottom' as const,
  },
  metrics: {
    emSize: 1,
    lineHeight: 1.2,
    ascender: 0.95,
    descender: -0.25,
  },
  glyphs: [
    { unicode: 32, advance: 0.25 },
    {
      unicode: 65,
      advance: 0.66,
      planeBounds: { left: 0.01, bottom: 0, right: 0.65, top: 0.68 },
      atlasBounds: { left: 100, bottom: 50, right: 164, top: 114 },
    },
  ],
  kerning: [{ unicode1: 65, unicode2: 86, advance: -0.06 }],
};

function mockJsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 404,
    statusText: ok ? 'OK' : 'Not Found',
    json: () => Promise.resolve(body),
  } as Response;
}

describe('loadFontAtlas', () => {
  it('parses metrics and glyphs from the msdf-atlas-gen JSON', async () => {
    const mockImage = new Image();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse(msdfAtlasGenJson),
    );

    const imageCache = new ImageCache();
    vi.spyOn(imageCache, 'getOrLoad').mockResolvedValue(mockImage);

    const fontAtlas = await loadFontAtlas('font.json', 'font.png', imageCache);

    expect(fontAtlas.image).toBe(mockImage);
    expect(fontAtlas.atlasWidth).toBe(512);
    expect(fontAtlas.atlasHeight).toBe(256);
    expect(fontAtlas.distanceRange).toBe(4);
    expect(fontAtlas.emSize).toBe(1);
    expect(fontAtlas.lineHeight).toBeCloseTo(1.2);
    expect(fontAtlas.ascender).toBeCloseTo(0.95);
    expect(fontAtlas.descender).toBeCloseTo(-0.25);
    expect(imageCache.getOrLoad).toHaveBeenCalledWith('font.png');
  });

  it('omits uv/plane bounds for glyphs with no visible shape', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse(msdfAtlasGenJson),
    );

    const imageCache = new ImageCache();
    vi.spyOn(imageCache, 'getOrLoad').mockResolvedValue(new Image());

    const fontAtlas = await loadFontAtlas('font.json', 'font.png', imageCache);

    const space = fontAtlas.glyphs.get(32);

    expect(space?.advance).toBe(0.25);
    expect(space?.planeBounds).toBeUndefined();
    expect(space?.uvOffset).toBeUndefined();
    expect(space?.uvScale).toBeUndefined();
  });

  it("converts a visible glyph's bottom-left-origin atlasBounds pixels into top-left-origin normalized uv rects", async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse(msdfAtlasGenJson),
    );

    const imageCache = new ImageCache();
    vi.spyOn(imageCache, 'getOrLoad').mockResolvedValue(new Image());

    const fontAtlas = await loadFontAtlas('font.json', 'font.png', imageCache);

    const glyphA = fontAtlas.glyphs.get(65);

    expect(glyphA?.planeBounds).toEqual({
      left: 0.01,
      bottom: 0,
      right: 0.65,
      top: 0.68,
    });
    // atlasBounds: left 100/512, right 164/512; top 114 -> 1 - 114/256, bottom 50 -> 1 - 50/256
    expect(glyphA?.uvOffset?.x).toBeCloseTo(100 / 512);
    expect(glyphA?.uvOffset?.y).toBeCloseTo(1 - 114 / 256);
    expect(glyphA?.uvScale?.x).toBeCloseTo((164 - 100) / 512);
    expect(glyphA?.uvScale?.y).toBeCloseTo(114 / 256 - 50 / 256);
  });

  it('parses kerning pairs keyed by "unicode1:unicode2"', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse(msdfAtlasGenJson),
    );

    const imageCache = new ImageCache();
    vi.spyOn(imageCache, 'getOrLoad').mockResolvedValue(new Image());

    const fontAtlas = await loadFontAtlas('font.json', 'font.png', imageCache);

    expect(fontAtlas.kerning.get('65:86')).toBeCloseTo(-0.06);
    expect(fontAtlas.kerning.get('65:65')).toBeUndefined();
  });

  it('throws when the metrics JSON fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse(undefined, false),
    );

    const imageCache = new ImageCache();

    await expect(
      loadFontAtlas('font.json', 'font.png', imageCache),
    ).rejects.toThrow(
      'Failed to fetch font atlas metrics at "font.json": 404 Not Found',
    );
  });

  it('defaults to no kerning when the JSON omits the kerning field', async () => {
    const jsonWithoutKerning = {
      atlas: msdfAtlasGenJson.atlas,
      metrics: msdfAtlasGenJson.metrics,
      glyphs: msdfAtlasGenJson.glyphs,
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse(jsonWithoutKerning),
    );

    const imageCache = new ImageCache();
    vi.spyOn(imageCache, 'getOrLoad').mockResolvedValue(new Image());

    const fontAtlas = await loadFontAtlas('font.json', 'font.png', imageCache);

    expect(fontAtlas.kerning.size).toBe(0);
  });
});
