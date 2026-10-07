import { describe, expect, it } from 'vitest';
import type { Texture } from '../texture.js';
import { importTexture } from './import-texture';

describe('importTexture', () => {
  it('should default pixelsPerUnit to 100 and derive width/height from the texture', () => {
    const texture = { width: 200, height: 100 } as Texture;

    const importedTexture = importTexture(texture);

    expect(importedTexture.pixelsPerUnit).toBe(100);
    expect(importedTexture.width).toBe(200);
    expect(importedTexture.height).toBe(100);
    expect(importedTexture.worldWidth).toBe(2);
    expect(importedTexture.worldHeight).toBe(1);
    expect(importedTexture.texture).toBe(texture);
  });

  it('should compute world size using an explicit pixelsPerUnit', () => {
    const texture = { width: 320, height: 320 } as Texture;

    const importedTexture = importTexture(texture, { pixelsPerUnit: 32 });

    expect(importedTexture.worldWidth).toBe(10);
    expect(importedTexture.worldHeight).toBe(10);
  });

  it('should use explicit width/height instead of the texture size when given', () => {
    const texture = { width: 512, height: 512 } as Texture;

    const importedTexture = importTexture(texture, {
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
    const texture = { width: 200, height: 100 } as Texture;

    const importedTexture = importTexture(texture, {
      pixelsPerUnit: undefined,
      width: undefined,
      height: undefined,
    });

    expect(importedTexture.pixelsPerUnit).toBe(100);
    expect(importedTexture.width).toBe(200);
    expect(importedTexture.height).toBe(100);
  });

  it('should throw when pixelsPerUnit is not positive', () => {
    const texture = { width: 100, height: 100 } as Texture;

    expect(() => importTexture(texture, { pixelsPerUnit: 0 })).toThrow();
    expect(() => importTexture(texture, { pixelsPerUnit: -10 })).toThrow();
  });

  it('should throw when width or height is not positive', () => {
    const texture = { width: 100, height: 100 } as Texture;

    expect(() => importTexture(texture, { width: 0 })).toThrow();
    expect(() => importTexture(texture, { height: -1 })).toThrow();
  });
});
