import { describe, expect, it } from 'vitest';
import { createTextureImport } from './create-texture-import';

describe('createTextureImport', () => {
  it('should default pixelsPerUnit to 100 and derive width/height from the image', () => {
    const image = { width: 200, height: 100 } as HTMLImageElement;

    const textureImport = createTextureImport(image);

    expect(textureImport.pixelsPerUnit).toBe(100);
    expect(textureImport.width).toBe(200);
    expect(textureImport.height).toBe(100);
    expect(textureImport.worldWidth).toBe(2);
    expect(textureImport.worldHeight).toBe(1);
    expect(textureImport.image).toBe(image);
  });

  it('should compute world size using an explicit pixelsPerUnit', () => {
    const image = { width: 320, height: 320 } as HTMLImageElement;

    const textureImport = createTextureImport(image, { pixelsPerUnit: 32 });

    expect(textureImport.worldWidth).toBe(10);
    expect(textureImport.worldHeight).toBe(10);
  });

  it('should use explicit width/height instead of the image dimensions when given', () => {
    const image = { width: 512, height: 512 } as HTMLImageElement;

    const textureImport = createTextureImport(image, {
      width: 64,
      height: 32,
      pixelsPerUnit: 16,
    });

    expect(textureImport.width).toBe(64);
    expect(textureImport.height).toBe(32);
    expect(textureImport.worldWidth).toBe(4);
    expect(textureImport.worldHeight).toBe(2);
  });

  it('should fall back to the default pixelsPerUnit when explicitly given as undefined', () => {
    const image = { width: 200, height: 100 } as HTMLImageElement;

    const textureImport = createTextureImport(image, {
      pixelsPerUnit: undefined,
      width: undefined,
      height: undefined,
    });

    expect(textureImport.pixelsPerUnit).toBe(100);
    expect(textureImport.width).toBe(200);
    expect(textureImport.height).toBe(100);
  });

  it('should throw when pixelsPerUnit is not positive', () => {
    const image = { width: 100, height: 100 } as HTMLImageElement;

    expect(() => createTextureImport(image, { pixelsPerUnit: 0 })).toThrow();
    expect(() => createTextureImport(image, { pixelsPerUnit: -10 })).toThrow();
  });

  it('should throw when width or height is not positive', () => {
    const image = { width: 100, height: 100 } as HTMLImageElement;

    expect(() => createTextureImport(image, { width: 0 })).toThrow();
    expect(() => createTextureImport(image, { height: -1 })).toThrow();
  });
});
