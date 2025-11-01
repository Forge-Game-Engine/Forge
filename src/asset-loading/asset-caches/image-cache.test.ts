import { describe, expect, it, vi } from 'vitest';
import { ImageCache } from './image-cache';

describe('ImageCache', () => {
  it('should retrieve an image from the cache', () => {
    const imageCache = new ImageCache();
    const mockImage = new Image();
    imageCache.assets.set('path/to/image.png', mockImage);

    const retrievedImage = imageCache.get('path/to/image.png');

    expect(retrievedImage).toBe(mockImage);
  });

  it('should throw an error if the image is not found in the cache', () => {
    const imageCache = new ImageCache();

    expect(() => imageCache.get('path/to/nonexistent.png')).toThrow(
      'Image with path "path/to/nonexistent.png" not found in store.',
    );
  });

  it('should load and cache an image', async () => {
    const imageCache = new ImageCache();
    const mockImage = new Image();

    mockImage.src = 'path/to/image.png';
    mockImage.onload = vi.fn();
    mockImage.onerror = vi.fn();

    vi.spyOn(globalThis, 'Image').mockImplementation(function () {
      return mockImage;
    });

    const imageLoadPromise = imageCache.load('path/to/image.png');

    mockImage.onload?.(new Event('load'));

    await expect(imageLoadPromise).resolves.toBeUndefined();
  });

  it('should throw an error if the image fails to load', async () => {
    const imageCache = new ImageCache();
    const mockImage = new Image();

    mockImage.src = 'path/to/image.png';
    mockImage.onload = vi.fn();
    mockImage.onerror = vi.fn();

    vi.spyOn(globalThis, 'Image').mockImplementation(function () {
      return mockImage;
    });

    const imageLoadPromise = imageCache.load('path/to/image.png');

    mockImage.onerror?.(new Event('error'));

    await expect(imageLoadPromise).rejects.toThrow(
      'Failed to load image at path/to/image.png',
    );
  });

  it('should retrieve an image from the cache if it exists, otherwise load and cache it', async () => {
    const imageCache = new ImageCache();
    const mockImage = new Image();

    mockImage.src = 'path/to/image.png';
    mockImage.onload = vi.fn();
    mockImage.onerror = vi.fn();

    vi.spyOn(globalThis, 'Image').mockImplementation(function () {
      return mockImage;
    });

    const retrievedImagePromise = imageCache.getOrLoad('path/to/image.png');

    mockImage.onload?.(new Event('load'));
    const retrievedImage = await retrievedImagePromise;

    expect(retrievedImage).toBe(mockImage);
    expect(imageCache.assets.get('path/to/image.png')).toBe(mockImage);
  });
});
