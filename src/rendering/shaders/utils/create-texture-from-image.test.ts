import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createTextureFromImage } from './create-texture-from-image';

describe('createTextureFromImage', () => {
  let gl: WebGL2RenderingContext;
  let image: TexImageSource;

  beforeEach(() => {
    // Create a mock WebGL2RenderingContext
    gl = {
      createTexture: vi.fn(),
      bindTexture: vi.fn(),
      texParameteri: vi.fn(),
      texImage2D: vi.fn(),
    } as unknown as WebGL2RenderingContext;

    // Create a mock image
    image = new Image();
  });

  it('should create and configure a texture successfully', () => {
    const texture = {} as WebGLTexture;
    (gl.createTexture as Mock).mockReturnValue(texture);

    const result = createTextureFromImage(gl, image);

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
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      image,
    );
    expect(result).toBe(texture);
  });
});
