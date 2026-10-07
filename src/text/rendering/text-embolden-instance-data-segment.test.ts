/* eslint-disable @typescript-eslint/naming-convention */
import { describe, expect, it, vi } from 'vitest';
import type {
  InstanceComponents,
  Renderable,
} from '../../rendering/renderable.js';
import { textEmboldenInstanceDataSegment } from './text-embolden-instance-data-segment.js';

describe('textEmboldenInstanceDataSegment', () => {
  it('writes the embolden at the segment offset', () => {
    const buffer = new Float32Array(4);

    textEmboldenInstanceDataSegment.bindInstanceData(
      { textEmbolden: 0.25 } as InstanceComponents,
      buffer,
      2,
    );

    expect(buffer[2]).toBe(0.25);
  });

  it('throws when the instance has no embolden', () => {
    expect(() =>
      textEmboldenInstanceDataSegment.bindInstanceData(
        {} as InstanceComponents,
        new Float32Array(1),
        0,
      ),
    ).toThrow(/textEmbolden/);
  });

  it('points a_instanceEmbolden at the segment offset within the stride', () => {
    const gl = {
      FLOAT: 0x1406,
      getAttribLocation: vi.fn().mockReturnValue(7),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
      vertexAttribDivisor: vi.fn(),
    };
    const renderable = {
      material: { program: {} },
      floatsPerInstance: 18,
    } as unknown as Renderable;

    textEmboldenInstanceDataSegment.setupInstanceAttributes(
      gl as unknown as WebGL2RenderingContext,
      renderable,
      17,
    );

    expect(gl.getAttribLocation).toHaveBeenCalledWith(
      renderable.material.program,
      'a_instanceEmbolden',
    );
    expect(gl.vertexAttribPointer).toHaveBeenCalledWith(
      7,
      1,
      gl.FLOAT,
      false,
      18 * 4,
      17 * 4,
    );
  });
});
