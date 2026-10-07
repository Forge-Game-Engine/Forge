/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import type { RenderContext } from './render-context.js';
import { createTexture, Texture } from './texture.js';

describe('Texture', () => {
  let gl: WebGL2RenderingContext;
  let glTexture: WebGLTexture;

  beforeEach(() => {
    glTexture = {};
    gl = {
      TEXTURE_2D: 'TEXTURE_2D',
      TEXTURE_WRAP_S: 'TEXTURE_WRAP_S',
      TEXTURE_WRAP_T: 'TEXTURE_WRAP_T',
      TEXTURE_MIN_FILTER: 'TEXTURE_MIN_FILTER',
      TEXTURE_MAG_FILTER: 'TEXTURE_MAG_FILTER',
      CLAMP_TO_EDGE: 'CLAMP_TO_EDGE',
      REPEAT: 'REPEAT',
      LINEAR: 'LINEAR',
      NEAREST: 'NEAREST',
      RGBA: 'RGBA',
      UNSIGNED_BYTE: 'UNSIGNED_BYTE',
      createTexture: vi.fn(() => glTexture),
      bindTexture: vi.fn(),
      texParameteri: vi.fn(),
      texImage2D: vi.fn(),
      deleteTexture: vi.fn(),
    } as unknown as WebGL2RenderingContext;
  });

  const renderContext = (): RenderContext => ({ gl }) as RenderContext;

  const createImage = (width: number, height: number): HTMLImageElement => {
    const image = new Image();

    Object.defineProperty(image, 'naturalWidth', { value: width });
    Object.defineProperty(image, 'naturalHeight', { value: height });

    return image;
  };

  const parameter = (name: string): unknown =>
    (gl.texParameteri as Mock).mock.calls.find(
      ([, parameterName]) => parameterName === name,
    )?.[2];

  it('uploads its source as 8-bit RGBA and takes its size', () => {
    const image = createImage(64, 32);

    const texture = createTexture(renderContext(), image);

    expect(gl.texImage2D).toHaveBeenCalledWith(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      image,
    );
    expect(texture.width).toBe(64);
    expect(texture.height).toBe(32);
    expect(texture.glTexture).toBe(glTexture);
  });

  it('takes the size of a source that is not an image, such as a canvas or ImageData', () => {
    const canvas = document.createElement('canvas');

    canvas.width = 3;
    canvas.height = 5;

    const texture = createTexture(renderContext(), canvas);

    expect(texture.width).toBe(3);
    expect(texture.height).toBe(5);
  });

  it('defaults to linear filtering and clamping at the edges', () => {
    const texture = createTexture(renderContext(), createImage(1, 1));

    expect(texture.filter).toBe('linear');
    expect(texture.wrap).toBe('clamp');
    expect(parameter('TEXTURE_MIN_FILTER')).toBe(gl.LINEAR);
    expect(parameter('TEXTURE_MAG_FILTER')).toBe(gl.LINEAR);
    expect(parameter('TEXTURE_WRAP_S')).toBe(gl.CLAMP_TO_EDGE);
    expect(parameter('TEXTURE_WRAP_T')).toBe(gl.CLAMP_TO_EDGE);
  });

  it('samples with nearest filtering and repeats when asked', () => {
    const texture = createTexture(renderContext(), createImage(1, 1), {
      filter: 'nearest',
      wrap: 'repeat',
    });

    expect(texture.filter).toBe('nearest');
    expect(texture.wrap).toBe('repeat');
    expect(parameter('TEXTURE_MIN_FILTER')).toBe(gl.NEAREST);
    expect(parameter('TEXTURE_MAG_FILTER')).toBe(gl.NEAREST);
    expect(parameter('TEXTURE_WRAP_S')).toBe(gl.REPEAT);
    expect(parameter('TEXTURE_WRAP_T')).toBe(gl.REPEAT);
  });

  it('re-uploads, and resizes, on update', () => {
    const texture = createTexture(renderContext(), createImage(4, 4));
    const replacement = createImage(8, 2);

    texture.update(replacement);

    expect(gl.texImage2D).toHaveBeenLastCalledWith(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      replacement,
    );
    expect(texture.width).toBe(8);
    expect(texture.height).toBe(2);
    expect(gl.createTexture).toHaveBeenCalledTimes(1);
  });

  it('deletes the GL texture on dispose, and throws when used afterwards', () => {
    const texture = createTexture(renderContext(), createImage(4, 4));

    texture.dispose();

    expect(gl.deleteTexture).toHaveBeenCalledWith(glTexture);
    expect(() => texture.glTexture).toThrow('has been disposed');
    expect(() => texture.update(createImage(1, 1))).toThrow(
      'has been disposed',
    );
  });

  it('does nothing when disposed twice', () => {
    const texture = new Texture(gl);

    texture.dispose();
    texture.dispose();

    expect(gl.deleteTexture).toHaveBeenCalledTimes(1);
  });
});
