import type { GpuBuffer } from './gpu-buffer.js';
import type {
  GpuSampler,
  GpuTexture,
  GpuTextureDimension,
} from './gpu-texture.js';

/**
 * The fixed bind group slots, by how often their data changes: per frame,
 * per view (camera), per material and per draw. A pipeline's
 * `bindGroupLayouts[i]` describes slot `i`, and a draw that changes only
 * per-draw data rebinds only slot `draw`.
 */
export const bindGroupSlots = {
  frame: 0,
  view: 1,
  material: 2,
  draw: 3,
} as const;

/** A shader stage that can read a binding. */
export type GpuShaderStage = 'vertex' | 'fragment';

/**
 * What a texture binding reads: filterable floats (`'float'`), floats that
 * must be read with `'nearest'` (`'unfilterable-float'`), depths, or
 * unsigned or signed integers.
 */
export type GpuTextureSampleType =
  'float' | 'unfilterable-float' | 'depth' | 'uint' | 'sint';

/**
 * Which samplers a texture binding accepts: any but a comparison sampler
 * (`'filtering'`), only `'nearest'` filtering (`'non-filtering'`), or only
 * a comparison sampler (`'comparison'`, for `sampler2DShadow`).
 */
export type GpuSamplerBindingType =
  'filtering' | 'non-filtering' | 'comparison';

/** A uniform block binding: a range of a uniform buffer. */
export interface GpuBufferBindingLayout {
  /** The uniform block's name in the shaders (`ForgeView`). */
  name: string;

  /**
   * Whether `setBindGroup` passes an offset added to the bound range's,
   * so one bind group serves many draws from one buffer. Defaults to
   * `false`.
   */
  hasDynamicOffset?: boolean;
}

/**
 * A texture and the sampler it's read with, declared in GLSL as one
 * sampler uniform (`uniform sampler2D u_baseColor;`).
 */
export interface GpuTextureBindingLayout {
  /** The sampler uniform's name in the shaders. */
  name: string;

  /** What the binding reads. Defaults to `'float'`. */
  sampleType?: GpuTextureSampleType;

  /** The texture's shape. Defaults to `'2d'`. */
  viewDimension?: GpuTextureDimension;

  /**
   * Which samplers the binding accepts. Defaults to `'filtering'` for
   * `'float'` and `'non-filtering'` for every other sample type; a shadow
   * sampler (`sampler2DShadow`) is `'comparison'`.
   */
  samplerType?: GpuSamplerBindingType;
}

/**
 * One binding of a bind group layout: a uniform block or a texture, with
 * the shader stages that read it. Exactly one of `buffer` and `texture` is
 * set.
 */
export interface GpuBindGroupLayoutEntry {
  /** The binding's number, unique within the layout. */
  binding: number;

  /** The stages that read it. Textures count against each stage's budget. */
  visibility: readonly GpuShaderStage[];

  /** A uniform block binding. */
  buffer?: GpuBufferBindingLayout;

  /** A texture binding. */
  texture?: GpuTextureBindingLayout;
}

/** Describes a bind group layout for `GpuDevice.createBindGroupLayout`. */
export interface GpuBindGroupLayoutDescriptor {
  /** The layout's bindings. At most four are uniform blocks. */
  entries: readonly GpuBindGroupLayoutEntry[];

  /** A name for the layout, used in error messages. */
  label?: string;
}

/**
 * The bindings one bind group slot holds. The device deduplicates layouts:
 * equal descriptors return the same layout, so a bind group made for one
 * pipeline's layout fits every pipeline with an equal one.
 */
export interface GpuBindGroupLayout {
  /** The layout's bindings, in binding order. */
  readonly entries: readonly GpuBindGroupLayoutEntry[];

  /** The layout's label, or `''`. */
  readonly label: string;
}

/** A buffer range bound to a uniform block binding. */
export interface GpuBufferBindGroupEntry {
  /** The layout binding it fills. */
  binding: number;

  /** The uniform buffer. */
  buffer: GpuBuffer;

  /**
   * Where the range starts, in bytes: a multiple of the device's
   * `uniformBufferOffsetAlignment`. Defaults to `0`.
   */
  offset?: number;

  /**
   * The range's size, in bytes. Defaults to the rest of the buffer after
   * `offset`.
   */
  size?: number;
}

/** A texture and sampler bound to a texture binding. */
export interface GpuTextureBindGroupEntry {
  /** The layout binding it fills. */
  binding: number;

  /** The texture. */
  texture: GpuTexture;

  /** The sampler it's read with. */
  sampler: GpuSampler;
}

/** One binding's resource in a bind group. */
export type GpuBindGroupEntry =
  GpuBufferBindGroupEntry | GpuTextureBindGroupEntry;

/** Describes a bind group for `GpuDevice.createBindGroup`. */
export interface GpuBindGroupDescriptor {
  /** The layout the bind group fills. */
  layout: GpuBindGroupLayout;

  /** One resource for each of the layout's bindings. */
  entries: readonly GpuBindGroupEntry[];

  /** A name for the bind group, used in error messages. */
  label?: string;
}

/**
 * The resources for one bind group slot: buffer ranges and texture-sampler
 * pairs, checked against their layout when the bind group is created.
 */
export interface GpuBindGroup {
  /** The layout the bind group fills. */
  readonly layout: GpuBindGroupLayout;

  /** The bind group's label, or `''`. */
  readonly label: string;
}
