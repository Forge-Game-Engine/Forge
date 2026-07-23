// A single 1x1 opaque black/white texture, reused by every consumer across a
// given `WebGL2RenderingContext` that needs to bind "nothing" (black) or a
// neutral, tintable surface (white) to a sampler2D uniform without a shader
// branch (for example a sprite with no emissive map, or a solid-color
// sprite rendered by tinting an untextured quad): allocating a fresh 1x1
// texture per consumer would be wasteful, and none of them are ever freed
// since nothing owns one long enough to dispose it.
const sharedBlackTextureByContext = new WeakMap<
  WebGL2RenderingContext,
  WebGLTexture
>();

const sharedWhiteTextureByContext = new WeakMap<
  WebGL2RenderingContext,
  WebGLTexture
>();

function getOrCreateSharedTexture(
  gl: WebGL2RenderingContext,
  cache: WeakMap<WebGL2RenderingContext, WebGLTexture>,
  pixel: Uint8Array,
): WebGLTexture {
  const existing = cache.get(gl);

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
    pixel,
  );

  cache.set(gl, texture);

  return texture;
}

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
  return getOrCreateSharedTexture(
    gl,
    sharedBlackTextureByContext,
    new Uint8Array([0, 0, 0, 255]),
  );
}

/**
 * Returns a shared, opaque-white, 1x1 texture for `gl`, creating it on first
 * use. Intended for a sprite's `u_texture` when it should render as a flat,
 * tintable color rather than an image - the sprite shader multiplies the
 * sampled texture color by `tintColor`, so a white texture leaves
 * `tintColor` unmodified.
 * @param gl - The WebGL2 rendering context.
 * @returns The shared white texture.
 */
export function getSharedWhiteTexture(
  gl: WebGL2RenderingContext,
): WebGLTexture {
  return getOrCreateSharedTexture(
    gl,
    sharedWhiteTextureByContext,
    new Uint8Array([255, 255, 255, 255]),
  );
}
