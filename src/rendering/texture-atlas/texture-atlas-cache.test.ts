/* eslint-disable @typescript-eslint/naming-convention */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImageCache } from '../../asset-loading/index.js';
import type { RenderContext } from '../render-context.js';
import { Texture } from '../texture.js';
import { TextureCache } from '../texture-cache.js';
import { TextureAtlasCache } from './texture-atlas-cache.js';

const buildJson = (): unknown => ({
  frames: {
    hero_idle_0: {
      frame: { x: 2, y: 2, w: 20, h: 30 },
      rotated: false,
      trimmed: true,
      spriteSourceSize: { x: 6, y: 2, w: 20, h: 30 },
      sourceSize: { w: 32, h: 32 },
      pivot: { x: 0.5, y: 1 },
    },
    coin: {
      frame: { x: 32, y: 0, w: 16, h: 16 },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: 16, h: 16 },
      sourceSize: { w: 16, h: 16 },
    },
  },
  meta: { image: 'hero.png', size: { w: 64, h: 32 }, scale: '1' },
});

const urls = {
  dataUrl: 'assets/atlases/hero.json',
  imageUrl: 'assets/atlases/hero-3f2a.png',
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

function createImage(width = 64, height = 32): HTMLImageElement {
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

function createRenderContext(
  imageCache: ImageCache = createImageCache(),
): RenderContext {
  const gl = {
    createTexture: vi.fn(() => ({})),
    bindTexture: vi.fn(),
    texParameteri: vi.fn(),
    texImage2D: vi.fn(),
    getExtension: vi.fn(() => null),
    isContextLost: vi.fn(() => false),
  } as unknown as WebGL2RenderingContext;

  const renderContext = { imageCache, gl } as unknown as RenderContext;

  Object.assign(renderContext, {
    textureCache: new TextureCache(renderContext),
  });

  return renderContext;
}

describe('TextureAtlasCache', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws when getting an atlas that has not been loaded', () => {
    const atlasCache = new TextureAtlasCache(createRenderContext());

    expect(() => atlasCache.get(urls.dataUrl)).toThrow(
      'Texture atlas with data URL "assets/atlases/hero.json" not found in the cache.',
    );
  });

  it('loads and caches an atlas from its JSON and image', async () => {
    mockFetchJsonResponse(buildJson());

    const imageCache = createImageCache();
    const atlasCache = new TextureAtlasCache(createRenderContext(imageCache));
    const atlas = await atlasCache.getOrLoad(urls);

    expect(fetch).toHaveBeenCalledWith('assets/atlases/hero.json');
    expect(imageCache.getOrLoad).toHaveBeenCalledWith(
      'assets/atlases/hero-3f2a.png',
    );
    expect(atlas.texture).toBeInstanceOf(Texture);
    expect(atlas.texture.filter).toBe('linear');
    expect(atlas.texture.wrap).toBe('clamp');
    expect(atlas.regions.map((region) => region.name)).toEqual([
      'hero_idle_0',
      'coin',
    ]);
    expect(atlas.getRegion('hero_idle_0').pivot).toEqual({ x: 0.5, y: 1 });
    expect(atlasCache.get(urls.dataUrl)).toBe(atlas);
  });

  it("loads the texture through the render context's texture cache, which owns it", async () => {
    mockFetchJsonResponse(buildJson());

    const renderContext = createRenderContext();
    const atlasCache = new TextureAtlasCache(renderContext);
    const atlas = await atlasCache.getOrLoad(urls, { filter: 'nearest' });

    expect(atlas.texture.filter).toBe('nearest');
    expect(
      renderContext.textureCache.get(urls.imageUrl, { filter: 'nearest' }),
    ).toBe(atlas.texture);
    expect(() => {
      atlas.texture.dispose();
    }).toThrow();
  });

  it('does not fetch an atlas again once it is cached', async () => {
    mockFetchJsonResponse(buildJson());

    const atlasCache = new TextureAtlasCache(createRenderContext());
    const first = await atlasCache.getOrLoad(urls);
    const second = await atlasCache.getOrLoad({ ...urls });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it('shares one load between concurrent requests for the same atlas', async () => {
    mockFetchJsonResponse(buildJson());

    const imageCache = createImageCache();
    const atlasCache = new TextureAtlasCache(createRenderContext(imageCache));
    const [first, second] = await Promise.all([
      atlasCache.getOrLoad(urls),
      atlasCache.getOrLoad({ ...urls }, { filter: 'linear' }),
    ]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(imageCache.getOrLoad).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it('throws when a loading atlas is requested with a different image', async () => {
    mockFetchJsonResponse(buildJson());

    const atlasCache = new TextureAtlasCache(createRenderContext());
    const firstLoad = atlasCache.getOrLoad(urls);

    await expect(
      atlasCache.getOrLoad({ ...urls, imageUrl: 'other.png' }),
    ).rejects.toThrow(
      'Texture atlas "assets/atlases/hero.json" was already requested with image "assets/atlases/hero-3f2a.png" and filter "linear", so it can\'t also be loaded with image "other.png" and filter "linear".',
    );
    await expect(firstLoad).resolves.toBeDefined();
  });

  it('throws when a loaded atlas is requested with a different filter', async () => {
    mockFetchJsonResponse(buildJson());

    const atlasCache = new TextureAtlasCache(createRenderContext());

    await atlasCache.getOrLoad(urls);

    await expect(
      atlasCache.getOrLoad(urls, { filter: 'nearest' }),
    ).rejects.toThrow(
      'so it can\'t also be loaded with image "assets/atlases/hero-3f2a.png" and filter "nearest".',
    );
  });

  it('rejects with the status when the JSON fetch fails', async () => {
    mockFetchJsonResponse({}, false);

    const atlasCache = new TextureAtlasCache(createRenderContext());

    await expect(atlasCache.getOrLoad(urls)).rejects.toThrow(
      'Unable to load texture atlas "assets/atlases/hero.json": failed to fetch its JSON: 404 Not Found',
    );
  });

  it("rejects with the parser's error when the JSON is invalid", async () => {
    mockFetchJsonResponse({ frames: {}, meta: { size: { w: 64, h: 32 } } });

    const atlasCache = new TextureAtlasCache(createRenderContext());

    await expect(atlasCache.getOrLoad(urls)).rejects.toThrow(
      'Unable to load texture atlas "assets/atlases/hero.json": Invalid TexturePacker atlas JSON: frames is empty.',
    );
  });

  it('keeps the original error as the cause', async () => {
    mockFetchJsonResponse({ frames: {}, meta: { size: { w: 64, h: 32 } } });

    const atlasCache = new TextureAtlasCache(createRenderContext());
    const error: unknown = await atlasCache
      .getOrLoad(urls)
      .catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).cause).toBeInstanceOf(Error);
    expect(((error as Error).cause as Error).message).toMatch(
      /^Invalid TexturePacker atlas JSON/,
    );
  });

  it("rejects when the image's size doesn't match meta.size", async () => {
    mockFetchJsonResponse(buildJson());

    const atlasCache = new TextureAtlasCache(
      createRenderContext(createImageCache(createImage(32, 32))),
    );

    await expect(atlasCache.getOrLoad(urls)).rejects.toThrow(
      'its texture is 32x32 texels, but the data\'s image "hero.png" is 64x32 (meta.size)',
    );
    expect(() => atlasCache.get(urls.dataUrl)).toThrow(/not found/);
  });

  it('rejects when the image fails to load', async () => {
    mockFetchJsonResponse(buildJson());

    const imageCache = new ImageCache();

    vi.spyOn(imageCache, 'getOrLoad').mockRejectedValue(
      new Error('Failed to load image'),
    );

    const atlasCache = new TextureAtlasCache(createRenderContext(imageCache));

    await expect(atlasCache.getOrLoad(urls)).rejects.toThrow(
      'Unable to load texture atlas "assets/atlases/hero.json": Failed to load image',
    );
  });

  it('loads again after a failed load', async () => {
    mockFetchJsonResponse({}, false);

    const atlasCache = new TextureAtlasCache(createRenderContext());

    await expect(atlasCache.getOrLoad(urls)).rejects.toThrow(
      /failed to fetch its JSON/,
    );

    mockFetchJsonResponse(buildJson());

    const atlas = await atlasCache.getOrLoad(urls, { filter: 'nearest' });

    expect(atlasCache.get(urls.dataUrl)).toBe(atlas);
  });
});
