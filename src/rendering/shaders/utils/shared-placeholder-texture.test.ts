/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSharedBlackTexture } from './shared-placeholder-texture';

describe('getSharedBlackTexture', () => {
  let gl: WebGL2RenderingContext;

  beforeEach(() => {
    gl = {
      createTexture: vi.fn().mockImplementation(() => ({}) as WebGLTexture),
      bindTexture: vi.fn(),
      texImage2D: vi.fn(),
      TEXTURE_2D: 'TEXTURE_2D',
      RGBA: 'RGBA',
      UNSIGNED_BYTE: 'UNSIGNED_BYTE',
    } as unknown as WebGL2RenderingContext;
  });

  it('creates a 1x1 opaque black texture', () => {
    getSharedBlackTexture(gl);

    expect(gl.texImage2D).toHaveBeenCalledWith(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255]),
    );
  });

  it('returns the same texture on subsequent calls for the same context', () => {
    const first = getSharedBlackTexture(gl);
    const second = getSharedBlackTexture(gl);

    expect(second).toBe(first);
    expect(gl.createTexture).toHaveBeenCalledTimes(1);
  });

  it('creates a distinct texture per context', () => {
    const otherGl = {
      createTexture: vi.fn().mockImplementation(() => ({}) as WebGLTexture),
      bindTexture: vi.fn(),
      texImage2D: vi.fn(),
      TEXTURE_2D: 'TEXTURE_2D',
      RGBA: 'RGBA',
      UNSIGNED_BYTE: 'UNSIGNED_BYTE',
    } as unknown as WebGL2RenderingContext;

    const first = getSharedBlackTexture(gl);
    const second = getSharedBlackTexture(otherGl);

    expect(second).not.toBe(first);
  });
});
