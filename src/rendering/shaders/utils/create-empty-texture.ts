import {
  RENDER_TARGET_FORMAT,
  RENDER_TARGET_FORMAT_KEYS,
} from '../../enums/index.js';

/**
 * Creates an empty WebGL texture of a given size, suitable for use as a
 * render target color attachment.
 *
 * @param gl - The WebGL2 rendering context.
 * @param width - The texture width in pixels.
 * @param height - The texture height in pixels.
 * @param format - The color storage format, already resolved by
 * `resolveRenderTargetFormat` (i.e. never a format the context can't
 * actually render into). Defaults to `RENDER_TARGET_FORMAT.ldr`.
 * @returns The created WebGL texture.
 */
export const createEmptyTexture = (
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  format: RENDER_TARGET_FORMAT_KEYS = RENDER_TARGET_FORMAT.ldr,
): WebGLTexture => {
  const texture = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const isHdr = format === RENDER_TARGET_FORMAT.hdr;

  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    isHdr ? gl.RGBA16F : gl.RGBA,
    width,
    height,
    0,
    gl.RGBA,
    isHdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE,
    null,
  );

  return texture;
};
