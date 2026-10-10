/* eslint-disable @typescript-eslint/naming-convention -- lookup tables keyed by WebGPU's kebab-case names and bit counts */
import type {
  GpuAddressMode,
  GpuCompareFunction,
  GpuFilterMode,
  GpuSampler,
  GpuSamplerDescriptor,
} from '../gpu-texture.js';
import type { DeviceContext, RestorableResource } from './device-context.js';
import * as glc from './gl-constants.js';

/** A sampler descriptor with every default filled in. */
export type ResolvedSamplerDescriptor = GpuSampler['descriptor'];

const defaultSamplerDescriptor = {
  addressModeU: 'clamp-to-edge',
  addressModeV: 'clamp-to-edge',
  addressModeW: 'clamp-to-edge',
  magFilter: 'nearest',
  minFilter: 'nearest',
  mipmapFilter: 'nearest',
  lodMinClamp: 0,
  lodMaxClamp: 32,
  maxAnisotropy: 1,
} as const;

const addressModes: Record<GpuAddressMode, number> = {
  repeat: glc.GL_REPEAT,
  'mirror-repeat': glc.GL_MIRRORED_REPEAT,
  'clamp-to-edge': glc.GL_CLAMP_TO_EDGE,
};

/** GL minification filters, by minification and mipmap filter. */
const minFilters: Record<GpuFilterMode, Record<GpuFilterMode, number>> = {
  nearest: {
    nearest: glc.GL_NEAREST_MIPMAP_NEAREST,
    linear: glc.GL_NEAREST_MIPMAP_LINEAR,
  },
  linear: {
    nearest: glc.GL_LINEAR_MIPMAP_NEAREST,
    linear: glc.GL_LINEAR_MIPMAP_LINEAR,
  },
};

/** GL comparison functions, by WebGPU name. */
export const compareFunctions: Record<GpuCompareFunction, number> = {
  never: glc.GL_NEVER,
  less: glc.GL_LESS,
  equal: glc.GL_EQUAL,
  'less-equal': glc.GL_LEQUAL,
  greater: glc.GL_GREATER,
  'not-equal': glc.GL_NOTEQUAL,
  'greater-equal': glc.GL_GEQUAL,
  always: glc.GL_ALWAYS,
};

/**
 * Fills in a sampler descriptor's defaults and checks it.
 * @param descriptor - The descriptor.
 * @returns The resolved descriptor.
 * @throws An error if anisotropy is asked for with a `'nearest'` filter.
 */
export function resolveSamplerDescriptor(
  descriptor: GpuSamplerDescriptor,
): ResolvedSamplerDescriptor {
  const resolved: ResolvedSamplerDescriptor = {
    addressModeU:
      descriptor.addressModeU ?? defaultSamplerDescriptor.addressModeU,
    addressModeV:
      descriptor.addressModeV ?? defaultSamplerDescriptor.addressModeV,
    addressModeW:
      descriptor.addressModeW ?? defaultSamplerDescriptor.addressModeW,
    magFilter: descriptor.magFilter ?? defaultSamplerDescriptor.magFilter,
    minFilter: descriptor.minFilter ?? defaultSamplerDescriptor.minFilter,
    mipmapFilter:
      descriptor.mipmapFilter ?? defaultSamplerDescriptor.mipmapFilter,
    lodMinClamp: descriptor.lodMinClamp ?? defaultSamplerDescriptor.lodMinClamp,
    lodMaxClamp: descriptor.lodMaxClamp ?? defaultSamplerDescriptor.lodMaxClamp,
    maxAnisotropy:
      descriptor.maxAnisotropy ?? defaultSamplerDescriptor.maxAnisotropy,
    compare: descriptor.compare,
  };

  const filtersAreLinear =
    resolved.magFilter === 'linear' &&
    resolved.minFilter === 'linear' &&
    resolved.mipmapFilter === 'linear';

  if (resolved.maxAnisotropy > 1 && !filtersAreLinear) {
    throw new Error(
      'A sampler with maxAnisotropy above 1 must filter every way with "linear".',
    );
  }

  if (
    resolved.lodMinClamp < 0 ||
    resolved.lodMaxClamp < resolved.lodMinClamp ||
    resolved.maxAnisotropy < 1
  ) {
    throw new Error(
      'A sampler needs 0 <= lodMinClamp <= lodMaxClamp and maxAnisotropy >= 1.',
    );
  }

  return resolved;
}

/**
 * The key equal sampler descriptors share.
 * @param descriptor - A resolved descriptor.
 * @returns The key.
 */
export function getSamplerKey(descriptor: ResolvedSamplerDescriptor): string {
  return [
    descriptor.addressModeU,
    descriptor.addressModeV,
    descriptor.addressModeW,
    descriptor.magFilter,
    descriptor.minFilter,
    descriptor.mipmapFilter,
    descriptor.lodMinClamp,
    descriptor.lodMaxClamp,
    descriptor.maxAnisotropy,
    descriptor.compare ?? '',
  ].join('|');
}

/** Whether a sampler blends texels in any direction. */
export function isFilteringSampler(
  descriptor: ResolvedSamplerDescriptor,
): boolean {
  return (
    descriptor.magFilter === 'linear' ||
    descriptor.minFilter === 'linear' ||
    descriptor.mipmapFilter === 'linear'
  );
}

/** A WebGL sampler object. */
export class WebGl2Sampler implements GpuSampler, RestorableResource {
  public readonly descriptor: ResolvedSamplerDescriptor;

  private readonly _context: DeviceContext;
  private _glSampler: WebGLSampler | null;

  /**
   * Creates the sampler object, unless the context is lost.
   * @param context - The device's shared context.
   * @param descriptor - The resolved descriptor.
   */
  constructor(context: DeviceContext, descriptor: ResolvedSamplerDescriptor) {
    this._context = context;
    this.descriptor = Object.freeze({ ...descriptor });
    this._glSampler = null;

    if (!context.isContextLost) {
      this.restore();
    }
  }

  /** The WebGL sampler, or `null` while the context is lost. */
  get glSampler(): WebGLSampler | null {
    return this._glSampler;
  }

  public restore(): void {
    const { gl, capabilities } = this._context;
    const descriptor = this.descriptor;
    const sampler = gl.createSampler();
    const minFilter = minFilters[descriptor.minFilter][descriptor.mipmapFilter];

    gl.samplerParameteri(
      sampler,
      glc.GL_TEXTURE_WRAP_S,
      addressModes[descriptor.addressModeU],
    );
    gl.samplerParameteri(
      sampler,
      glc.GL_TEXTURE_WRAP_T,
      addressModes[descriptor.addressModeV],
    );
    gl.samplerParameteri(
      sampler,
      glc.GL_TEXTURE_WRAP_R,
      addressModes[descriptor.addressModeW],
    );
    gl.samplerParameteri(
      sampler,
      glc.GL_TEXTURE_MAG_FILTER,
      descriptor.magFilter === 'linear' ? glc.GL_LINEAR : glc.GL_NEAREST,
    );
    gl.samplerParameteri(sampler, glc.GL_TEXTURE_MIN_FILTER, minFilter);
    gl.samplerParameterf(
      sampler,
      glc.GL_TEXTURE_MIN_LOD,
      descriptor.lodMinClamp,
    );
    gl.samplerParameterf(
      sampler,
      glc.GL_TEXTURE_MAX_LOD,
      descriptor.lodMaxClamp,
    );

    if (descriptor.compare) {
      gl.samplerParameteri(
        sampler,
        glc.GL_TEXTURE_COMPARE_MODE,
        glc.GL_COMPARE_REF_TO_TEXTURE,
      );
      gl.samplerParameteri(
        sampler,
        glc.GL_TEXTURE_COMPARE_FUNC,
        compareFunctions[descriptor.compare],
      );
    }

    if (descriptor.maxAnisotropy > 1 && capabilities.maxAnisotropy > 1) {
      gl.samplerParameterf(
        sampler,
        glc.GL_TEXTURE_MAX_ANISOTROPY_EXT,
        Math.min(descriptor.maxAnisotropy, capabilities.maxAnisotropy),
      );
    }

    this._glSampler = sampler;
  }
}
