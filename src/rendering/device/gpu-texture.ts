/** The uncompressed color formats a {@link GpuTexture} can have. */
export type GpuColorTextureFormat =
  | 'r8unorm'
  | 'rg8unorm'
  | 'rgba8unorm'
  | 'rgba8unorm-srgb'
  | 'r16float'
  | 'rg16float'
  | 'rgba16float'
  | 'r32float'
  | 'rg32float'
  | 'rgba32float'
  | 'rg11b10ufloat'
  | 'rgb10a2unorm'
  | 'r32uint'
  | 'rg32uint'
  | 'rgba32uint';

/** The depth and depth-stencil formats a {@link GpuTexture} can have. */
export type GpuDepthTextureFormat =
  'depth16unorm' | 'depth24plus' | 'depth24plus-stencil8' | 'depth32float';

/** The block sizes of the ASTC compressed formats, in texels. */
export type GpuAstcBlockSize =
  | '4x4'
  | '5x4'
  | '5x5'
  | '6x5'
  | '6x6'
  | '8x5'
  | '8x6'
  | '8x8'
  | '10x5'
  | '10x6'
  | '10x8'
  | '10x10'
  | '12x10'
  | '12x12';

/**
 * The block-compressed formats a {@link GpuTexture} can have, each available
 * when the device has its extension (see `GpuCapabilities.textureCompression`).
 */
export type GpuCompressedTextureFormat =
  | 'bc1-rgba-unorm'
  | 'bc1-rgba-unorm-srgb'
  | 'bc2-rgba-unorm'
  | 'bc2-rgba-unorm-srgb'
  | 'bc3-rgba-unorm'
  | 'bc3-rgba-unorm-srgb'
  | 'bc4-r-unorm'
  | 'bc4-r-snorm'
  | 'bc5-rg-unorm'
  | 'bc5-rg-snorm'
  | 'bc6h-rgb-ufloat'
  | 'bc6h-rgb-float'
  | 'bc7-rgba-unorm'
  | 'bc7-rgba-unorm-srgb'
  | 'etc2-rgb8unorm'
  | 'etc2-rgb8unorm-srgb'
  | 'etc2-rgb8a1unorm'
  | 'etc2-rgb8a1unorm-srgb'
  | 'etc2-rgba8unorm'
  | 'etc2-rgba8unorm-srgb'
  | 'eac-r11unorm'
  | 'eac-r11snorm'
  | 'eac-rg11unorm'
  | 'eac-rg11snorm'
  | `astc-${GpuAstcBlockSize}-unorm`
  | `astc-${GpuAstcBlockSize}-unorm-srgb`;

/**
 * A texture format, named as WebGPU names it: the channels, their bits and
 * how they're read (`unorm` reads `[0, 1]` floats, `uint` reads integers,
 * `-srgb` decodes sRGB to linear when sampled and encodes when rendered to).
 */
export type GpuTextureFormat =
  GpuColorTextureFormat | GpuDepthTextureFormat | GpuCompressedTextureFormat;

/**
 * The shape of a texture: one image (`'2d'`), a stack of same-sized images
 * sampled by layer (`'2d-array'`), six square faces (`'cube'`) or a volume
 * (`'3d'`).
 */
export type GpuTextureDimension = '2d' | '2d-array' | 'cube' | '3d';

/**
 * What a texture is used for: sampled in shaders, written from the CPU, or
 * rendered into as a render pass attachment.
 */
export type GpuTextureUsage =
  'sampled' | 'copy-destination' | 'render-attachment';

/** A texture's size, in texels. */
export interface GpuExtent3d {
  /** The width, in texels. */
  width: number;

  /** The height, in texels. */
  height: number;

  /**
   * The number of array layers (`'2d-array'`), faces (`6` for `'cube'`) or
   * depth slices (`'3d'`). Defaults to `1`.
   */
  depthOrArrayLayers?: number;
}

/** Describes a texture for `GpuDevice.createTexture`. */
export interface GpuTextureDescriptor {
  /** The texture's shape. Defaults to `'2d'`. */
  dimension?: GpuTextureDimension;

  /** The texture's format. */
  format: GpuTextureFormat;

  /** The size of mip level 0. */
  size: GpuExtent3d;

  /**
   * The number of mip levels, or `'full'` for a complete chain down to
   * 1x1. Defaults to `1`.
   */
  mipLevelCount?: number | 'full';

  /**
   * The number of samples per texel. Above `1`, the texture is a
   * multisampled render attachment that can't be sampled or written, only
   * rendered into and resolved into a single-sampled texture of the same
   * format by a render pass. Must be one of the counts the device supports
   * for the format (`capabilities.getSampleCounts`). Defaults to `1`.
   */
  sampleCount?: number;

  /** What the texture is used for. */
  usage: readonly GpuTextureUsage[];

  /**
   * A typed array holding the whole of mip level 0 (every layer, one after
   * another), for an owner that keeps the texture's contents on the CPU and
   * uploads only the ranges it changes. The device keeps it by reference
   * and uploads it whole when a lost WebGL context is restored, so rows
   * written once come back without the owner doing anything. Writes don't
   * replace it; an owner that grows its array creates a new texture.
   */
  restoreSource?: ArrayBufferView;

  /** A name for the texture, used in error messages. */
  label?: string;
}

/**
 * What a texture is written from: an image, canvas, `ImageData`,
 * `ImageBitmap` or video frame, or a typed array of texels.
 */
export type GpuTextureSource = TexImageSource | ArrayBufferView;

/** Where a {@link GpuTexture.write} lands in the texture. */
export interface GpuTextureWriteOptions {
  /** The mip level written. Defaults to `0`. */
  mipLevel?: number;

  /**
   * The first array layer, cube face (`+X`, `-X`, `+Y`, `-Y`, `+Z`, `-Z`)
   * or depth slice written. Defaults to `0`.
   */
  layer?: number;

  /** The texel the written region starts at. Defaults to `(0, 0)`. */
  origin?: { x?: number; y?: number };

  /**
   * The size of the written region. Defaults to the source's size for an
   * image, and to the rest of the mip level from `origin` for a typed
   * array, one layer deep.
   */
  size?: GpuExtent3d;
}

/**
 * A GPU texture: storage for texels of one format, with a fixed size,
 * shape, mip level count and sample count, created by
 * `GpuDevice.createTexture`.
 *
 * Images are stored as authored: uploads never flip, premultiply or
 * color-convert texels, so data textures (normal maps, masks) keep their
 * exact values. The first row of a source is row `0` of the texture.
 *
 * A texture keeps what it needs to upload its contents again when a lost
 * WebGL context is restored: its `restoreSource` if it has one, otherwise
 * the source of the latest write that covered each whole layer of each mip
 * level. Writes of smaller regions aren't kept, so a texture written in
 * ranges is restored whole only with a `restoreSource`. A render
 * attachment comes back empty, for the next frame to draw into.
 */
export interface GpuTexture {
  /** The texture's shape. */
  readonly dimension: GpuTextureDimension;

  /** The texture's format. */
  readonly format: GpuTextureFormat;

  /** The width of mip level 0, in texels. */
  readonly width: number;

  /** The height of mip level 0, in texels. */
  readonly height: number;

  /** The number of array layers, faces or depth slices. */
  readonly depthOrArrayLayers: number;

  /** The number of mip levels. */
  readonly mipLevelCount: number;

  /** The number of samples per texel. */
  readonly sampleCount: number;

  /** What the texture is used for. */
  readonly usage: readonly GpuTextureUsage[];

  /** The texture's label, or `''`. */
  readonly label: string;

  /**
   * Uploads texels into the texture. A typed array holds the region's
   * texels tightly packed, row after row and layer after layer, in the
   * texture's format (half-float formats also accept a `Float32Array`).
   * An image source is uploaded with its texels unchanged.
   *
   * A write that covers whole layers of a mip level keeps `source` by
   * reference, to upload it again if the WebGL context is lost and
   * restored, so don't change or close it afterwards (a canvas is uploaded
   * with what it shows then, and a closed `ImageBitmap` or `VideoFrame`
   * can't be). Write a copy, or create the texture with a
   * `restoreSource`, for contents that change.
   * @param source - The texels to upload.
   * @param options - Where they go.
   * @throws An error if the texture can't be written (it lacks the
   * `'copy-destination'` usage, or is multisampled), if the region doesn't
   * fit the mip level, if the source can't fill this format, or while a
   * render pass is open.
   */
  write(source: GpuTextureSource, options?: GpuTextureWriteOptions): void;

  /**
   * Fills mip levels `1` and up from level `0`, by repeated downsampling.
   * @throws An error if the format can't be both rendered to and filtered
   * on this device, or is compressed, or while a render pass is open.
   */
  generateMipmaps(): void;

  /**
   * Returns a view of one mip level and layer, to render into as a render
   * pass attachment.
   * @param descriptor - The mip level and layer (default: `0` and `0`).
   * @returns The view.
   */
  createView(descriptor?: GpuTextureViewDescriptor): GpuTextureView;

  /**
   * Frees the texture's GPU memory. Using it afterwards throws; destroying
   * it again does nothing.
   */
  destroy(): void;
}

/** Selects one mip level and layer of a texture. */
export interface GpuTextureViewDescriptor {
  /** The mip level. Defaults to `0`. */
  mipLevel?: number;

  /** The array layer, cube face or depth slice. Defaults to `0`. */
  arrayLayer?: number;
}

/** One mip level and layer of a texture, to render into. */
export interface GpuTextureView {
  /** The texture viewed. */
  readonly texture: GpuTexture;

  /** The mip level viewed. */
  readonly mipLevel: number;

  /** The array layer, cube face or depth slice viewed. */
  readonly arrayLayer: number;
}

/** What a sampler returns for texture coordinates outside `[0, 1]`. */
export type GpuAddressMode = 'repeat' | 'mirror-repeat' | 'clamp-to-edge';

/** How a sampler blends texels: the nearest one, or a weighted mix. */
export type GpuFilterMode = 'nearest' | 'linear';

/** A comparison, used for depth tests, stencil tests and shadow samplers. */
export type GpuCompareFunction =
  | 'never'
  | 'less'
  | 'equal'
  | 'less-equal'
  | 'greater'
  | 'not-equal'
  | 'greater-equal'
  | 'always';

/**
 * Describes a sampler for `GpuDevice.createSampler`. The defaults are
 * WebGPU's.
 */
export interface GpuSamplerDescriptor {
  /** Addressing along U (`s`). Defaults to `'clamp-to-edge'`. */
  addressModeU?: GpuAddressMode;

  /** Addressing along V (`t`). Defaults to `'clamp-to-edge'`. */
  addressModeV?: GpuAddressMode;

  /** Addressing along W (`r`). Defaults to `'clamp-to-edge'`. */
  addressModeW?: GpuAddressMode;

  /** Filtering when a texel covers several pixels. Defaults to `'nearest'`. */
  magFilter?: GpuFilterMode;

  /** Filtering when a pixel covers several texels. Defaults to `'nearest'`. */
  minFilter?: GpuFilterMode;

  /** Filtering between mip levels. Defaults to `'nearest'`. */
  mipmapFilter?: GpuFilterMode;

  /** The lowest mip level sampled. Defaults to `0`. */
  lodMinClamp?: number;

  /**
   * The highest mip level sampled. Defaults to `32`; `0` samples only the
   * first level.
   */
  lodMaxClamp?: number;

  /**
   * Makes this a comparison sampler, for shadow maps: sampling a depth
   * texture returns how many texels pass this comparison against the
   * reference depth.
   */
  compare?: GpuCompareFunction;

  /**
   * The highest anisotropy used, clamped to the device's
   * (`GpuCapabilities.maxAnisotropy`). Above `1`, every filter must be
   * `'linear'`. Defaults to `1`.
   */
  maxAnisotropy?: number;
}

/**
 * How a texture is sampled, created by `GpuDevice.createSampler`. The
 * device deduplicates samplers: equal descriptors return the same sampler,
 * which lives as long as the device.
 */
export interface GpuSampler {
  /** The sampler's settings, with every default filled in. */
  readonly descriptor: Readonly<
    Required<Omit<GpuSamplerDescriptor, 'compare'>>
  > &
    Pick<GpuSamplerDescriptor, 'compare'>;
}
