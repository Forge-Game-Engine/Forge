import { describe, expect, it, vi } from 'vitest';
import { ImageCache } from '../../asset-loading/index.js';
import { CURRENT_FONT_ATLAS_FORMAT_VERSION } from './font-atlas-data.js';
import type { FontAtlasFileData } from './font-atlas-file-data.js';
import { FontAtlasCache } from './font-atlas-cache.js';

const buildValidJson = (): FontAtlasFileData => ({
  formatVersion: CURRENT_FONT_ATLAS_FORMAT_VERSION,
  type: 'msdf',
  atlasImage: 'my-font.png',
  atlasSize: { width: 512, height: 512 },
  distanceRange: 4,
  metrics: { lineHeight: 1.2, ascender: 0.9, descender: -0.2 },
  glyphs: [
    {
      codePoint: 65,
      advance: 0.6,
      planeBounds: { left: 0.05, bottom: 0, right: 0.55, top: 0.7 },
      atlasBounds: { left: 0.1, bottom: 0.2, right: 0.2, top: 0.3 },
    },
  ],
  kerning: {},
});

function mockFetchJsonResponse(json: unknown, ok = true): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 404,
      statusText: ok ? 'OK' : 'Not Found',
      json: () => Promise.resolve(json),
    }),
  );
}

describe('FontAtlasCache', () => {
  it('should throw when getting a font atlas that has not been loaded', () => {
    const fontAtlasCache = new FontAtlasCache();

    expect(() => fontAtlasCache.get('assets/fonts/my-font.json')).toThrow(
      'Font atlas with key "assets/fonts/my-font.json" not found in store.',
    );
  });

  it('should load and cache a valid font atlas', async () => {
    mockFetchJsonResponse(buildValidJson());

    const mockImage = new Image();
    const imageCache = new ImageCache();
    const getOrLoadSpy = vi
      .spyOn(imageCache, 'getOrLoad')
      .mockResolvedValue(mockImage);

    const fontAtlasCache = new FontAtlasCache(imageCache);
    const fontAtlas = await fontAtlasCache.getOrLoad(
      'assets/fonts/my-font.json',
    );

    expect(fetch).toHaveBeenCalledWith('assets/fonts/my-font.json');
    expect(getOrLoadSpy).toHaveBeenCalledWith('assets/fonts/my-font.png');
    expect(fontAtlas.image).toBe(mockImage);
    expect(fontAtlas.data.glyphs.get(65)?.advance).toBeCloseTo(0.6);
    expect(fontAtlasCache.get('assets/fonts/my-font.json')).toBe(fontAtlas);
  });

  it('should resolve the atlas image relative to a nested key', async () => {
    mockFetchJsonResponse(buildValidJson());

    const imageCache = new ImageCache();
    const getOrLoadSpy = vi
      .spyOn(imageCache, 'getOrLoad')
      .mockResolvedValue(new Image());

    const fontAtlasCache = new FontAtlasCache(imageCache);
    await fontAtlasCache.getOrLoad('assets/fonts/heading/my-font.json');

    expect(getOrLoadSpy).toHaveBeenCalledWith(
      'assets/fonts/heading/my-font.png',
    );
  });

  it('should resolve the atlas image relative to a root-level key', async () => {
    mockFetchJsonResponse(buildValidJson());

    const imageCache = new ImageCache();
    const getOrLoadSpy = vi
      .spyOn(imageCache, 'getOrLoad')
      .mockResolvedValue(new Image());

    const fontAtlasCache = new FontAtlasCache(imageCache);
    await fontAtlasCache.getOrLoad('my-font.json');

    expect(getOrLoadSpy).toHaveBeenCalledWith('my-font.png');
  });

  it('should not re-fetch a font atlas that is already cached', async () => {
    mockFetchJsonResponse(buildValidJson());

    const imageCache = new ImageCache();
    vi.spyOn(imageCache, 'getOrLoad').mockResolvedValue(new Image());

    const fontAtlasCache = new FontAtlasCache(imageCache);
    await fontAtlasCache.getOrLoad('assets/fonts/my-font.json');
    await fontAtlasCache.getOrLoad('assets/fonts/my-font.json');

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should throw a descriptive error when the JSON fetch fails', async () => {
    mockFetchJsonResponse({}, false);

    const fontAtlasCache = new FontAtlasCache();

    await expect(
      fontAtlasCache.getOrLoad('assets/fonts/missing-font.json'),
    ).rejects.toThrow(
      'Failed to load font atlas JSON at "assets/fonts/missing-font.json": 404 Not Found',
    );
  });

  it('should throw a descriptive error when the JSON is malformed', async () => {
    mockFetchJsonResponse({ formatVersion: 999 });

    const fontAtlasCache = new FontAtlasCache();

    await expect(
      fontAtlasCache.getOrLoad('assets/fonts/broken-font.json'),
    ).rejects.toThrow(/unsupported formatVersion "999"/);
  });
});
