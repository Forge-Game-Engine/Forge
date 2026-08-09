/* eslint-disable @typescript-eslint/naming-convention */
import { describe, expect, it, vi } from 'vitest';
import { Color } from '../../rendering/color.js';
import type {
  InstanceComponents,
  Renderable,
  TextEffectsInstanceData,
} from '../../rendering/index.js';
import { textEffectsInstanceDataSegment } from './text-effects-instance-data-segment.js';

function buildComponents(
  overrides: Partial<TextEffectsInstanceData> = {},
): InstanceComponents {
  return {
    textEffects: {
      outlineColor: new Color(0.1, 0.2, 0.3, 0.4),
      outlineWidth: 2,
      shadowColor: new Color(0.5, 0.6, 0.7, 0.8),
      shadowOffset: { x: 1, y: -1 },
      shadowSoftness: 3,
      ...overrides,
    },
  } as InstanceComponents;
}

describe('textEffectsInstanceDataSegment', () => {
  it('occupies 12 floats', () => {
    expect(textEffectsInstanceDataSegment.floatsPerInstance).toBe(12);
  });

  it('binds outline and shadow data into the buffer at the given offset', () => {
    const buffer = new Float32Array(14);

    textEffectsInstanceDataSegment.bindInstanceData(
      buildComponents(),
      buffer,
      2,
    );

    const expected = [0.1, 0.2, 0.3, 0.4, 2, 0.5, 0.6, 0.7, 0.8, 1, -1, 3];

    Array.from(buffer.slice(2, 14)).forEach((value, index) => {
      expect(value).toBeCloseTo(expected[index]);
    });
  });

  it('throws when InstanceComponents.textEffects is not set', () => {
    const buffer = new Float32Array(12);
    const components = {} as InstanceComponents;

    expect(() =>
      textEffectsInstanceDataSegment.bindInstanceData(components, buffer, 0),
    ).toThrow();
  });

  it('sets up an attribute for every field, at the given offset', () => {
    const getAttribLocation = vi.fn().mockReturnValue(0);
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
      floatsPerInstance: 29,
    } as Renderable;

    textEffectsInstanceDataSegment.setupInstanceAttributes(gl, renderable, 17);

    for (const attributeName of [
      'a_instanceOutlineColor',
      'a_instanceOutlineWidth',
      'a_instanceShadowColor',
      'a_instanceShadowOffset',
      'a_instanceShadowSoftness',
    ]) {
      expect(getAttribLocation).toHaveBeenCalledWith(
        renderable.material.program,
        attributeName,
      );
    }

    expect(vertexAttribPointer).toHaveBeenCalledTimes(5);

    const stride = renderable.floatsPerInstance * 4;

    // a_instanceOutlineColor: vec4, at the segment's own offset (0 floats
    // in) from the 17-float instance offset passed in.
    expect(vertexAttribPointer).toHaveBeenCalledWith(
      0,
      4,
      'FLOAT',
      false,
      stride,
      17 * 4,
    );

    // a_instanceOutlineWidth: float, 4 floats into the segment.
    expect(vertexAttribPointer).toHaveBeenCalledWith(
      0,
      1,
      'FLOAT',
      false,
      stride,
      (17 + 4) * 4,
    );
  });
});
