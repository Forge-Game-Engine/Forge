/**
 * Loads an image into a WebGL texture configured to tile: `REPEAT` wrapping
 * on both axes, rather than the `CLAMP_TO_EDGE` the engine's
 * `createTextureFromImage` uses (appropriate for sprite frames, which
 * should never bleed into a neighboring frame, but not for a texture meant
 * to repeat across a surface like this demo's terrain).
 * @param gl - The WebGL2 rendering context.
 * @param image - The image to load.
 * @returns The created, tile-ready WebGL texture.
 */
export function loadTiledTexture(
  gl: WebGL2RenderingContext,
  image: HTMLImageElement,
): WebGLTexture {
  const texture = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  return texture;
}
