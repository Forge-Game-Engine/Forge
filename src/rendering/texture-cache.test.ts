import { describe, expect, it, vi } from 'vitest';
import { ImageCache } from '../asset-loading/index.js';
import type { RenderContext } from './render-context.js';
import { TextureCache } from './texture-cache.js';

const url = 'assets/ship.png';

function createImage(width = 32, height = 16): HTMLImageElement {
  const image = new Image();

  Object.defineProperty(image, 'naturalWidth', { value: width });
  Object.defineProperty(image, 'naturalHeight', { value: height });

  return image;
}

function createTextureCache(imageCache = new ImageCache()): {
  textureCache: TextureCache;
  gl: WebGL2RenderingContext;
} {
  const gl = {
    createTexture: vi.fn(() => ({})),
    bindTexture: vi.fn(),
    texParameteri: vi.fn(),
    texImage2D: vi.fn(),
    deleteTexture: vi.fn(),
  } as unknown as WebGL2RenderingContext;
  const renderContext = { imageCache, gl } as unknown as RenderContext;

  return { textureCache: new TextureCache(renderContext), gl };
}

function createImageCache(image = createImage()): ImageCache {
  const imageCache = new ImageCache();

  vi.spyOn(imageCache, 'getOrLoad').mockResolvedValue(image);

  return imageCache;
}

describe('TextureCache', () => {
  it('creates a texture from the image at the URL', async () => {
    const imageCache = createImageCache();
    const { textureCache } = createTextureCache(imageCache);

    const texture = await textureCache.getOrLoad(url);

    expect(imageCache.getOrLoad).toHaveBeenCalledWith(url);
    expect(texture.width).toBe(32);
    expect(texture.height).toBe(16);
    expect(texture.filter).toBe('linear');
    expect(texture.wrap).toBe('clamp');
    expect(textureCache.get(url)).toBe(texture);
  });

  it('returns the same texture for every request for the same URL', async () => {
    const { textureCache, gl } = createTextureCache(createImageCache());

    const first = await textureCache.getOrLoad(url);
    const second = await textureCache.getOrLoad(url);

    expect(second).toBe(first);
    expect(gl.createTexture).toHaveBeenCalledTimes(1);
  });

  it('shares one load between concurrent requests', async () => {
    const imageCache = createImageCache();
    const { textureCache, gl } = createTextureCache(imageCache);

    const [first, second] = await Promise.all([
      textureCache.getOrLoad(url),
      textureCache.getOrLoad(url),
    ]);

    expect(second).toBe(first);
    expect(imageCache.getOrLoad).toHaveBeenCalledTimes(1);
    expect(gl.createTexture).toHaveBeenCalledTimes(1);
  });

  it('keys textures by their resolved sampling options', async () => {
    const { textureCache } = createTextureCache(createImageCache());

    const linear = await textureCache.getOrLoad(url);
    const explicitLinear = await textureCache.getOrLoad(url, {
      filter: 'linear',
      wrap: undefined,
    });
    const nearest = await textureCache.getOrLoad(url, { filter: 'nearest' });

    expect(explicitLinear).toBe(linear);
    expect(nearest).not.toBe(linear);
    expect(nearest.filter).toBe('nearest');
    expect(textureCache.get(url, { filter: 'nearest' })).toBe(nearest);
  });

  it('owns its textures, so they cannot be updated or disposed', async () => {
    const { textureCache } = createTextureCache(createImageCache());

    const texture = await textureCache.getOrLoad(url);

    expect(() => texture.dispose()).toThrow(/texture cache/);
    expect(() => texture.update(createImage())).toThrow(/texture cache/);
  });

  it('throws from get for a texture that is not loaded', () => {
    const { textureCache } = createTextureCache();

    expect(() => textureCache.get(url)).toThrow(url);
  });

  it('rejects when the image fails to load, and loads again on the next request', async () => {
    const imageCache = new ImageCache();
    const loadError = new Error('Failed to load image');

    vi.spyOn(imageCache, 'getOrLoad')
      .mockRejectedValueOnce(loadError)
      .mockResolvedValueOnce(createImage());

    const { textureCache } = createTextureCache(imageCache);

    await expect(textureCache.getOrLoad(url)).rejects.toBe(loadError);

    const texture = await textureCache.getOrLoad(url);

    expect(textureCache.get(url)).toBe(texture);
  });
});
