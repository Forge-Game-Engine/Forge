import type { GpuCapabilities, GpuLimits } from '../gpu-capabilities.js';
import type { GpuTextureFormat } from '../gpu-texture.js';
import * as glc from './gl-constants.js';
import { isFormatRenderable, textureFormats } from './texture-formats.js';

/**
 * The `OES_draw_buffers_indexed` functions the device calls for per-target
 * blending and write masks.
 */
export interface DrawBuffersIndexedExtension {
  enableiOES(target: number, index: number): void;
  disableiOES(target: number, index: number): void;
  blendEquationSeparateiOES(
    buffer: number,
    modeRgb: number,
    modeAlpha: number,
  ): void;
  blendFuncSeparateiOES(
    buffer: number,
    srcRgb: number,
    dstRgb: number,
    srcAlpha: number,
    dstAlpha: number,
  ): void;
  colorMaskiOES(
    buffer: number,
    red: boolean,
    green: boolean,
    blue: boolean,
    alpha: boolean,
  ): void;
}

/** The extension objects the device calls into. */
export interface WebGl2Extensions {
  readonly drawBuffersIndexed: DrawBuffersIndexedExtension | null;
}

/** What {@link readCapabilities} reads. */
export interface DeviceCapabilities {
  readonly capabilities: GpuCapabilities;
  readonly extensions: WebGl2Extensions;
}

/**
 * The limits WebGL2 guarantees, used for any limit the context doesn't
 * report (a lost context reports none).
 */
const minimumLimits: GpuLimits = {
  maxTextureSize: 2048,
  max3dTextureSize: 256,
  maxArrayTextureLayers: 256,
  maxCubeTextureSize: 2048,
  maxSamples: 4,
  maxUniformBlockSize: 16384,
  maxUniformBufferBindings: 24,
  maxTextureImageUnits: 16,
  maxVertexTextureImageUnits: 16,
  maxCombinedTextureImageUnits: 32,
  uniformBufferOffsetAlignment: 256,
  maxColorAttachments: 4,
  maxVertexAttributes: 16,
};

const limitParameters: Record<keyof GpuLimits, number> = {
  maxTextureSize: glc.GL_MAX_TEXTURE_SIZE,
  max3dTextureSize: glc.GL_MAX_3D_TEXTURE_SIZE,
  maxArrayTextureLayers: glc.GL_MAX_ARRAY_TEXTURE_LAYERS,
  maxCubeTextureSize: glc.GL_MAX_CUBE_MAP_TEXTURE_SIZE,
  maxSamples: glc.GL_MAX_SAMPLES,
  maxUniformBlockSize: glc.GL_MAX_UNIFORM_BLOCK_SIZE,
  maxUniformBufferBindings: glc.GL_MAX_UNIFORM_BUFFER_BINDINGS,
  maxTextureImageUnits: glc.GL_MAX_TEXTURE_IMAGE_UNITS,
  maxVertexTextureImageUnits: glc.GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS,
  maxCombinedTextureImageUnits: glc.GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS,
  uniformBufferOffsetAlignment: glc.GL_UNIFORM_BUFFER_OFFSET_ALIGNMENT,
  maxColorAttachments: glc.GL_MAX_COLOR_ATTACHMENTS,
  maxVertexAttributes: glc.GL_MAX_VERTEX_ATTRIBS,
};

function readLimits(gl: WebGL2RenderingContext): GpuLimits {
  const limits = { ...minimumLimits };

  for (const key of Object.keys(limitParameters) as (keyof GpuLimits)[]) {
    const value: unknown = gl.getParameter(limitParameters[key]);

    if (typeof value === 'number' && value > 0) {
      limits[key] = value;
    }
  }

  // Draw buffers bound a pass's color attachments as much as attachment
  // points do.
  const maxDrawBuffers: unknown = gl.getParameter(glc.GL_MAX_DRAW_BUFFERS);

  if (typeof maxDrawBuffers === 'number' && maxDrawBuffers > 0) {
    limits.maxColorAttachments = Math.min(
      limits.maxColorAttachments,
      maxDrawBuffers,
    );
  }

  return limits;
}

function hasExtension(gl: WebGL2RenderingContext, name: string): boolean {
  return gl.getExtension(name) !== null;
}

function readSampleCounts(
  gl: WebGL2RenderingContext,
  colorBuffer: Pick<
    GpuCapabilities,
    'colorBufferFloat' | 'colorBufferHalfFloat'
  >,
): Map<GpuTextureFormat, readonly number[]> {
  const sampleCounts = new Map<GpuTextureFormat, readonly number[]>();

  for (const info of textureFormats.values()) {
    if (!isFormatRenderable(info, colorBuffer)) {
      continue;
    }

    const samples: unknown = gl.getInternalformatParameter(
      glc.GL_RENDERBUFFER,
      info.internalFormat,
      glc.GL_SAMPLES,
    );
    const counts =
      samples instanceof Int32Array
        ? [...samples].filter((count) => count > 1).sort((a, b) => b - a)
        : [];

    sampleCounts.set(info.name, counts);
  }

  return sampleCounts;
}

/**
 * Requests every extension the device uses and reads the device's limits
 * and per-format sample counts. Extensions are lost with the context, so
 * this runs again on every restore. While the context is lost it reports
 * no extensions and WebGL2's minimum limits.
 * @param gl - The WebGL2 context.
 * @returns The capabilities, and the extension objects the device calls.
 */
export function readCapabilities(
  gl: WebGL2RenderingContext,
): DeviceCapabilities {
  const colorBufferFloat = hasExtension(gl, 'EXT_color_buffer_float');
  const colorBufferHalfFloat =
    colorBufferFloat || hasExtension(gl, 'EXT_color_buffer_half_float');
  const anisotropic = gl.getExtension('EXT_texture_filter_anisotropic');
  const maxAnisotropy: unknown = anisotropic
    ? gl.getParameter(glc.GL_MAX_TEXTURE_MAX_ANISOTROPY_EXT)
    : 1;
  const drawBuffersIndexed = gl.getExtension(
    'OES_draw_buffers_indexed',
  ) as DrawBuffersIndexedExtension | null;
  const colorBuffer = { colorBufferFloat, colorBufferHalfFloat };
  const sampleCounts = readSampleCounts(gl, colorBuffer);

  const capabilities: GpuCapabilities = {
    colorBufferFloat,
    colorBufferHalfFloat,
    floatTextureLinearFiltering: hasExtension(gl, 'OES_texture_float_linear'),
    floatBlend: hasExtension(gl, 'EXT_float_blend'),
    maxAnisotropy:
      typeof maxAnisotropy === 'number' && maxAnisotropy >= 1
        ? maxAnisotropy
        : 1,
    textureCompression: {
      bc: hasExtension(gl, 'WEBGL_compressed_texture_s3tc'),
      bcSrgb: hasExtension(gl, 'WEBGL_compressed_texture_s3tc_srgb'),
      rgtc: hasExtension(gl, 'EXT_texture_compression_rgtc'),
      bptc: hasExtension(gl, 'EXT_texture_compression_bptc'),
      etc: hasExtension(gl, 'WEBGL_compressed_texture_etc'),
      astc: hasExtension(gl, 'WEBGL_compressed_texture_astc'),
    },
    parallelShaderCompile: hasExtension(gl, 'KHR_parallel_shader_compile'),
    multiDraw: hasExtension(gl, 'WEBGL_multi_draw'),
    clipControl: hasExtension(gl, 'EXT_clip_control'),
    timerQuery: hasExtension(gl, 'EXT_disjoint_timer_query_webgl2'),
    independentBlend: drawBuffersIndexed !== null,
    limits: readLimits(gl),
    getSampleCounts: (format) => sampleCounts.get(format) ?? [],
  };

  return { capabilities, extensions: { drawBuffersIndexed } };
}
