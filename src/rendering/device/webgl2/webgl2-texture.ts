/* eslint-disable @typescript-eslint/naming-convention -- lookup tables keyed by WebGPU's kebab-case names and bit counts */
import type {
  GpuTexture,
  GpuTextureDescriptor,
  GpuTextureDimension,
  GpuTextureFormat,
  GpuTextureSource,
  GpuTextureUsage,
  GpuTextureView,
  GpuTextureViewDescriptor,
  GpuTextureWriteOptions,
} from '../gpu-texture.js';
import type { DeviceContext, RestorableResource } from './device-context.js';
import { assertSampleCountSupported } from './sample-counts.js';
import * as glc from './gl-constants.js';
import {
  getTextureFormatInfo,
  isFormatAvailable,
  isFormatFilterable,
  isFormatRenderable,
  TextureFormatInfo,
} from './texture-formats.js';

const glTargets: Record<GpuTextureDimension, number> = {
  '2d': glc.GL_TEXTURE_2D,
  '2d-array': glc.GL_TEXTURE_2D_ARRAY,
  cube: glc.GL_TEXTURE_CUBE_MAP,
  '3d': glc.GL_TEXTURE_3D,
};

/** One region a write covers, resolved against the texture. */
interface WriteRegion {
  mipLevel: number;
  layer: number;
  layerCount: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A write kept to replay when a lost context is restored. */
interface RetainedWrite {
  sequence: number;
  source: GpuTextureSource;
  region: WriteRegion;
}

function isTypedArray(source: GpuTextureSource): source is ArrayBufferView {
  return ArrayBuffer.isView(source);
}

/**
 * The intrinsic size of an image source: an `<img>`'s and a video's
 * `width`/`height` are their layout size.
 */
function getImageSize(source: TexImageSource): {
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

/** The typed array each upload type is read from. */
const typedArrayNamesByType = new Map<number, readonly string[]>([
  [glc.GL_UNSIGNED_BYTE, ['Uint8Array', 'Uint8ClampedArray']],
  [glc.GL_UNSIGNED_SHORT, ['Uint16Array']],
  [glc.GL_HALF_FLOAT, ['Uint16Array']],
  [glc.GL_UNSIGNED_INT, ['Uint32Array']],
  [glc.GL_UNSIGNED_INT_24_8, ['Uint32Array']],
  [glc.GL_UNSIGNED_INT_2_10_10_10_REV, ['Uint32Array']],
  [glc.GL_UNSIGNED_INT_10F_11F_11F_REV, ['Uint32Array']],
  [glc.GL_FLOAT, ['Float32Array']],
]);

/**
 * The GL type a typed array uploads as: the format's own, or `FLOAT` for a
 * `Float32Array` into a half-float or packed-float format.
 */
function getUploadType(info: TextureFormatInfo, data: ArrayBufferView): number {
  const acceptsFloat =
    info.type === glc.GL_HALF_FLOAT ||
    info.type === glc.GL_UNSIGNED_INT_10F_11F_11F_REV;

  if (acceptsFloat && data instanceof Float32Array) {
    return glc.GL_FLOAT;
  }

  const expected = typedArrayNamesByType.get(info.type) ?? [];

  if (!expected.includes(data.constructor.name)) {
    throw new Error(
      `A "${info.name}" texture is written from a ${expected.join(' or ')}, received a ${data.constructor.name}.`,
    );
  }

  return info.type;
}

/**
 * Validates a texture descriptor against the device and resolves its
 * defaults.
 */
function resolveDescriptor(
  context: DeviceContext,
  descriptor: GpuTextureDescriptor,
): Required<Omit<GpuTextureDescriptor, 'restoreSource' | 'label' | 'size'>> & {
  width: number;
  height: number;
  layers: number;
  mipLevelCount: number;
} {
  const { capabilities } = context;
  const dimension = descriptor.dimension ?? '2d';
  const info = getTextureFormatInfo(descriptor.format);
  const width = descriptor.size.width;
  const height = descriptor.size.height;
  const layers = descriptor.size.depthOrArrayLayers ?? 1;
  const name = `Texture "${descriptor.label ?? ''}"`;

  if (!isFormatAvailable(info, capabilities)) {
    throw new Error(
      `${name} can't be "${info.name}": this device has no extension for its compression family.`,
    );
  }

  for (const value of [width, height, layers]) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`${name} must have a positive whole-number size.`);
    }
  }

  assertDimensionFits(
    name,
    dimension,
    info,
    { width, height, layers },
    context,
  );

  const fullChain =
    Math.floor(
      Math.log2(Math.max(width, height, dimension === '3d' ? layers : 1)),
    ) + 1;
  const mipLevelCount =
    descriptor.mipLevelCount === 'full'
      ? fullChain
      : (descriptor.mipLevelCount ?? 1);

  if (
    !Number.isInteger(mipLevelCount) ||
    mipLevelCount < 1 ||
    mipLevelCount > fullChain
  ) {
    throw new Error(
      `${name} can have 1 to ${fullChain} mip levels, received ${mipLevelCount}.`,
    );
  }

  const usage = descriptor.usage;

  if (usage.length === 0) {
    throw new Error(`${name} must have at least one usage.`);
  }

  if (
    usage.includes('render-attachment') &&
    !isFormatRenderable(info, capabilities)
  ) {
    throw new Error(
      `${name} can't be a render attachment: "${info.name}" can't be rendered to on this device.`,
    );
  }

  const sampleCount = resolveSampleCount(context, descriptor, {
    name,
    dimension,
    mipLevelCount,
    usage,
  });

  return {
    dimension,
    format: descriptor.format,
    width,
    height,
    layers,
    mipLevelCount,
    sampleCount,
    usage,
  };
}

function assertDimensionFits(
  name: string,
  dimension: GpuTextureDimension,
  info: TextureFormatInfo,
  size: { width: number; height: number; layers: number },
  context: DeviceContext,
): void {
  const { limits } = context.capabilities;
  const { width, height, layers } = size;
  const checks: Record<GpuTextureDimension, () => string | null> = {
    '2d': () =>
      layers === 1 &&
      width <= limits.maxTextureSize &&
      height <= limits.maxTextureSize
        ? null
        : `a 2D texture has one layer and sides up to ${limits.maxTextureSize}`,
    '2d-array': () =>
      width <= limits.maxTextureSize &&
      height <= limits.maxTextureSize &&
      layers <= limits.maxArrayTextureLayers
        ? null
        : `an array texture has sides up to ${limits.maxTextureSize} and up to ${limits.maxArrayTextureLayers} layers`,
    cube: () =>
      width === height && layers === 6 && width <= limits.maxCubeTextureSize
        ? null
        : `a cube texture has 6 square faces with sides up to ${limits.maxCubeTextureSize}`,
    '3d': () =>
      Math.max(width, height, layers) <= limits.max3dTextureSize &&
      !info.hasDepth &&
      info.compression === null
        ? null
        : `a 3D texture is uncompressed color with sides up to ${limits.max3dTextureSize}`,
  };
  const problem = checks[dimension]();

  if (problem) {
    throw new Error(`${name} doesn't fit: ${problem}.`);
  }

  if (
    info.compression !== null &&
    (width % info.blockWidth !== 0 || height % info.blockHeight !== 0)
  ) {
    throw new Error(
      `${name} must have a size that's a multiple of "${info.name}"'s ${info.blockWidth}x${info.blockHeight} blocks.`,
    );
  }
}

function resolveSampleCount(
  context: DeviceContext,
  descriptor: GpuTextureDescriptor,
  resolved: {
    name: string;
    dimension: GpuTextureDimension;
    mipLevelCount: number;
    usage: readonly GpuTextureUsage[];
  },
): number {
  const requested = descriptor.sampleCount ?? 1;

  if (!Number.isInteger(requested) || requested < 1) {
    throw new Error(
      `${resolved.name} must have a positive whole sample count, received ${requested}.`,
    );
  }

  if (requested === 1) {
    return 1;
  }

  if (
    resolved.dimension !== '2d' ||
    resolved.mipLevelCount !== 1 ||
    resolved.usage.length !== 1 ||
    resolved.usage[0] !== 'render-attachment' ||
    descriptor.restoreSource
  ) {
    throw new Error(
      `${resolved.name} is multisampled, so it must be 2D, with one mip level and only the 'render-attachment' usage.`,
    );
  }

  assertSampleCountSupported(
    context.capabilities,
    descriptor.format,
    requested,
    resolved.name,
  );

  return requested;
}

/**
 * A texture with immutable storage, or a renderbuffer for a multisampled
 * one, which WebGL2 can't sample.
 */
export class WebGl2Texture implements GpuTexture, RestorableResource {
  public readonly dimension: GpuTextureDimension;
  public readonly format: GpuTextureFormat;
  public readonly width: number;
  public readonly height: number;
  public readonly depthOrArrayLayers: number;
  public readonly mipLevelCount: number;
  public readonly sampleCount: number;
  public readonly usage: readonly GpuTextureUsage[];
  public readonly label: string;

  /** Unique among the device's resources, for cache keys. */
  public readonly id: number;

  /** How the format maps onto WebGL2. */
  public readonly formatInfo: TextureFormatInfo;

  /** The GL texture target it's bound to (`RENDERBUFFER` if multisampled). */
  public readonly glTarget: number;

  /** Always `false`: this isn't the canvas. */
  public readonly isCanvas = false;

  private readonly _context: DeviceContext;
  private readonly _onDestroy: (texture: WebGl2Texture) => void;
  private readonly _restoreSource: ArrayBufferView | null;
  private readonly _retainedWrites = new Map<string, RetainedWrite>();
  private _glTexture: WebGLTexture | null;
  private _glRenderbuffer: WebGLRenderbuffer | null;
  private _sequence: number;
  private _mipmapsGeneratedAt: number | null;
  private _isDestroyed: boolean;

  /**
   * Validates the descriptor and creates the texture's storage, unless the
   * context is lost.
   * @param context - The device's shared context.
   * @param descriptor - The texture's descriptor.
   * @param onDestroy - Called when it's destroyed.
   * @throws An error if the descriptor doesn't fit the device.
   */
  constructor(
    context: DeviceContext,
    descriptor: GpuTextureDescriptor,
    onDestroy: (texture: WebGl2Texture) => void,
  ) {
    const resolved = resolveDescriptor(context, descriptor);

    this._context = context;
    this._onDestroy = onDestroy;
    this.id = context.nextId();
    this.label = descriptor.label ?? '';
    this.dimension = resolved.dimension;
    this.format = resolved.format;
    this.width = resolved.width;
    this.height = resolved.height;
    this.depthOrArrayLayers = resolved.layers;
    this.mipLevelCount = resolved.mipLevelCount;
    this.sampleCount = resolved.sampleCount;
    this.usage = [...resolved.usage];
    this.formatInfo = getTextureFormatInfo(resolved.format);
    this.glTarget =
      this.sampleCount > 1 ? glc.GL_RENDERBUFFER : glTargets[this.dimension];
    this._restoreSource = descriptor.restoreSource ?? null;
    this._glTexture = null;
    this._glRenderbuffer = null;
    this._sequence = 0;
    this._mipmapsGeneratedAt = null;
    this._isDestroyed = false;

    if (this._restoreSource) {
      this._assertRestoreSourceFits(this._restoreSource);
    }

    if (!context.isContextLost) {
      this.restore();
    }
  }

  /**
   * The WebGL texture, or `null` for a multisampled texture or while the
   * context is lost.
   * @throws An error if the texture is destroyed.
   */
  get glTexture(): WebGLTexture | null {
    this._assertAlive();

    return this._glTexture;
  }

  /**
   * The WebGL renderbuffer of a multisampled texture, or `null`.
   * @throws An error if the texture is destroyed.
   */
  get glRenderbuffer(): WebGLRenderbuffer | null {
    this._assertAlive();

    return this._glRenderbuffer;
  }

  /**
   * The width of a mip level.
   * @param mipLevel - The mip level.
   * @returns Its width, in texels.
   */
  public widthAt(mipLevel: number): number {
    return Math.max(1, this.width >> mipLevel);
  }

  /**
   * The height of a mip level.
   * @param mipLevel - The mip level.
   * @returns Its height, in texels.
   */
  public heightAt(mipLevel: number): number {
    return Math.max(1, this.height >> mipLevel);
  }

  /**
   * The number of layers, faces or depth slices of a mip level.
   * @param mipLevel - The mip level.
   * @returns The count.
   */
  public layersAt(mipLevel: number): number {
    return this.dimension === '3d'
      ? Math.max(1, this.depthOrArrayLayers >> mipLevel)
      : this.depthOrArrayLayers;
  }

  public write(
    source: GpuTextureSource,
    options: GpuTextureWriteOptions = {},
  ): void {
    this._assertAlive();
    this._context.assertNoOpenPass(`Writing texture "${this.label}"`);

    if (!this.usage.includes('copy-destination')) {
      throw new Error(
        `Texture "${this.label}" can't be written: it lacks the 'copy-destination' usage.`,
      );
    }

    const region = this._resolveRegion(source, options);

    if (isTypedArray(source)) {
      this._assertTypedArrayFits(source, region);
    } else if (this.formatInfo.imageType === 0) {
      throw new Error(
        `Texture "${this.label}" is "${this.format}", which an image can't fill; write a typed array.`,
      );
    }

    this._retain(source, region);

    if (this._glTexture === null || this._context.isContextLost) {
      return;
    }

    this._context.beginOperation();
    this._upload(source, region);
  }

  public generateMipmaps(): void {
    this._assertAlive();
    this._context.assertNoOpenPass(
      `Generating mipmaps of texture "${this.label}"`,
    );

    const { capabilities } = this._context;

    if (
      this.formatInfo.compression !== null ||
      !isFormatRenderable(this.formatInfo, capabilities) ||
      !isFormatFilterable(this.formatInfo, capabilities)
    ) {
      throw new Error(
        `Texture "${this.label}" can't generate mipmaps: "${this.format}" can't be both rendered to and filtered on this device.`,
      );
    }

    if (this.mipLevelCount === 1) {
      return;
    }

    this._mipmapsGeneratedAt = this._sequence++;

    if (this._glTexture === null || this._context.isContextLost) {
      return;
    }

    this._context.beginOperation();
    this._generateMipmaps();
  }

  public createView(descriptor: GpuTextureViewDescriptor = {}): GpuTextureView {
    this._assertAlive();

    const mipLevel = descriptor.mipLevel ?? 0;
    const arrayLayer = descriptor.arrayLayer ?? 0;

    if (
      !Number.isInteger(mipLevel) ||
      mipLevel < 0 ||
      mipLevel >= this.mipLevelCount ||
      !Number.isInteger(arrayLayer) ||
      arrayLayer < 0 ||
      arrayLayer >= this.layersAt(mipLevel)
    ) {
      throw new Error(
        `Texture "${this.label}" has no mip level ${mipLevel}, layer ${arrayLayer}.`,
      );
    }

    return Object.freeze({ texture: this, mipLevel, arrayLayer });
  }

  public destroy(): void {
    if (this._isDestroyed) {
      return;
    }

    const { gl, state } = this._context;

    this._isDestroyed = true;
    this._context.releaseCachedObjectsOf(this.id);

    if (this._glTexture) {
      state.forget(this._glTexture);
      gl.deleteTexture(this._glTexture);
    }

    if (this._glRenderbuffer) {
      gl.deleteRenderbuffer(this._glRenderbuffer);
    }

    this._glTexture = null;
    this._glRenderbuffer = null;
    this._retainedWrites.clear();
    this._onDestroy(this);
  }

  public restore(): void {
    const { gl } = this._context;
    const info = this.formatInfo;

    this._context.beginOperation();

    if (this.sampleCount > 1) {
      this._glRenderbuffer = gl.createRenderbuffer();
      gl.bindRenderbuffer(glc.GL_RENDERBUFFER, this._glRenderbuffer);
      gl.renderbufferStorageMultisample(
        glc.GL_RENDERBUFFER,
        this.sampleCount,
        info.internalFormat,
        this.width,
        this.height,
      );

      return;
    }

    this._glTexture = gl.createTexture();
    this._context.state.bindTexture(0, this.glTarget, this._glTexture);

    if (this.dimension === '2d' || this.dimension === 'cube') {
      gl.texStorage2D(
        this.glTarget,
        this.mipLevelCount,
        info.internalFormat,
        this.width,
        this.height,
      );
    } else {
      gl.texStorage3D(
        this.glTarget,
        this.mipLevelCount,
        info.internalFormat,
        this.width,
        this.height,
        this.depthOrArrayLayers,
      );
    }

    this._replay();
  }

  /** Uploads the kept contents again, in the order they were written. */
  private _replay(): void {
    const generatedAt = this._mipmapsGeneratedAt;

    if (this._restoreSource) {
      this._upload(this._restoreSource, {
        mipLevel: 0,
        layer: 0,
        layerCount: this.depthOrArrayLayers,
        x: 0,
        y: 0,
        width: this.width,
        height: this.height,
      });

      if (generatedAt !== null) {
        this._generateMipmaps();
      }

      return;
    }

    const writes = [...new Set(this._retainedWrites.values())].sort(
      (a, b) => a.sequence - b.sequence,
    );
    let isGenerated = generatedAt === null;

    for (const write of writes) {
      if (!isGenerated && write.sequence > (generatedAt ?? 0)) {
        this._generateMipmaps();
        isGenerated = true;
      }

      this._upload(write.source, write.region);
    }

    if (!isGenerated) {
      this._generateMipmaps();
    }
  }

  private _generateMipmaps(): void {
    this._context.state.bindTexture(0, this.glTarget, this._glTexture);
    this._context.gl.generateMipmap(this.glTarget);
  }

  /**
   * Keeps a write that covers whole layers of a mip level, replacing the
   * writes it covers, so a restore can replay it. Smaller writes, and every
   * write to a texture with a restore source, aren't kept.
   */
  private _retain(source: GpuTextureSource, region: WriteRegion): void {
    const sequence = this._sequence++;
    const isWhole =
      region.x === 0 &&
      region.y === 0 &&
      region.width === this.widthAt(region.mipLevel) &&
      region.height === this.heightAt(region.mipLevel);

    if (this._restoreSource || !isWhole) {
      return;
    }

    const write: RetainedWrite = { sequence, source, region };

    for (
      let layer = region.layer;
      layer < region.layer + region.layerCount;
      layer++
    ) {
      this._retainedWrites.set(`${region.mipLevel}:${layer}`, write);
    }
  }

  private _upload(source: GpuTextureSource, region: WriteRegion): void {
    const { state } = this._context;

    state.pixelStorei(glc.GL_UNPACK_FLIP_Y_WEBGL, false);
    state.pixelStorei(glc.GL_UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    state.pixelStorei(glc.GL_UNPACK_ALIGNMENT, 1);
    state.pixelStorei(glc.GL_UNPACK_COLORSPACE_CONVERSION_WEBGL, glc.GL_NONE);
    state.bindTexture(0, this.glTarget, this._glTexture);
    this._uploadRegion(source, region);

    // The engine's 2D textures upload with WebGL's default pixel storage
    // (browser color conversion included) without setting it, so it's put
    // back after every upload.
    state.pixelStorei(glc.GL_UNPACK_ALIGNMENT, 4);
    state.pixelStorei(
      glc.GL_UNPACK_COLORSPACE_CONVERSION_WEBGL,
      glc.GL_BROWSER_DEFAULT_WEBGL,
    );
  }

  private _uploadRegion(source: GpuTextureSource, region: WriteRegion): void {
    if (this.dimension === 'cube') {
      this._uploadCubeFaces(source, region);

      return;
    }

    if (this.dimension === '2d') {
      this._upload2d(this.glTarget, source, region);

      return;
    }

    this._upload3d(source, region);
  }

  private _uploadCubeFaces(
    source: GpuTextureSource,
    region: WriteRegion,
  ): void {
    const faceRegion = { ...region, layerCount: 1 };

    for (let index = 0; index < region.layerCount; index++) {
      const face = glc.GL_TEXTURE_CUBE_MAP_POSITIVE_X + region.layer + index;
      const faceSource = isTypedArray(source)
        ? this._layerOf(source, region, index)
        : source;

      this._upload2d(face, faceSource, faceRegion);
    }
  }

  private _upload2d(
    target: number,
    source: GpuTextureSource,
    region: WriteRegion,
  ): void {
    const { gl } = this._context;
    const info = this.formatInfo;
    const { mipLevel, x, y, width, height } = region;

    if (!isTypedArray(source)) {
      gl.texSubImage2D(
        target,
        mipLevel,
        x,
        y,
        width,
        height,
        info.format,
        info.imageType,
        source,
      );

      return;
    }

    if (info.compression !== null) {
      gl.compressedTexSubImage2D(
        target,
        mipLevel,
        x,
        y,
        width,
        height,
        info.internalFormat,
        source,
      );

      return;
    }

    gl.texSubImage2D(
      target,
      mipLevel,
      x,
      y,
      width,
      height,
      info.format,
      getUploadType(info, source),
      source,
    );
  }

  private _upload3d(source: GpuTextureSource, region: WriteRegion): void {
    const { gl } = this._context;
    const info = this.formatInfo;
    const { mipLevel, x, y, layer, width, height, layerCount } = region;

    if (!isTypedArray(source)) {
      gl.texSubImage3D(
        this.glTarget,
        mipLevel,
        x,
        y,
        layer,
        width,
        height,
        layerCount,
        info.format,
        info.imageType,
        source,
      );

      return;
    }

    if (info.compression !== null) {
      gl.compressedTexSubImage3D(
        this.glTarget,
        mipLevel,
        x,
        y,
        layer,
        width,
        height,
        layerCount,
        info.internalFormat,
        source,
      );

      return;
    }

    gl.texSubImage3D(
      this.glTarget,
      mipLevel,
      x,
      y,
      layer,
      width,
      height,
      layerCount,
      info.format,
      getUploadType(info, source),
      source,
    );
  }

  /** The bytes of one layer of a multi-layer typed array. */
  private _layerOf(
    source: ArrayBufferView,
    region: WriteRegion,
    index: number,
  ): ArrayBufferView {
    const layerBytes = this._regionBytes(region.width, region.height);

    return sliceTypedArray(source, layerBytes * index, layerBytes);
  }

  /** The bytes a region of one layer takes. */
  private _regionBytes(width: number, height: number): number {
    const info = this.formatInfo;
    const blocksWide = Math.ceil(width / info.blockWidth);
    const blocksHigh = Math.ceil(height / info.blockHeight);

    return blocksWide * blocksHigh * info.bytesPerBlock;
  }

  private _resolveRegion(
    source: GpuTextureSource,
    options: GpuTextureWriteOptions,
  ): WriteRegion {
    if (this.sampleCount > 1) {
      throw new Error(
        `Texture "${this.label}" is multisampled and can't be written.`,
      );
    }

    const mipLevel = options.mipLevel ?? 0;
    const layer = options.layer ?? 0;
    const x = options.origin?.x ?? 0;
    const y = options.origin?.y ?? 0;

    if (
      !Number.isInteger(mipLevel) ||
      mipLevel < 0 ||
      mipLevel >= this.mipLevelCount
    ) {
      throw new Error(`Texture "${this.label}" has no mip level ${mipLevel}.`);
    }

    const levelWidth = this.widthAt(mipLevel);
    const levelHeight = this.heightAt(mipLevel);
    const imageSize = isTypedArray(source) ? null : getImageSize(source);
    const width = options.size?.width ?? imageSize?.width ?? levelWidth - x;
    const height = options.size?.height ?? imageSize?.height ?? levelHeight - y;
    const layerCount = options.size?.depthOrArrayLayers ?? 1;
    const fits =
      x >= 0 &&
      y >= 0 &&
      width > 0 &&
      height > 0 &&
      x + width <= levelWidth &&
      y + height <= levelHeight &&
      layer >= 0 &&
      layerCount >= 1 &&
      layer + layerCount <= this.layersAt(mipLevel);

    if (!fits) {
      throw new Error(
        `A ${width}x${height}x${layerCount} write at (${x}, ${y}, layer ${layer}) doesn't fit mip level ${mipLevel} of texture "${this.label}" (${levelWidth}x${levelHeight}x${this.layersAt(mipLevel)}).`,
      );
    }

    if (imageSize && layerCount !== 1) {
      throw new Error('An image fills one layer at a time.');
    }

    this._assertBlockAligned({
      mipLevel,
      layer,
      layerCount,
      x,
      y,
      width,
      height,
    });

    return { mipLevel, layer, layerCount, x, y, width, height };
  }

  private _assertBlockAligned(region: WriteRegion): void {
    const info = this.formatInfo;

    if (info.compression === null) {
      return;
    }

    const reachesRight =
      region.x + region.width === this.widthAt(region.mipLevel);
    const reachesTop =
      region.y + region.height === this.heightAt(region.mipLevel);
    const aligned =
      region.x % info.blockWidth === 0 &&
      region.y % info.blockHeight === 0 &&
      (region.width % info.blockWidth === 0 || reachesRight) &&
      (region.height % info.blockHeight === 0 || reachesTop);

    if (!aligned) {
      throw new Error(
        `A write to compressed texture "${this.label}" must cover whole ${info.blockWidth}x${info.blockHeight} blocks.`,
      );
    }
  }

  private _assertTypedArrayFits(
    source: ArrayBufferView,
    region: WriteRegion,
  ): void {
    const needed =
      this._regionBytes(region.width, region.height) * region.layerCount;

    if (source.byteLength < needed) {
      throw new Error(
        `A ${region.width}x${region.height}x${region.layerCount} write to texture "${this.label}" needs ${needed} bytes, received ${source.byteLength}.`,
      );
    }
  }

  private _assertRestoreSourceFits(source: ArrayBufferView): void {
    if (this.sampleCount > 1) {
      throw new Error(
        `Multisampled texture "${this.label}" can't have a restore source.`,
      );
    }

    this._assertTypedArrayFits(source, {
      mipLevel: 0,
      layer: 0,
      layerCount: this.depthOrArrayLayers,
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
    });

    if (this.formatInfo.compression === null) {
      getUploadType(this.formatInfo, source);
    }
  }

  private _assertAlive(): void {
    if (this._isDestroyed) {
      throw new Error(
        `Texture "${this.label}" has been destroyed and can no longer be used.`,
      );
    }
  }
}

/** A typed array of the same type over `byteLength` bytes from `byteOffset`. */
function sliceTypedArray(
  source: ArrayBufferView,
  byteOffset: number,
  byteLength: number,
): ArrayBufferView {
  const constructor = source.constructor as new (
    buffer: ArrayBufferLike,
    byteOffset: number,
    length: number,
  ) => ArrayBufferView;
  const bytesPerElement =
    'BYTES_PER_ELEMENT' in source &&
    typeof source.BYTES_PER_ELEMENT === 'number'
      ? source.BYTES_PER_ELEMENT
      : 1;

  return new constructor(
    source.buffer,
    source.byteOffset + byteOffset,
    byteLength / bytesPerElement,
  );
}
