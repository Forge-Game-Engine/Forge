import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImageCache } from '../../asset-loading/index.js';
import { CURRENT_FONT_ATLAS_FORMAT_VERSION } from './font-atlas-data.js';
import type { FontAtlasFileData } from './font-atlas-file-data.js';
import { FontAtlasCache } from './font-atlas-cache.js';

const buildValidJson = (): FontAtlasFileData => ({
  formatVersion: CURRENT_FONT_ATLAS_FORMAT_VERSION,
  type: 'msdf',
  atlasSize: { width: 512, height: 512 },
  distanceRange: 4,
  metrics: { lineHeight: 1.2, ascender: 0.9, descender: -0.2, capHeight: 0.7 },
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

const urls = {
  metricsUrl: 'assets/fonts/my-font.json',
  imageUrl: 'assets/fonts/my-font.png',
};

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

function createImage(width = 512, height = 512): HTMLImageElement {
  const image = new Image();

  Object.defineProperty(image, 'naturalWidth', { value: width });
  Object.defineProperty(image, 'naturalHeight', { value: height });

  return image;
}

function createImageCache(image = createImage()): ImageCache {
  const imageCache = new ImageCache();

  vi.spyOn(imageCache, 'getOrLoad').mockResolvedValue(image);

  return imageCache;
}

describe('FontAtlasCache', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should throw when getting a font atlas that has not been loaded', () => {
    const fontAtlasCache = new FontAtlasCache();

    expect(() => fontAtlasCache.get('assets/fonts/my-font.json')).toThrow(
      'Font atlas with metrics URL "assets/fonts/my-font.json" not found in store.',
    );
  });

  it('should load and cache a valid font atlas', async () => {
    mockFetchJsonResponse(buildValidJson());

    const image = createImage();
    const imageCache = createImageCache(image);
    const fontAtlasCache = new FontAtlasCache(imageCache);
    const fontAtlas = await fontAtlasCache.getOrLoad(urls);

    expect(fetch).toHaveBeenCalledWith('assets/fonts/my-font.json');
    expect(imageCache.getOrLoad).toHaveBeenCalledWith(
      'assets/fonts/my-font.png',
    );
    expect(fontAtlas.image).toBe(image);
    expect(fontAtlas.data.glyphs.get(65)?.advance).toBeCloseTo(0.6);
    expect(fontAtlasCache.get('assets/fonts/my-font.json')).toBe(fontAtlas);
  });

  it.each([
    {
      name: 'different directories with query strings',
      metricsUrl: '/assets/metrics/my-font.json?v=a/b',
      imageUrl: '/static/images/my-font-3f2a.png?v=c/d#e',
    },
    {
      name: 'blob URLs',
      metricsUrl: 'blob:https://example.com/0f1e2d3c',
      imageUrl: 'blob:https://example.com/4b5a6978',
    },
  ])(
    'should load the image from its own URL ($name)',
    async ({ metricsUrl, imageUrl }) => {
      mockFetchJsonResponse(buildValidJson());

      const imageCache = createImageCache();
      const fontAtlasCache = new FontAtlasCache(imageCache);
      await fontAtlasCache.getOrLoad({ metricsUrl, imageUrl });

      expect(fetch).toHaveBeenCalledWith(metricsUrl);
      expect(imageCache.getOrLoad).toHaveBeenCalledWith(imageUrl);
    },
  );

  it('should load a metrics file that still names its atlas image', async () => {
    mockFetchJsonResponse({ ...buildValidJson(), atlasImage: 'other.png' });

    const imageCache = createImageCache();
    const fontAtlasCache = new FontAtlasCache(imageCache);
    await fontAtlasCache.getOrLoad(urls);

    expect(imageCache.getOrLoad).toHaveBeenCalledWith(
      'assets/fonts/my-font.png',
    );
  });

  it('should not re-fetch a font atlas that is already cached', async () => {
    mockFetchJsonResponse(buildValidJson());

    const fontAtlasCache = new FontAtlasCache(createImageCache());
    const first = await fontAtlasCache.getOrLoad(urls);
    const second = await fontAtlasCache.getOrLoad(urls);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it('should share one load between concurrent requests for the same atlas', async () => {
    mockFetchJsonResponse(buildValidJson());

    const imageCache = createImageCache();
    const fontAtlasCache = new FontAtlasCache(imageCache);
    const [first, second] = await Promise.all([
      fontAtlasCache.getOrLoad(urls),
      fontAtlasCache.getOrLoad({ ...urls }),
    ]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(imageCache.getOrLoad).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it('should throw when a loading atlas is requested with a different image', async () => {
    mockFetchJsonResponse(buildValidJson());

    const fontAtlasCache = new FontAtlasCache(createImageCache());
    const firstLoad = fontAtlasCache.getOrLoad(urls);

    await expect(
      fontAtlasCache.getOrLoad({ ...urls, imageUrl: 'other-font.png' }),
    ).rejects.toThrow(
      'Font atlas "assets/fonts/my-font.json" was already requested with image "assets/fonts/my-font.png", so it can\'t also be loaded with image "other-font.png".',
    );
    await expect(firstLoad).resolves.toBeDefined();
  });

  it('should throw when a loaded atlas is requested with a different image', async () => {
    mockFetchJsonResponse(buildValidJson());

    const fontAtlasCache = new FontAtlasCache(createImageCache());
    await fontAtlasCache.getOrLoad(urls);

    await expect(
      fontAtlasCache.getOrLoad({ ...urls, imageUrl: 'other-font.png' }),
    ).rejects.toThrow(/was already requested with image/);
  });

  it("should throw when the image's size doesn't match the metrics' atlasSize", async () => {
    mockFetchJsonResponse(buildValidJson());

    const fontAtlasCache = new FontAtlasCache(
      createImageCache(createImage(256, 512)),
    );

    await expect(fontAtlasCache.getOrLoad(urls)).rejects.toThrow(
      'Font atlas image "assets/fonts/my-font.png" is 256x512, but the metrics at "assets/fonts/my-font.json" expect 512x512. Check that both files come from the same generated atlas.',
    );
    expect(() => fontAtlasCache.get(urls.metricsUrl)).toThrow(
      /not found in store/,
    );
  });

  it('should load again after a failed load', async () => {
    mockFetchJsonResponse({}, false);

    const fontAtlasCache = new FontAtlasCache(createImageCache());

    await expect(fontAtlasCache.getOrLoad(urls)).rejects.toThrow(
      /Failed to load font atlas JSON/,
    );

    mockFetchJsonResponse(buildValidJson());

    await expect(fontAtlasCache.getOrLoad(urls)).resolves.toBeDefined();
  });

  it('should throw a descriptive error when the JSON fetch fails', async () => {
    mockFetchJsonResponse({}, false);

    const fontAtlasCache = new FontAtlasCache(createImageCache());

    await expect(
      fontAtlasCache.getOrLoad({
        metricsUrl: 'assets/fonts/missing-font.json',
        imageUrl: 'assets/fonts/missing-font.png',
      }),
    ).rejects.toThrow(
      'Failed to load font atlas JSON at "assets/fonts/missing-font.json": 404 Not Found',
    );
  });

  it('should throw a descriptive error when the JSON is malformed', async () => {
    mockFetchJsonResponse({ formatVersion: 999 });

    const fontAtlasCache = new FontAtlasCache(createImageCache());

    await expect(fontAtlasCache.getOrLoad(urls)).rejects.toThrow(
      /unsupported formatVersion "999"/,
    );
  });
});
