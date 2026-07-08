import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createEmptyTexture } from './create-empty-texture';

describe('createEmptyTexture', () => {
  let gl: WebGL2RenderingContext;

  beforeEach(() => {
    gl = {
      createTexture: vi.fn(),
      bindTexture: vi.fn(),
      texParameteri: vi.fn(),
      texImage2D: vi.fn(),
    } as unknown as WebGL2RenderingContext;
  });

  it('should create and configure an empty texture successfully', () => {
    const texture = {} as WebGLTexture;
    (gl.createTexture as Mock).mockReturnValue(texture);

    const result = createEmptyTexture(gl, 256, 128);

    expect(gl.createTexture).toHaveBeenCalled();
    expect(gl.bindTexture).toHaveBeenCalledWith(gl.TEXTURE_2D, texture);
    expect(gl.texParameteri).toHaveBeenCalledWith(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_S,
      gl.CLAMP_TO_EDGE,
    );
    expect(gl.texParameteri).toHaveBeenCalledWith(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_T,
      gl.CLAMP_TO_EDGE,
    );
    expect(gl.texParameteri).toHaveBeenCalledWith(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR,
    );
    expect(gl.texParameteri).toHaveBeenCalledWith(
      gl.TEXTURE_2D,
      gl.TEXTURE_MAG_FILTER,
      gl.LINEAR,
    );
    expect(gl.texImage2D).toHaveBeenCalledWith(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      256,
      128,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    expect(result).toBe(texture);
  });
});
