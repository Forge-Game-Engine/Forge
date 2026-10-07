/* eslint-disable @typescript-eslint/naming-convention */
import { describe, expect, it, vi } from 'vitest';
import { Color } from '../color.js';
import type { SpriteEcsComponent } from '../components/sprite-component.js';
import type { InstanceComponents, Renderable } from '../renderable.js';
import type { Texture } from '../texture.js';
import { spriteEmissiveInstanceDataSegment } from './sprite-emissive-instance-data-segment.js';

const buildComponents = (
  emissive: SpriteEcsComponent['emissive'],
): InstanceComponents =>
  ({ sprite: { emissive } as SpriteEcsComponent }) as InstanceComponents;

describe('spriteEmissiveInstanceDataSegment', () => {
  it('occupies 3 floats', () => {
    expect(spriteEmissiveInstanceDataSegment.floatsPerInstance).toBe(3);
  });

  it("writes the emissive color's RGB at the segment offset, unclamped", () => {
    const buffer = new Float32Array(5);

    spriteEmissiveInstanceDataSegment.bindInstanceData(
      buildComponents({
        texture: {} as Texture,
        color: new Color(2, 0.5, 0, 0.25),
      }),
      buffer,
      2,
    );

    expect(Array.from(buffer)).toEqual([0, 0, 2, 0.5, 0]);
  });

  it('writes black for a sprite without an emissive map', () => {
    const buffer = new Float32Array(3).fill(9);

    spriteEmissiveInstanceDataSegment.bindInstanceData(
      buildComponents(null),
      buffer,
      0,
    );

    expect(Array.from(buffer)).toEqual([0, 0, 0]);
  });

  it('points a_instanceEmissive at the segment offset within the stride', () => {
    const gl = {
      FLOAT: 0x1406,
      getAttribLocation: vi.fn().mockReturnValue(4),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
      vertexAttribDivisor: vi.fn(),
    };
    const renderable = {
      material: { program: {} },
      floatsPerInstance: 20,
    } as unknown as Renderable;

    spriteEmissiveInstanceDataSegment.setupInstanceAttributes(
      gl as unknown as WebGL2RenderingContext,
      renderable,
      17,
    );

    expect(gl.getAttribLocation).toHaveBeenCalledWith(
      renderable.material.program,
      'a_instanceEmissive',
    );
    expect(gl.vertexAttribPointer).toHaveBeenCalledWith(
      4,
      3,
      gl.FLOAT,
      false,
      20 * 4,
      17 * 4,
    );
  });
});
