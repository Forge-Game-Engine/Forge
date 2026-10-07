/* eslint-disable @typescript-eslint/naming-convention */
import { describe, expect, it, vi } from 'vitest';
import type { InstanceComponents, Renderable } from '../renderable.js';
import {
  MASK_INSTANCE_DATA_FLOATS_PER_INSTANCE,
  maskInstanceDataSegment,
} from './mask-instance-data-segment.js';
import type { InstanceMask } from './resolve-instance-mask.js';

const bind = (mask: InstanceMask | null): number[] => {
  const buffer = new Float32Array(MASK_INSTANCE_DATA_FLOATS_PER_INSTANCE + 2);

  maskInstanceDataSegment.bindInstanceData(
    { mask } as InstanceComponents,
    buffer,
    2,
  );

  return Array.from(buffer.slice(2));
};

const frame = {
  origin: { x: 3, y: 4 },
  axes: { xx: 1, xy: 2, yx: 3, yy: 4 },
};

const clip = { min: { x: -1, y: -2 }, max: { x: 5, y: 6 } };

describe('maskInstanceDataSegment', () => {
  it('binds an unbounded clip rect and no shape for an unmasked instance', () => {
    const data = bind(null);

    expect(data.slice(0, 2)).toEqual([-1e30, -1e30].map(Math.fround));
    expect(data.slice(2, 4)).toEqual([1e30, 1e30].map(Math.fround));
    expect(data.slice(4)).toEqual(new Array(10).fill(0));
  });

  it("binds the clip rect in the shader's Y-down space", () => {
    expect(
      bind({ visible: true, clip, bounds: clip, shape: null }).slice(0, 4),
    ).toEqual([-1, -6, 5, 2]);
  });

  it('binds a linear mask with its Y inputs flipped for the Y-down shader', () => {
    const data = bind({
      visible: true,
      clip,
      bounds: clip,
      shape: { kind: 'linear', ...frame, edge: 0.5 },
    });

    expect(data.slice(4)).toEqual([1, -2, 3, -4, 3, -4, 1, 0.5, 0, 0]);
  });

  it('binds a radial mask', () => {
    const data = bind({
      visible: true,
      clip,
      bounds: clip,
      shape: {
        kind: 'radial',
        ...frame,
        startAngle: 0.25,
        filledSweep: -1.5,
        aspect: 2,
      },
    });

    expect(data.slice(10)).toEqual([2, 0.25, -1.5, 2]);
  });

  it('sets up its four attributes at the given offset', () => {
    const getAttribLocation = vi.fn(
      (_program: unknown, name: string) =>
        [
          'a_instanceMaskClip',
          'a_instanceMaskAxes',
          'a_instanceMaskOrigin',
          'a_instanceMaskShape',
        ].indexOf(name) + 1,
    );
    const vertexAttribPointer = vi.fn();
    const gl = {
      getAttribLocation,
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer,
      vertexAttribDivisor: vi.fn(),
      FLOAT: 'FLOAT',
    } as unknown as WebGL2RenderingContext;
    const renderable = {
      material: { program: {} },
      floatsPerInstance: 40,
    } as Renderable;

    maskInstanceDataSegment.setupInstanceAttributes(gl, renderable, 20);

    const stride = 40 * 4;

    expect(vertexAttribPointer.mock.calls).toEqual([
      [1, 4, 'FLOAT', false, stride, 20 * 4],
      [2, 4, 'FLOAT', false, stride, 24 * 4],
      [3, 2, 'FLOAT', false, stride, 28 * 4],
      [4, 4, 'FLOAT', false, stride, 30 * 4],
    ]);
  });
});
