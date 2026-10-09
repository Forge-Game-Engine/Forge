import type { GpuTextureFormat } from './gpu-texture.js';

/** The device's limits, read once when it's created. */
export interface GpuLimits {
  /** The largest width or height of a 2D texture. */
  readonly maxTextureSize: number;

  /** The largest width, height or depth of a 3D texture. */
  readonly max3dTextureSize: number;

  /** The most layers a `'2d-array'` texture can have. */
  readonly maxArrayTextureLayers: number;

  /** The largest face of a cube texture. */
  readonly maxCubeTextureSize: number;

  /** The most samples any format supports. */
  readonly maxSamples: number;

  /** The largest uniform buffer range one binding can cover, in bytes. */
  readonly maxUniformBlockSize: number;

  /** The number of uniform buffer binding points. */
  readonly maxUniformBufferBindings: number;

  /** The most textures the fragment stage can sample in one draw. */
  readonly maxTextureImageUnits: number;

  /** The most textures the vertex stage can sample in one draw. */
  readonly maxVertexTextureImageUnits: number;

  /** The most textures both stages together can sample in one draw. */
  readonly maxCombinedTextureImageUnits: number;

  /**
   * The alignment, in bytes, of a uniform buffer binding's offset (and so
   * of every dynamic offset).
   */
  readonly uniformBufferOffsetAlignment: number;

  /** The most color attachments a render pass can have. */
  readonly maxColorAttachments: number;

  /** The most vertex attributes a pipeline can read. */
  readonly maxVertexAttributes: number;
}

/** Which block-compressed texture formats the device can sample. */
export interface GpuTextureCompression {
  /** BC1 to BC3 (`WEBGL_compressed_texture_s3tc`). */
  readonly bc: boolean;

  /** The sRGB forms of BC1 to BC3 (`WEBGL_compressed_texture_s3tc_srgb`). */
  readonly bcSrgb: boolean;

  /** BC4 and BC5 (`EXT_texture_compression_rgtc`). */
  readonly rgtc: boolean;

  /** BC6H and BC7 (`EXT_texture_compression_bptc`). */
  readonly bptc: boolean;

  /** ETC2 and EAC (`WEBGL_compressed_texture_etc`). */
  readonly etc: boolean;

  /** ASTC (`WEBGL_compressed_texture_astc`). */
  readonly astc: boolean;
}

/**
 * What the device can do beyond WebGL2's baseline: the extensions it
 * requested and has, and its limits. Read once when the device is created,
 * and again when a lost WebGL context is restored.
 */
export interface GpuCapabilities {
  /**
   * Whether 16- and 32-bit float color formats can be rendered to
   * (`EXT_color_buffer_float`). HDR views and effects need this or
   * {@link GpuCapabilities.colorBufferHalfFloat}.
   */
  readonly colorBufferFloat: boolean;

  /**
   * Whether 16-bit float color formats can be rendered to
   * (`EXT_color_buffer_float` or `EXT_color_buffer_half_float`).
   */
  readonly colorBufferHalfFloat: boolean;

  /**
   * Whether 32-bit float textures can be sampled with `'linear'` filtering
   * (`OES_texture_float_linear`). Without it they're bound as
   * `'unfilterable-float'` and sampled with `'nearest'`.
   */
  readonly floatTextureLinearFiltering: boolean;

  /** Whether `rgba32float` targets can be blended into (`EXT_float_blend`). */
  readonly floatBlend: boolean;

  /**
   * The highest sampler anisotropy (`EXT_texture_filter_anisotropic`), `1`
   * without the extension.
   */
  readonly maxAnisotropy: number;

  /** The compressed texture formats the device can sample. */
  readonly textureCompression: GpuTextureCompression;

  /**
   * Whether shaders compile without blocking
   * (`KHR_parallel_shader_compile`).
   */
  readonly parallelShaderCompile: boolean;

  /** Whether several draws can be issued in one call (`WEBGL_multi_draw`). */
  readonly multiDraw: boolean;

  /**
   * Whether clip-space depth can be `[0, 1]` (`EXT_clip_control`), which
   * reversed depth needs.
   */
  readonly clipControl: boolean;

  /** Whether GPU time can be measured (`EXT_disjoint_timer_query_webgl2`). */
  readonly timerQuery: boolean;

  /**
   * Whether each color target of a pipeline can have its own blend state
   * and write mask (`OES_draw_buffers_indexed`).
   */
  readonly independentBlend: boolean;

  /** The device's limits. */
  readonly limits: GpuLimits;

  /**
   * Returns the sample counts above `1` that the device supports for
   * rendering to `format`, highest first. Empty for a format that can't be
   * multisampled.
   * @param format - The texture format.
   * @returns The supported sample counts.
   */
  getSampleCounts(format: GpuTextureFormat): readonly number[];
}
