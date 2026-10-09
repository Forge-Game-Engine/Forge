/* eslint-disable @typescript-eslint/naming-convention -- lookup tables keyed by WebGPU's kebab-case names and bit counts */
import type { GpuVertexFormat } from '../gpu-render-pipeline.js';
import * as glc from './gl-constants.js';

/** How a vertex format is read by `vertexAttrib(I)Pointer`. */
export interface VertexFormatInfo {
  /** The number of components. */
  readonly components: number;

  /** The GL component type. */
  readonly type: number;

  /** Whether integers are converted to `[0, 1]` or `[-1, 1]` floats. */
  readonly normalized: boolean;

  /** Whether it's read as integers (`vertexAttribIPointer`). */
  readonly integer: boolean;

  /** Its size, in bytes. */
  readonly byteSize: number;
}

type Kind = 'float' | 'unorm' | 'snorm' | 'uint' | 'sint';

const typesByKindAndBits: Record<Kind, Partial<Record<number, number>>> = {
  float: { 16: glc.GL_HALF_FLOAT, 32: glc.GL_FLOAT },
  unorm: { 8: glc.GL_UNSIGNED_BYTE, 16: glc.GL_UNSIGNED_SHORT },
  snorm: { 8: glc.GL_BYTE, 16: glc.GL_SHORT },
  uint: {
    8: glc.GL_UNSIGNED_BYTE,
    16: glc.GL_UNSIGNED_SHORT,
    32: glc.GL_UNSIGNED_INT,
  },
  sint: { 8: glc.GL_BYTE, 16: glc.GL_SHORT, 32: glc.GL_INT },
};

const formatPattern = /^(float|unorm|snorm|uint|sint)(8|16|32)(?:x([234]))?$/;

/**
 * Returns how a vertex format is read.
 * @param format - The format.
 * @returns How it's read.
 * @throws An error for an unknown format.
 */
export function getVertexFormatInfo(format: GpuVertexFormat): VertexFormatInfo {
  if (format === 'unorm10-10-10-2') {
    return {
      components: 4,
      type: glc.GL_UNSIGNED_INT_2_10_10_10_REV,
      normalized: true,
      integer: false,
      byteSize: 4,
    };
  }

  const match = formatPattern.exec(format);
  const kind = match?.[1] as Kind | undefined;
  const bits = Number(match?.[2]);
  const type = kind ? typesByKindAndBits[kind][bits] : undefined;

  if (!kind || type === undefined) {
    throw new Error(`Unknown vertex format "${String(format)}".`);
  }

  const components = Number(match?.[3] ?? 1);

  return {
    components,
    type,
    normalized: kind === 'unorm' || kind === 'snorm',
    integer: kind === 'uint' || kind === 'sint',
    byteSize: (components * bits) / 8,
  };
}
