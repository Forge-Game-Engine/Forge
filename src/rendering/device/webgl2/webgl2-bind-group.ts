/* eslint-disable @typescript-eslint/naming-convention -- lookup tables keyed by WebGPU's kebab-case names and bit counts */
import type {
  GpuBindGroup,
  GpuBindGroupDescriptor,
  GpuBindGroupEntry,
  GpuBindGroupLayout,
  GpuBindGroupLayoutDescriptor,
  GpuBindGroupLayoutEntry,
  GpuSamplerBindingType,
  GpuTextureSampleType,
} from '../gpu-bind-group.js';
import type { GpuTextureDimension } from '../gpu-texture.js';
import type { DeviceContext } from './device-context.js';
import { isFormatFilterable, TextureFormatInfo } from './texture-formats.js';
import { WebGl2Buffer } from './webgl2-buffer.js';
import { isFilteringSampler, WebGl2Sampler } from './webgl2-sampler.js';
import { WebGl2Texture } from './webgl2-texture.js';

/** The most uniform blocks one bind group slot binds. */
export const maxUniformBlocksPerGroup = 4;

/** A uniform block binding of a layout. */
export interface LayoutBufferBinding {
  readonly binding: number;
  readonly name: string;
  readonly hasDynamicOffset: boolean;

  /** Its binding point within the slot: `slot * 4 + blockIndex`. */
  readonly blockIndex: number;
}

/** A texture binding of a layout. */
export interface LayoutTextureBinding {
  readonly binding: number;
  readonly name: string;
  readonly sampleType: GpuTextureSampleType;
  readonly viewDimension: GpuTextureDimension;
  readonly samplerType: GpuSamplerBindingType;
  readonly isVertexVisible: boolean;
  readonly isFragmentVisible: boolean;

  /** Its texture unit relative to the slot's first. */
  readonly unitOffset: number;
}

function resolveTextureBinding(
  entry: GpuBindGroupLayoutEntry,
  unitOffset: number,
): LayoutTextureBinding {
  const texture = entry.texture!;
  const sampleType = texture.sampleType ?? 'float';
  const samplerType =
    texture.samplerType ??
    (sampleType === 'float' ? 'filtering' : 'non-filtering');

  if (samplerType === 'comparison' && sampleType !== 'depth') {
    throw new Error(
      `Binding ${entry.binding} ("${texture.name}") takes a comparison sampler, which only reads 'depth' textures.`,
    );
  }

  if (samplerType === 'filtering' && sampleType !== 'float') {
    throw new Error(
      `Binding ${entry.binding} ("${texture.name}") reads '${sampleType}' texels, which can't be filtered: use samplerType 'non-filtering'${sampleType === 'depth' ? " or 'comparison'" : ''}.`,
    );
  }

  return {
    binding: entry.binding,
    name: texture.name,
    sampleType,
    viewDimension: texture.viewDimension ?? '2d',
    samplerType,
    isVertexVisible: entry.visibility.includes('vertex'),
    isFragmentVisible: entry.visibility.includes('fragment'),
    unitOffset,
  };
}

/**
 * The key equal layout descriptors share.
 * @param descriptor - The descriptor.
 * @returns The key.
 */
export function getBindGroupLayoutKey(
  descriptor: GpuBindGroupLayoutDescriptor,
): string {
  return JSON.stringify(
    [...descriptor.entries]
      .sort((a, b) => a.binding - b.binding)
      .map((entry) => [
        entry.binding,
        [...entry.visibility].sort((a, b) => a.localeCompare(b)),
        entry.buffer ?? null,
        entry.texture ?? null,
      ]),
  );
}

/** A bind group layout, with its bindings' block indices and units. */
export class WebGl2BindGroupLayout implements GpuBindGroupLayout {
  public readonly entries: readonly GpuBindGroupLayoutEntry[];
  public readonly label: string;

  /** Unique among the device's resources, for cache keys. */
  public readonly id: number;

  /** The uniform block bindings, in binding order. */
  public readonly buffers: readonly LayoutBufferBinding[];

  /** The texture bindings, in binding order. */
  public readonly textures: readonly LayoutTextureBinding[];

  /** The number of bindings with a dynamic offset. */
  public readonly dynamicOffsetCount: number;

  /**
   * Checks and resolves a layout descriptor.
   * @param descriptor - The descriptor.
   * @param id - The layout's id.
   * @throws An error for a repeated binding, an entry with neither or both
   * of `buffer` and `texture`, or more than four uniform blocks.
   */
  constructor(descriptor: GpuBindGroupLayoutDescriptor, id: number) {
    const name = `Bind group layout "${descriptor.label ?? ''}"`;
    const entries = [...descriptor.entries].sort(
      (a, b) => a.binding - b.binding,
    );
    const buffers: LayoutBufferBinding[] = [];
    const textures: LayoutTextureBinding[] = [];

    entries.forEach((entry, index) => {
      if (
        !Number.isInteger(entry.binding) ||
        entry.binding < 0 ||
        entries[index - 1]?.binding === entry.binding
      ) {
        throw new Error(
          `${name} repeats or misnumbers binding ${entry.binding}.`,
        );
      }

      if (
        Boolean(entry.buffer) === Boolean(entry.texture) ||
        entry.visibility.length === 0
      ) {
        throw new Error(
          `${name}'s binding ${entry.binding} must have exactly one of 'buffer' and 'texture', and a visibility.`,
        );
      }

      if (entry.buffer) {
        buffers.push({
          binding: entry.binding,
          name: entry.buffer.name,
          hasDynamicOffset: entry.buffer.hasDynamicOffset ?? false,
          blockIndex: buffers.length,
        });

        return;
      }

      textures.push(resolveTextureBinding(entry, textures.length));
    });

    if (buffers.length > maxUniformBlocksPerGroup) {
      throw new Error(
        `${name} has ${buffers.length} uniform blocks; a bind group slot binds at most ${maxUniformBlocksPerGroup}.`,
      );
    }

    this.entries = Object.freeze(entries);
    this.label = descriptor.label ?? '';
    this.id = id;
    this.buffers = buffers;
    this.textures = textures;
    this.dynamicOffsetCount = buffers.filter(
      (buffer) => buffer.hasDynamicOffset,
    ).length;
  }
}

/** A buffer range bound by a bind group. */
export interface BoundBuffer {
  readonly buffer: WebGl2Buffer;
  readonly offset: number;
  readonly size: number;
  readonly blockIndex: number;

  /** Its index among the dynamic offsets, or `-1` without one. */
  readonly dynamicIndex: number;
}

/** A texture and sampler bound by a bind group. */
export interface BoundTexture {
  readonly texture: WebGl2Texture;
  readonly sampler: WebGl2Sampler;
  readonly unitOffset: number;
}

const sampleClassesBySampleType: Record<
  GpuTextureSampleType,
  readonly TextureFormatInfo['sampleClass'][]
> = {
  float: ['float', 'float32'],
  'unfilterable-float': ['float', 'float32'],
  depth: ['depth'],
  uint: ['uint'],
  sint: [],
};

/** A bind group: buffer ranges and texture-sampler pairs for one slot. */
export class WebGl2BindGroup implements GpuBindGroup {
  public readonly layout: WebGl2BindGroupLayout;
  public readonly label: string;

  /** The buffer ranges, by block index. */
  public readonly buffers: readonly BoundBuffer[];

  /** The textures, by unit offset. */
  public readonly textures: readonly BoundTexture[];

  private readonly _context: DeviceContext;
  private readonly _name: string;

  /**
   * Checks each resource against its binding.
   * @param context - The device's shared context.
   * @param descriptor - The descriptor.
   * @throws An error if a binding is missing or repeated, or a resource
   * doesn't fit its binding.
   */
  constructor(context: DeviceContext, descriptor: GpuBindGroupDescriptor) {
    if (!(descriptor.layout instanceof WebGl2BindGroupLayout)) {
      throw new Error('A bind group needs a layout made by the same device.');
    }

    this._context = context;
    this.layout = descriptor.layout;
    this.label = descriptor.label ?? '';
    this._name = `Bind group "${this.label}"`;

    const byBinding = new Map<number, GpuBindGroupEntry>();

    for (const entry of descriptor.entries) {
      if (byBinding.has(entry.binding)) {
        throw new Error(`${this._name} repeats binding ${entry.binding}.`);
      }

      byBinding.set(entry.binding, entry);
    }

    if (byBinding.size !== this.layout.entries.length) {
      throw new Error(
        `${this._name} must fill each of its layout's ${this.layout.entries.length} bindings once, received ${byBinding.size}.`,
      );
    }

    let dynamicIndex = 0;

    this.buffers = this.layout.buffers.map((binding) => {
      const bound = this._resolveBuffer(
        binding,
        byBinding.get(binding.binding),
      );

      return {
        ...bound,
        dynamicIndex: binding.hasDynamicOffset ? dynamicIndex++ : -1,
      };
    });
    this.textures = this.layout.textures.map((binding) =>
      this._resolveTexture(binding, byBinding.get(binding.binding)),
    );
  }

  private _resolveBuffer(
    binding: LayoutBufferBinding,
    entry: GpuBindGroupEntry | undefined,
  ): Omit<BoundBuffer, 'dynamicIndex'> {
    if (
      !entry ||
      !('buffer' in entry) ||
      !(entry.buffer instanceof WebGl2Buffer)
    ) {
      throw new Error(
        `${this._name}'s binding ${binding.binding} ("${binding.name}") needs a buffer made by the same device.`,
      );
    }

    const { limits } = this._context.capabilities;
    const buffer = entry.buffer;
    const offset = entry.offset ?? 0;
    const size = entry.size ?? buffer.size - offset;

    if (buffer.usage !== 'uniform') {
      throw new Error(
        `${this._name}'s binding ${binding.binding} ("${binding.name}") needs a 'uniform' buffer, received a '${buffer.usage}' one.`,
      );
    }

    if (
      offset < 0 ||
      offset % limits.uniformBufferOffsetAlignment !== 0 ||
      size <= 0 ||
      size > limits.maxUniformBlockSize ||
      offset + size > buffer.size
    ) {
      throw new Error(
        `${this._name}'s binding ${binding.binding} ("${binding.name}") binds ${size} bytes at ${offset} of a ${buffer.size}-byte buffer: the offset must be a multiple of ${limits.uniformBufferOffsetAlignment} and the range at most ${limits.maxUniformBlockSize} bytes, inside the buffer.`,
      );
    }

    return { buffer, offset, size, blockIndex: binding.blockIndex };
  }

  private _resolveTexture(
    binding: LayoutTextureBinding,
    entry: GpuBindGroupEntry | undefined,
  ): BoundTexture {
    const where = `${this._name}'s binding ${binding.binding} ("${binding.name}")`;

    if (
      !entry ||
      !('texture' in entry) ||
      !(entry.texture instanceof WebGl2Texture) ||
      !(entry.sampler instanceof WebGl2Sampler)
    ) {
      throw new Error(
        `${where} needs a texture and a sampler made by the same device.`,
      );
    }

    const { texture, sampler } = entry;

    if (
      !texture.usage.includes('sampled') ||
      texture.sampleCount !== 1 ||
      texture.dimension !== binding.viewDimension
    ) {
      throw new Error(
        `${where} needs a single-sampled '${binding.viewDimension}' texture with the 'sampled' usage; texture "${texture.label}" doesn't fit.`,
      );
    }

    this._assertSampleType(where, binding, texture);
    this._assertSampler(where, binding, texture, sampler);

    return { texture, sampler, unitOffset: binding.unitOffset };
  }

  private _assertSampleType(
    where: string,
    binding: LayoutTextureBinding,
    texture: WebGl2Texture,
  ): void {
    const info = texture.formatInfo;
    const fitsClass = sampleClassesBySampleType[binding.sampleType].includes(
      info.sampleClass,
    );
    const isFilterable = isFormatFilterable(info, this._context.capabilities);

    if (!fitsClass || (binding.sampleType === 'float' && !isFilterable)) {
      throw new Error(
        `${where} reads '${binding.sampleType}' texels, which a "${texture.format}" texture doesn't hold${fitsClass ? " on this device (bind it as 'unfilterable-float')" : ''}.`,
      );
    }
  }

  private _assertSampler(
    where: string,
    binding: LayoutTextureBinding,
    texture: WebGl2Texture,
    sampler: WebGl2Sampler,
  ): void {
    const isComparison = sampler.descriptor.compare !== undefined;
    const isFiltering = isFilteringSampler(sampler.descriptor);
    const fits: Record<GpuSamplerBindingType, boolean> = {
      filtering: !isComparison,
      'non-filtering': !isComparison && !isFiltering,
      comparison: isComparison,
    };

    if (!fits[binding.samplerType]) {
      throw new Error(
        `${where} takes a '${binding.samplerType}' sampler, which the sampler given for texture "${texture.label}" isn't.`,
      );
    }
  }
}
