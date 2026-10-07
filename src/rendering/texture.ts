import type { RenderContext } from './render-context.js';

/**
 * How a texture is sampled between texels: `'linear'` blends neighboring
 * texels, keeping soft and anti-aliased edges smooth, and `'nearest'` picks
 * the closest texel, for crisp, blocky pixel art.
 */
export type TextureFilter = 'linear' | 'nearest';

/**
 * What a texture returns outside `[0, 1]`: `'clamp'` repeats its edge
 * texels (so a sprite frame never bleeds into its neighbor in a sheet), and
 * `'repeat'` tiles it.
 */
export type TextureWrap = 'clamp' | 'repeat';

/**
 * How a texture is sampled. Fixed when the texture is created; create a
 * second texture from the same source to sample it both ways.
 */
export interface TextureOptions {
  /** How the texture is sampled between texels. Defaults to `'linear'`. */
  filter: TextureFilter;

  /** What the texture returns outside `[0, 1]`. Defaults to `'clamp'`. */
  wrap: TextureWrap;
}

const defaultTextureOptions: TextureOptions = {
  filter: 'linear',
  wrap: 'clamp',
};

/**
 * An image on the GPU, sampled by a shader through a `sampler2D` uniform: a
 * sprite's `texture`, a font atlas, a terrain layer, or a render target's
 * color. Create one from an image, canvas, `ImageData`, `ImageBitmap` or
 * video frame with {@link createTexture}.
 *
 * Whoever creates a texture owns it, and calls {@link Texture.dispose} once
 * nothing uses it any more. A render target owns its color textures, and
 * `renderContext.whiteTexture`/`blackTexture` belong to the render context.
 */
export class Texture {
  /** How the texture is sampled between texels. */
  public readonly filter: TextureFilter;

  /** What the texture returns outside `[0, 1]`. */
  public readonly wrap: TextureWrap;

  /** The WebGL2 context the texture lives in. */
  protected readonly gl: WebGL2RenderingContext;

  private _glTexture: WebGLTexture | null;
  private _width: number;
  private _height: number;

  /**
   * Creates an empty texture with the given sampling options; its contents
   * are set by {@link Texture.update}. Use {@link createTexture} to create
   * one from a source in one step.
   * @param gl - The WebGL2 rendering context.
   * @param options - How the texture is sampled.
   */
  constructor(
    gl: WebGL2RenderingContext,
    options: Partial<TextureOptions> = {},
  ) {
    const { filter, wrap } = { ...defaultTextureOptions, ...options };
    const glFilter = filter === 'nearest' ? gl.NEAREST : gl.LINEAR;
    const glWrap = wrap === 'repeat' ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    const glTexture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, glTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, glWrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, glWrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, glFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, glFilter);

    this.gl = gl;
    this.filter = filter;
    this.wrap = wrap;
    this._glTexture = glTexture;
    this._width = 0;
    this._height = 0;
  }

  /** The texture's width, in texels. */
  get width(): number {
    return this._width;
  }

  /** The texture's height, in texels. */
  get height(): number {
    return this._height;
  }

  /**
   * The underlying WebGL texture, for binding it to a texture unit or
   * attaching it to a framebuffer.
   * @throws An error if the texture has been disposed.
   */
  get glTexture(): WebGLTexture {
    if (this._glTexture === null) {
      throw new Error(
        'This texture has been disposed and can no longer be used.',
      );
    }

    return this._glTexture;
  }

  /**
   * Replaces the texture's contents, and size, with `source`, uploaded as
   * 8-bit RGBA with straight (not premultiplied) alpha, the way the sprite
   * shaders expect it.
   * @param source - The image, canvas, `ImageData`, `ImageBitmap` or video
   * frame to upload.
   * @throws An error if the texture has been disposed.
   */
  public update(source: TexImageSource): void {
    const { gl } = this;

    gl.bindTexture(gl.TEXTURE_2D, this.glTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

    const { width, height } = getSourceSize(source);

    this._width = width;
    this._height = height;
  }

  /**
   * Frees the GPU texture. Using the texture afterwards (drawing a sprite
   * with it, binding it to a uniform, updating it) throws. Disposing it
   * again does nothing.
   */
  public dispose(): void {
    if (this._glTexture === null) {
      return;
    }

    this.gl.deleteTexture(this._glTexture);
    this._glTexture = null;
  }

  /**
   * Allocates empty storage of the given size and GL format, for a texture
   * that's rendered into rather than uploaded from a source.
   * @param width - The width, in texels.
   * @param height - The height, in texels.
   * @param internalFormat - The GL internal format (e.g. `RGBA8`, `RGBA16F`).
   * @param type - The GL type of a texel component (e.g. `UNSIGNED_BYTE`).
   */
  protected allocateStorage(
    width: number,
    height: number,
    internalFormat: GLenum,
    type: GLenum,
  ): void {
    const { gl } = this;

    gl.bindTexture(gl.TEXTURE_2D, this.glTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      internalFormat,
      width,
      height,
      0,
      gl.RGBA,
      type,
      null,
    );

    this._width = width;
    this._height = height;
  }

  /**
   * Uploads raw 8-bit RGBA texels, replacing the texture's contents.
   * @param width - The width, in texels.
   * @param height - The height, in texels.
   * @param pixels - `width * height * 4` bytes, row by row.
   */
  protected uploadPixels(
    width: number,
    height: number,
    pixels: Uint8Array,
  ): void {
    const { gl } = this;

    gl.bindTexture(gl.TEXTURE_2D, this.glTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels,
    );

    this._width = width;
    this._height = height;
  }

  /**
   * Deletes the GPU texture. Unlike {@link Texture.dispose}, which a
   * subclass may forbid, this always frees it.
   */
  protected deleteStorage(): void {
    this.gl.deleteTexture(this.glTexture);
    this._glTexture = null;
  }
}

/**
 * The size of a `TexImageSource`, in texels: the intrinsic size of an
 * image or video, since an `<img>`'s `width`/`height` are its layout size.
 */
function getSourceSize(source: TexImageSource): {
  width: number;
  height: number;
} {
  if ('naturalWidth' in source) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }

  if ('videoWidth' in source) {
    return { width: source.videoWidth, height: source.videoHeight };
  }

  if ('displayWidth' in source) {
    return { width: source.displayWidth, height: source.displayHeight };
  }

  return { width: source.width, height: source.height };
}

/**
 * Creates a texture from an image, canvas, `ImageData`, `ImageBitmap` or
 * video frame. A texture made from pixels is
 * `createTexture(renderContext, new ImageData(pixels, width, height))`.
 * @param renderContext - The render context to create the texture in.
 * @param source - The texture's initial contents, uploaded as 8-bit RGBA.
 * @param options - How the texture is sampled: `filter` defaults to
 * `'linear'` (use `'nearest'` for pixel art) and `wrap` to `'clamp'` (use
 * `'repeat'` for a texture tiled across a surface).
 * @returns The texture. The caller owns it, and disposes it when nothing
 * uses it any more.
 */
export function createTexture(
  renderContext: RenderContext,
  source: TexImageSource,
  options: Partial<TextureOptions> = {},
): Texture {
  const texture = new Texture(renderContext.gl, options);

  texture.update(source);

  return texture;
}
