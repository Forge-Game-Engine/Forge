import type {
  GpuCapabilities,
  GpuTextureCompression,
} from '../gpu-capabilities.js';
import type { GpuAstcBlockSize, GpuTextureFormat } from '../gpu-texture.js';
import * as gl from './gl-constants.js';

/**
 * The capability a format needs before it can be rendered to: none
 * (`'always'`), a float color buffer extension, or never (compressed).
 */
type Renderability = 'always' | 'halfFloat' | 'float' | 'never';

/** What a format's texels read as in a shader. */
export type FormatSampleClass = 'float' | 'float32' | 'uint' | 'depth';

/** How a texture format maps onto WebGL2. */
export interface TextureFormatInfo {
  /** The format's WebGPU name. */
  readonly name: GpuTextureFormat;

  /** The sized internal format given to `texStorage*`. */
  readonly internalFormat: number;

  /** The pixel format of uploads (`0` for compressed formats). */
  readonly format: number;

  /** The texel type of typed-array uploads (`0` for compressed formats). */
  readonly type: number;

  /**
   * The type images are uploaded as, which the browser converts them to,
   * or `0` for formats an image can't fill.
   */
  readonly imageType: number;

  /** Bytes per texel, or per block for a compressed format. */
  readonly bytesPerBlock: number;

  /** The width of a compressed block, `1` for uncompressed formats. */
  readonly blockWidth: number;

  /** The height of a compressed block, `1` for uncompressed formats. */
  readonly blockHeight: number;

  /** Whether the format has an alpha channel. */
  readonly hasAlpha: boolean;

  /** What its texels read as in a shader. */
  readonly sampleClass: FormatSampleClass;

  /** Whether it has a depth component. */
  readonly hasDepth: boolean;

  /** Whether it has a stencil component. */
  readonly hasStencil: boolean;

  /** What rendering to it needs. */
  readonly renderability: Renderability;

  /** The compression family it belongs to, for compressed formats. */
  readonly compression: keyof GpuTextureCompression | null;
}

interface UncompressedFormat {
  internalFormat: number;
  format: number;
  type: number;
  imageType: number;
  bytesPerTexel: number;
  hasAlpha: boolean;
  sampleClass: FormatSampleClass;
  renderability: Renderability;
}

const formats = new Map<GpuTextureFormat, TextureFormatInfo>();

function addUncompressed(
  name: GpuTextureFormat,
  description: UncompressedFormat,
): void {
  formats.set(name, {
    name,
    internalFormat: description.internalFormat,
    format: description.format,
    type: description.type,
    imageType: description.imageType,
    bytesPerBlock: description.bytesPerTexel,
    blockWidth: 1,
    blockHeight: 1,
    hasAlpha: description.hasAlpha,
    sampleClass: description.sampleClass,
    hasDepth:
      description.format === gl.GL_DEPTH_COMPONENT ||
      description.format === gl.GL_DEPTH_STENCIL,
    hasStencil: description.format === gl.GL_DEPTH_STENCIL,
    renderability: description.renderability,
    compression: null,
  });
}

function addCompressed(
  name: GpuTextureFormat,
  internalFormat: number,
  compression: keyof GpuTextureCompression,
  block: { width: number; height: number; bytes: number; hasAlpha: boolean },
): void {
  formats.set(name, {
    name,
    internalFormat,
    format: 0,
    type: 0,
    imageType: 0,
    bytesPerBlock: block.bytes,
    blockWidth: block.width,
    blockHeight: block.height,
    hasAlpha: block.hasAlpha,
    sampleClass: 'float',
    hasDepth: false,
    hasStencil: false,
    renderability: 'never',
    compression,
  });
}

const unorm8 = {
  type: gl.GL_UNSIGNED_BYTE,
  imageType: gl.GL_UNSIGNED_BYTE,
  sampleClass: 'float',
  renderability: 'always',
} as const;

addUncompressed('r8unorm', {
  ...unorm8,
  internalFormat: gl.GL_R8,
  format: gl.GL_RED,
  bytesPerTexel: 1,
  hasAlpha: false,
});
addUncompressed('rg8unorm', {
  ...unorm8,
  internalFormat: gl.GL_RG8,
  format: gl.GL_RG,
  bytesPerTexel: 2,
  hasAlpha: false,
});
addUncompressed('rgba8unorm', {
  ...unorm8,
  internalFormat: gl.GL_RGBA8,
  format: gl.GL_RGBA,
  bytesPerTexel: 4,
  hasAlpha: true,
});
addUncompressed('rgba8unorm-srgb', {
  ...unorm8,
  internalFormat: gl.GL_SRGB8_ALPHA8,
  format: gl.GL_RGBA,
  bytesPerTexel: 4,
  hasAlpha: true,
});

const float16 = {
  type: gl.GL_HALF_FLOAT,
  imageType: gl.GL_FLOAT,
  sampleClass: 'float',
  renderability: 'halfFloat',
} as const;

addUncompressed('r16float', {
  ...float16,
  internalFormat: gl.GL_R16F,
  format: gl.GL_RED,
  bytesPerTexel: 2,
  hasAlpha: false,
});
addUncompressed('rg16float', {
  ...float16,
  internalFormat: gl.GL_RG16F,
  format: gl.GL_RG,
  bytesPerTexel: 4,
  hasAlpha: false,
});
addUncompressed('rgba16float', {
  ...float16,
  internalFormat: gl.GL_RGBA16F,
  format: gl.GL_RGBA,
  bytesPerTexel: 8,
  hasAlpha: true,
});

const float32 = {
  type: gl.GL_FLOAT,
  imageType: gl.GL_FLOAT,
  sampleClass: 'float32',
  renderability: 'float',
} as const;

addUncompressed('r32float', {
  ...float32,
  internalFormat: gl.GL_R32F,
  format: gl.GL_RED,
  bytesPerTexel: 4,
  hasAlpha: false,
});
addUncompressed('rg32float', {
  ...float32,
  internalFormat: gl.GL_RG32F,
  format: gl.GL_RG,
  bytesPerTexel: 8,
  hasAlpha: false,
});
addUncompressed('rgba32float', {
  ...float32,
  internalFormat: gl.GL_RGBA32F,
  format: gl.GL_RGBA,
  bytesPerTexel: 16,
  hasAlpha: true,
});
addUncompressed('rg11b10ufloat', {
  internalFormat: gl.GL_R11F_G11F_B10F,
  format: gl.GL_RGB,
  type: gl.GL_UNSIGNED_INT_10F_11F_11F_REV,
  imageType: gl.GL_FLOAT,
  bytesPerTexel: 4,
  hasAlpha: false,
  sampleClass: 'float',
  renderability: 'float',
});
addUncompressed('rgb10a2unorm', {
  internalFormat: gl.GL_RGB10_A2,
  format: gl.GL_RGBA,
  type: gl.GL_UNSIGNED_INT_2_10_10_10_REV,
  imageType: 0,
  bytesPerTexel: 4,
  hasAlpha: true,
  sampleClass: 'float',
  renderability: 'always',
});

const uint32 = {
  type: gl.GL_UNSIGNED_INT,
  imageType: 0,
  sampleClass: 'uint',
  renderability: 'always',
} as const;

addUncompressed('r32uint', {
  ...uint32,
  internalFormat: gl.GL_R32UI,
  format: gl.GL_RED_INTEGER,
  bytesPerTexel: 4,
  hasAlpha: false,
});
addUncompressed('rg32uint', {
  ...uint32,
  internalFormat: gl.GL_RG32UI,
  format: gl.GL_RG_INTEGER,
  bytesPerTexel: 8,
  hasAlpha: false,
});
addUncompressed('rgba32uint', {
  ...uint32,
  internalFormat: gl.GL_RGBA32UI,
  format: gl.GL_RGBA_INTEGER,
  bytesPerTexel: 16,
  hasAlpha: true,
});

const depth = {
  imageType: 0,
  hasAlpha: false,
  sampleClass: 'depth',
  renderability: 'always',
} as const;

addUncompressed('depth16unorm', {
  ...depth,
  internalFormat: gl.GL_DEPTH_COMPONENT16,
  format: gl.GL_DEPTH_COMPONENT,
  type: gl.GL_UNSIGNED_SHORT,
  bytesPerTexel: 2,
});
addUncompressed('depth24plus', {
  ...depth,
  internalFormat: gl.GL_DEPTH_COMPONENT24,
  format: gl.GL_DEPTH_COMPONENT,
  type: gl.GL_UNSIGNED_INT,
  bytesPerTexel: 4,
});
addUncompressed('depth24plus-stencil8', {
  ...depth,
  internalFormat: gl.GL_DEPTH24_STENCIL8,
  format: gl.GL_DEPTH_STENCIL,
  type: gl.GL_UNSIGNED_INT_24_8,
  bytesPerTexel: 4,
});
addUncompressed('depth32float', {
  ...depth,
  internalFormat: gl.GL_DEPTH_COMPONENT32F,
  format: gl.GL_DEPTH_COMPONENT,
  type: gl.GL_FLOAT,
  bytesPerTexel: 4,
});

const block4x4 = (bytes: number, hasAlpha: boolean) => ({
  width: 4,
  height: 4,
  bytes,
  hasAlpha,
});

addCompressed(
  'bc1-rgba-unorm',
  gl.GL_COMPRESSED_RGBA_S3TC_DXT1_EXT,
  'bc',
  block4x4(8, true),
);
addCompressed(
  'bc1-rgba-unorm-srgb',
  gl.GL_COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT,
  'bcSrgb',
  block4x4(8, true),
);
addCompressed(
  'bc2-rgba-unorm',
  gl.GL_COMPRESSED_RGBA_S3TC_DXT3_EXT,
  'bc',
  block4x4(16, true),
);
addCompressed(
  'bc2-rgba-unorm-srgb',
  gl.GL_COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT,
  'bcSrgb',
  block4x4(16, true),
);
addCompressed(
  'bc3-rgba-unorm',
  gl.GL_COMPRESSED_RGBA_S3TC_DXT5_EXT,
  'bc',
  block4x4(16, true),
);
addCompressed(
  'bc3-rgba-unorm-srgb',
  gl.GL_COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT,
  'bcSrgb',
  block4x4(16, true),
);
addCompressed(
  'bc4-r-unorm',
  gl.GL_COMPRESSED_RED_RGTC1_EXT,
  'rgtc',
  block4x4(8, false),
);
addCompressed(
  'bc4-r-snorm',
  gl.GL_COMPRESSED_SIGNED_RED_RGTC1_EXT,
  'rgtc',
  block4x4(8, false),
);
addCompressed(
  'bc5-rg-unorm',
  gl.GL_COMPRESSED_RED_GREEN_RGTC2_EXT,
  'rgtc',
  block4x4(16, false),
);
addCompressed(
  'bc5-rg-snorm',
  gl.GL_COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT,
  'rgtc',
  block4x4(16, false),
);
addCompressed(
  'bc6h-rgb-ufloat',
  gl.GL_COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT,
  'bptc',
  block4x4(16, false),
);
addCompressed(
  'bc6h-rgb-float',
  gl.GL_COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT,
  'bptc',
  block4x4(16, false),
);
addCompressed(
  'bc7-rgba-unorm',
  gl.GL_COMPRESSED_RGBA_BPTC_UNORM_EXT,
  'bptc',
  block4x4(16, true),
);
addCompressed(
  'bc7-rgba-unorm-srgb',
  gl.GL_COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT,
  'bptc',
  block4x4(16, true),
);
addCompressed(
  'etc2-rgb8unorm',
  gl.GL_COMPRESSED_RGB8_ETC2,
  'etc',
  block4x4(8, false),
);
addCompressed(
  'etc2-rgb8unorm-srgb',
  gl.GL_COMPRESSED_SRGB8_ETC2,
  'etc',
  block4x4(8, false),
);
addCompressed(
  'etc2-rgb8a1unorm',
  gl.GL_COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2,
  'etc',
  block4x4(8, true),
);
addCompressed(
  'etc2-rgb8a1unorm-srgb',
  gl.GL_COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2,
  'etc',
  block4x4(8, true),
);
addCompressed(
  'etc2-rgba8unorm',
  gl.GL_COMPRESSED_RGBA8_ETC2_EAC,
  'etc',
  block4x4(16, true),
);
addCompressed(
  'etc2-rgba8unorm-srgb',
  gl.GL_COMPRESSED_SRGB8_ALPHA8_ETC2_EAC,
  'etc',
  block4x4(16, true),
);
addCompressed(
  'eac-r11unorm',
  gl.GL_COMPRESSED_R11_EAC,
  'etc',
  block4x4(8, false),
);
addCompressed(
  'eac-r11snorm',
  gl.GL_COMPRESSED_SIGNED_R11_EAC,
  'etc',
  block4x4(8, false),
);
addCompressed(
  'eac-rg11unorm',
  gl.GL_COMPRESSED_RG11_EAC,
  'etc',
  block4x4(16, false),
);
addCompressed(
  'eac-rg11snorm',
  gl.GL_COMPRESSED_SIGNED_RG11_EAC,
  'etc',
  block4x4(16, false),
);

// The ASTC block sizes, in the order of their GL enums.
const astcBlockSizes: readonly GpuAstcBlockSize[] = [
  '4x4',
  '5x4',
  '5x5',
  '6x5',
  '6x6',
  '8x5',
  '8x6',
  '8x8',
  '10x5',
  '10x6',
  '10x8',
  '10x10',
  '12x10',
  '12x12',
];

astcBlockSizes.forEach((size, index) => {
  const [width, height] = size.split('x').map(Number);
  const block = { width, height, bytes: 16, hasAlpha: true };

  addCompressed(
    `astc-${size}-unorm`,
    gl.GL_COMPRESSED_RGBA_ASTC_4X4_KHR + index,
    'astc',
    block,
  );
  addCompressed(
    `astc-${size}-unorm-srgb`,
    gl.GL_COMPRESSED_SRGB8_ALPHA8_ASTC_4X4_KHR + index,
    'astc',
    block,
  );
});

/** Every texture format, by name. */
export const textureFormats: ReadonlyMap<GpuTextureFormat, TextureFormatInfo> =
  formats;

/**
 * Returns how a format maps onto WebGL2.
 * @param format - The format's name.
 * @returns The format's information.
 * @throws An error for an unknown format.
 */
export function getTextureFormatInfo(
  format: GpuTextureFormat,
): TextureFormatInfo {
  const info = formats.get(format);

  if (!info) {
    throw new Error(`Unknown texture format "${String(format)}".`);
  }

  return info;
}

/**
 * Whether a format can be created on a device: compressed formats need
 * their extension.
 * @param info - The format.
 * @param capabilities - The device's capabilities.
 * @returns Whether the format is available.
 */
export function isFormatAvailable(
  info: TextureFormatInfo,
  capabilities: GpuCapabilities,
): boolean {
  return (
    info.compression === null ||
    capabilities.textureCompression[info.compression]
  );
}

/**
 * Whether a format can be rendered to on a device.
 * @param info - The format.
 * @param capabilities - The device's capabilities.
 * @returns Whether it's renderable.
 */
export function isFormatRenderable(
  info: TextureFormatInfo,
  capabilities: Pick<
    GpuCapabilities,
    'colorBufferFloat' | 'colorBufferHalfFloat'
  >,
): boolean {
  const byRenderability: Record<Renderability, boolean> = {
    always: true,
    halfFloat: capabilities.colorBufferHalfFloat,
    float: capabilities.colorBufferFloat,
    never: false,
  };

  return byRenderability[info.renderability];
}

/**
 * Whether a format can be sampled with `'linear'` filtering on a device.
 * @param info - The format.
 * @param capabilities - The device's capabilities.
 * @returns Whether it's filterable.
 */
export function isFormatFilterable(
  info: TextureFormatInfo,
  capabilities: Pick<GpuCapabilities, 'floatTextureLinearFiltering'>,
): boolean {
  if (info.sampleClass === 'float32') {
    return capabilities.floatTextureLinearFiltering;
  }

  return info.sampleClass === 'float';
}
