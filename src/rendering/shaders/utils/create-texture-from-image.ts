/**
 * Creates a WebGL texture from an image.
 *
 * @param gl - The WebGL2 rendering context.
 * @param image - The image source to create the texture from.
 * @param pixelated - Samples with nearest-neighbor filtering for crisp,
 * blocky scaling, appropriate for pixel-art assets. Defaults to `false`.
 * @param tile - Wraps with `REPEAT` on both axes instead of `CLAMP_TO_EDGE`,
 * for a texture meant to tile across a surface rather than a sprite frame
 * (which must never bleed into a neighboring frame in the same atlas).
 * Defaults to `false`.
 * @returns The created WebGL texture.
 */
export const createTextureFromImage = (
  gl: WebGL2RenderingContext,
  image: TexImageSource,
  pixelated: boolean = false,
  tile: boolean = false,
): WebGLTexture => {
  const texture = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, texture);

  const wrap = tile ? gl.REPEAT : gl.CLAMP_TO_EDGE;

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);

  if (pixelated) {
    // Use nearest filtering for crisp, pixel-art scaling
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  return texture;
};
