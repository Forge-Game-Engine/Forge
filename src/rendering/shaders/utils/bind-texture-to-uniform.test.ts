/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bindTextureToUniform } from './bind-texture-to-uniform';

describe('bindTextureToUniform', () => {
  let gl: WebGLRenderingContext;
  let texture: WebGLTexture;

  const uniformLocation = {} as WebGLUniformLocation;

  beforeEach(() => {
    gl = {
      TEXTURE0: 33984,
      TEXTURE_2D: 3553,
      activeTexture: vi.fn(),
      bindTexture: vi.fn(),
      getUniformLocation: vi.fn(),
      uniform1i: vi.fn(),
    } as unknown as WebGLRenderingContext;

    texture = {} as WebGLTexture;
  });

  it('should bind the texture to the specified texture unit and uniform', () => {
    const textureUnit = 0;

    vi.spyOn(gl, 'getUniformLocation').mockReturnValue(uniformLocation);

    bindTextureToUniform(gl, texture, uniformLocation, textureUnit);

    expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0 + textureUnit);
    expect(gl.bindTexture).toHaveBeenCalledWith(gl.TEXTURE_2D, texture);
    expect(gl.uniform1i).toHaveBeenCalledWith(uniformLocation, textureUnit);
  });

  it('should throw an error if the texture unit is greater than the maximum allowed', () => {
    const textureUnit = 32;

    expect(() => {
      bindTextureToUniform(gl, texture, uniformLocation, textureUnit);
    }).toThrow(`Cannot bind to texture unit greater than 31.`);
  });
});
