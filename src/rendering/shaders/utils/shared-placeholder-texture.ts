// A single 1x1 opaque black texture, reused by every consumer across a given
// `WebGL2RenderingContext` that needs to bind "nothing" to a sampler2D
// uniform without a shader branch (for example a sprite with no emissive
// map): allocating a fresh 1x1 texture per consumer would be wasteful, and
// none of them are ever freed since nothing owns one long enough to dispose
// it.
const sharedBlackTextureByContext = new WeakMap<
  WebGL2RenderingContext,
  WebGLTexture
>();

/**
 * Returns a shared, opaque-black, 1x1 texture for `gl`, creating it on first
 * use. Intended for sampler2D uniforms that must always be bound to
 * something (to avoid a data-dependent fragment shader branch) but should
 * contribute nothing when no real texture is supplied.
 * @param gl - The WebGL2 rendering context.
 * @returns The shared black texture.
 */
export function getSharedBlackTexture(
  gl: WebGL2RenderingContext,
): WebGLTexture {
  const existing = sharedBlackTextureByContext.get(gl);

  if (existing) {
    return existing;
  }

  const texture = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
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

  sharedBlackTextureByContext.set(gl, texture);

  return texture;
}
