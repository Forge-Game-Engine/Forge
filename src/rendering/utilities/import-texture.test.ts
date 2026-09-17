import { describe, expect, it } from 'vitest';
import { importTexture } from './import-texture';

describe('importTexture', () => {
  it('should default pixelsPerUnit to 100 and derive width/height from the image', () => {
    const image = { width: 200, height: 100 } as HTMLImageElement;

    const importedTexture = importTexture(image);

    expect(importedTexture.pixelsPerUnit).toBe(100);
    expect(importedTexture.width).toBe(200);
    expect(importedTexture.height).toBe(100);
    expect(importedTexture.worldWidth).toBe(2);
    expect(importedTexture.worldHeight).toBe(1);
    expect(importedTexture.image).toBe(image);
  });

  it('should compute world size using an explicit pixelsPerUnit', () => {
    const image = { width: 320, height: 320 } as HTMLImageElement;

    const importedTexture = importTexture(image, { pixelsPerUnit: 32 });

    expect(importedTexture.worldWidth).toBe(10);
    expect(importedTexture.worldHeight).toBe(10);
  });

  it('should use explicit width/height instead of the image dimensions when given', () => {
    const image = { width: 512, height: 512 } as HTMLImageElement;

    const importedTexture = importTexture(image, {
      width: 64,
      height: 32,
      pixelsPerUnit: 16,
    });

    expect(importedTexture.width).toBe(64);
    expect(importedTexture.height).toBe(32);
    expect(importedTexture.worldWidth).toBe(4);
    expect(importedTexture.worldHeight).toBe(2);
  });

  it('should fall back to the default pixelsPerUnit when explicitly given as undefined', () => {
    const image = { width: 200, height: 100 } as HTMLImageElement;

    const importedTexture = importTexture(image, {
      pixelsPerUnit: undefined,
      width: undefined,
      height: undefined,
    });

    expect(importedTexture.pixelsPerUnit).toBe(100);
    expect(importedTexture.width).toBe(200);
    expect(importedTexture.height).toBe(100);
  });

  it('should throw when pixelsPerUnit is not positive', () => {
    const image = { width: 100, height: 100 } as HTMLImageElement;

    expect(() => importTexture(image, { pixelsPerUnit: 0 })).toThrow();
    expect(() => importTexture(image, { pixelsPerUnit: -10 })).toThrow();
  });

  it('should throw when width or height is not positive', () => {
    const image = { width: 100, height: 100 } as HTMLImageElement;

    expect(() => importTexture(image, { width: 0 })).toThrow();
    expect(() => importTexture(image, { height: -1 })).toThrow();
  });
});
