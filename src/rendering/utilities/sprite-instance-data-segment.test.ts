import { describe, expect, it } from 'vitest';
import { spriteInstanceDataSegment } from './sprite-instance-data-segment.js';
import { Color } from '../color.js';
import type { InstanceComponents } from '../renderable.js';
import type { SpriteEcsComponent } from '../components/sprite-component.js';

const TINT_COLOR_A_OFFSET = 16;

function buildComponents(sprite: SpriteEcsComponent): InstanceComponents {
  return {
    position: { local: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
    rotation: null,
    scale: null,
    sprite,
    flip: null,
  };
}

describe('spriteInstanceDataSegment.bindInstanceData', () => {
  it("writes tintColor.a unmodified when opacityMultiplier isn't set", () => {
    const buffer = new Float32Array(
      spriteInstanceDataSegment.floatsPerInstance,
    );

    spriteInstanceDataSegment.bindInstanceData(
      buildComponents({
        width: 10,
        height: 10,
        pivot: { x: 0.5, y: 0.5 },
        tintColor: new Color(1, 1, 1, 0.8),
        uvOffset: { x: 0, y: 0 },
        uvScale: { x: 1, y: 1 },
        enabled: true,
        layer: 0,
        renderable: undefined as never,
      }),
      buffer,
      0,
    );

    expect(buffer[TINT_COLOR_A_OFFSET]).toBeCloseTo(0.8);
  });

  it('multiplies tintColor.a by opacityMultiplier when set', () => {
    const buffer = new Float32Array(
      spriteInstanceDataSegment.floatsPerInstance,
    );

    spriteInstanceDataSegment.bindInstanceData(
      buildComponents({
        width: 10,
        height: 10,
        pivot: { x: 0.5, y: 0.5 },
        tintColor: new Color(1, 1, 1, 0.8),
        opacityMultiplier: 0.5,
        uvOffset: { x: 0, y: 0 },
        uvScale: { x: 1, y: 1 },
        enabled: true,
        layer: 0,
        renderable: undefined as never,
      }),
      buffer,
      0,
    );

    expect(buffer[TINT_COLOR_A_OFFSET]).toBeCloseTo(0.4);
  });
});
