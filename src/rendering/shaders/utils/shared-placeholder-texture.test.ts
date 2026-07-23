/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getSharedBlackTexture,
  getSharedWhiteTexture,
} from './shared-placeholder-texture';

function createMockGl(): WebGL2RenderingContext {
  return {
    createTexture: vi.fn().mockImplementation(() => ({}) as WebGLTexture),
    bindTexture: vi.fn(),
    texImage2D: vi.fn(),
    TEXTURE_2D: 'TEXTURE_2D',
    RGBA: 'RGBA',
    UNSIGNED_BYTE: 'UNSIGNED_BYTE',
  } as unknown as WebGL2RenderingContext;
}

describe('getSharedBlackTexture', () => {
  let gl: WebGL2RenderingContext;

  beforeEach(() => {
    gl = createMockGl();
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
    const otherGl = createMockGl();

    const first = getSharedBlackTexture(gl);
    const second = getSharedBlackTexture(otherGl);

    expect(second).not.toBe(first);
  });
});

describe('getSharedWhiteTexture', () => {
  let gl: WebGL2RenderingContext;

  beforeEach(() => {
    gl = createMockGl();
  });

  it('creates a 1x1 opaque white texture', () => {
    getSharedWhiteTexture(gl);

    expect(gl.texImage2D).toHaveBeenCalledWith(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255]),
    );
  });

  it('returns the same texture on subsequent calls for the same context', () => {
    const first = getSharedWhiteTexture(gl);
    const second = getSharedWhiteTexture(gl);

    expect(second).toBe(first);
    expect(gl.createTexture).toHaveBeenCalledTimes(1);
  });

  it('creates a distinct texture per context', () => {
    const otherGl = createMockGl();

    const first = getSharedWhiteTexture(gl);
    const second = getSharedWhiteTexture(otherGl);

    expect(second).not.toBe(first);
  });

  it('is distinct from the shared black texture for the same context', () => {
    const black = getSharedBlackTexture(gl);
    const white = getSharedWhiteTexture(gl);

    expect(white).not.toBe(black);
  });
});
