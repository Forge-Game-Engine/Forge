import {
  registerGpuResource,
  unregisterGpuResource,
} from './gpu-resource-registry.js';
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
 *
 * A texture keeps a reference to the source it was last updated from, so
 * that it can upload it again if the WebGL context is lost and restored
 * (see `RenderContext.onContextRestored`). It keeps the source itself, not a
 * copy: a canvas is re-uploaded with whatever it shows at that moment, and a
 * closed `ImageBitmap` or `VideoFrame` can't be re-uploaded, so a texture
 * made from one comes back empty until it's updated again.
 */
export class Texture {
  /** How the texture is sampled between texels. */
  public readonly filter: TextureFilter;

  /** What the texture returns outside `[0, 1]`. */
  public readonly wrap: TextureWrap;

  /** The render context the texture lives in. */
  protected readonly renderContext: RenderContext;

  private readonly _rebuild: () => void;
  private _glTexture: WebGLTexture | null;
  private _isDisposed: boolean;
  private _width: number;
  private _height: number;

  /**
   * Fills the GPU texture with its current contents: re-runs the last
   * upload, so a restored context gets the same contents back.
   */
  private _upload: (() => void) | null;

  /**
   * Creates an empty texture with the given sampling options; its contents
   * are set by {@link Texture.update}. Use {@link createTexture} to create
   * one from a source in one step.
   * @param renderContext - The render context to create the texture in.
   * @param options - How the texture is sampled.
   */
  constructor(
    renderContext: RenderContext,
    options: Partial<TextureOptions> = {},
  ) {
    const { filter, wrap } = { ...defaultTextureOptions, ...options };

    this.renderContext = renderContext;
    this.filter = filter;
    this.wrap = wrap;
    this._glTexture = null;
    this._isDisposed = false;
    this._width = 0;
    this._height = 0;
    this._upload = null;

    this._rebuild = (): void => {
      this._glTexture = this._createGlTexture();
      this._upload?.();
    };

    registerGpuResource(renderContext, 'texture', this._rebuild);

    if (!renderContext.isContextLost) {
      this._glTexture = this._createGlTexture();
    }
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
   * attaching it to a framebuffer. `null` for a texture created while the
   * WebGL context is lost, until the context is restored.
   * @throws An error if the texture has been disposed.
   */
  get glTexture(): WebGLTexture | null {
    if (this._isDisposed) {
      throw new Error(
        'This texture has been disposed and can no longer be used.',
      );
    }

    return this._glTexture;
  }

  /**
   * Replaces the texture's contents, and size, with `source`, uploaded as
   * 8-bit RGBA with straight (not premultiplied) alpha, the way the sprite
   * shaders expect it. The texture keeps a reference to `source`, to upload
   * it again if the WebGL context is lost and restored.
   * @param source - The image, canvas, `ImageData`, `ImageBitmap` or video
   * frame to upload.
   * @throws An error if the texture has been disposed.
   */
  public update(source: TexImageSource): void {
    const { width, height } = getSourceSize(source);

    this._setContents(width, height, () => {
      const { gl } = this.renderContext;

      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source,
      );
    });
  }

  /**
   * Frees the GPU texture and the source it keeps. Using the texture
   * afterwards (drawing a sprite with it, binding it to a uniform, updating
   * it) throws. Disposing it again does nothing.
   */
  public dispose(): void {
    if (this._isDisposed) {
      return;
    }

    this.deleteStorage();
  }

  /**
   * Allocates empty storage of the given size and GL format, for a texture
   * that's rendered into rather than uploaded from a source. Allocated again,
   * empty, if the WebGL context is lost and restored.
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
    this._setContents(width, height, () => {
      const { gl } = this.renderContext;

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
    });
  }

  /**
   * Uploads raw 8-bit RGBA texels, replacing the texture's contents. The
   * texture keeps `pixels`, to upload them again if the WebGL context is
   * lost and restored.
   * @param width - The width, in texels.
   * @param height - The height, in texels.
   * @param pixels - `width * height * 4` bytes, row by row.
   */
  protected uploadPixels(
    width: number,
    height: number,
    pixels: Uint8Array,
  ): void {
    this._setContents(width, height, () => {
      const { gl } = this.renderContext;

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
    });
  }

  /**
   * Deletes the GPU texture, lets go of the source it keeps, and stops the
   * render context rebuilding it. Unlike {@link Texture.dispose}, which a
   * subclass may forbid, this always frees it.
   */
  protected deleteStorage(): void {
    unregisterGpuResource(this.renderContext, 'texture', this._rebuild);
    this.renderContext.gl.deleteTexture(this._glTexture);
    this._glTexture = null;
    this._upload = null;
    this._isDisposed = true;
  }

  /**
   * Records the texture's new size and how to fill it, and fills it now
   * unless the WebGL context is lost (in which case the restore does).
   */
  private _setContents(width: number, height: number, fill: () => void): void {
    if (this._isDisposed) {
      throw new Error(
        'This texture has been disposed and can no longer be used.',
      );
    }

    this._width = width;
    this._height = height;

    this._upload = (): void => {
      const { gl } = this.renderContext;

      gl.bindTexture(gl.TEXTURE_2D, this._glTexture);
      fill();
    };

    if (this._glTexture !== null && !this.renderContext.isContextLost) {
      this._upload();
    }
  }

  /** Creates the GL texture and sets its sampling parameters. */
  private _createGlTexture(): WebGLTexture {
    const { gl } = this.renderContext;
    const glFilter = this.filter === 'nearest' ? gl.NEAREST : gl.LINEAR;
    const glWrap = this.wrap === 'repeat' ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    const glTexture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, glTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, glWrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, glWrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, glFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, glFilter);

    return glTexture;
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
  const texture = new Texture(renderContext, options);

  texture.update(source);

  return texture;
}
