/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createEmptyTexture } from './create-empty-texture';
import { RENDER_TARGET_FORMAT } from '../../enums/index.js';

describe('createEmptyTexture', () => {
  let gl: WebGL2RenderingContext;

  beforeEach(() => {
    gl = {
      createTexture: vi.fn(),
      bindTexture: vi.fn(),
      texParameteri: vi.fn(),
      texImage2D: vi.fn(),
      RGBA16F: 'RGBA16F',
      HALF_FLOAT: 'HALF_FLOAT',
    } as unknown as WebGL2RenderingContext;
  });

  it('should create and configure an empty texture successfully, defaulting to ldr', () => {
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

  it('should allocate an RGBA16F/HALF_FLOAT texture when format is hdr', () => {
    createEmptyTexture(gl, 256, 128, RENDER_TARGET_FORMAT.hdr);

    expect(gl.texImage2D).toHaveBeenCalledWith(
      gl.TEXTURE_2D,
      0,
      gl.RGBA16F,
      256,
      128,
      0,
      gl.RGBA,
      gl.HALF_FLOAT,
      null,
    );
  });
});
