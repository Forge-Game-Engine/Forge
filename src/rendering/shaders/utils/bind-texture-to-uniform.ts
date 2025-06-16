const MAX_TEXTURE_UNITS = 31; // 31 is the maximum texture unit in WebGL.

export const bindTextureToUniform = (
  gl: WebGLRenderingContext,
  texture: WebGLTexture,
  uniformLocation: WebGLUniformLocation,
  textureUnit: number = 0,
) => {
  if (textureUnit > MAX_TEXTURE_UNITS) {
    throw new Error(
      `Cannot bind to texture unit greater than ${MAX_TEXTURE_UNITS}.`,
    );
  }

  gl.activeTexture(gl.TEXTURE0 + textureUnit);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.uniform1i(uniformLocation, textureUnit);
};
