import { describe, expect, it, vi } from 'vitest';
import {
  SPRITE_INSTANCE_DATA_FLOATS_PER_INSTANCE,
  spriteInstanceDataSegment,
} from './sprite-instance-data-segment.js';
import { PositionEcsComponent } from '../../common/index.js';
import { Vector2 } from '../../math/index.js';
import { Color } from '../color.js';
import { SpriteEcsComponent } from '../components/index.js';
import { Geometry } from '../geometry/geometry.js';
import { Material } from '../materials/material.js';
import { InstanceComponents, Renderable } from '../renderable.js';

const createSprite = (): SpriteEcsComponent => ({
  width: 40,
  height: 20,
  renderable: new Renderable(
    { bind: vi.fn() } as unknown as Geometry,
    { bind: vi.fn(), program: {} } as unknown as Material,
    SPRITE_INSTANCE_DATA_FLOATS_PER_INSTANCE,
    0,
    vi.fn(),
    vi.fn(),
  ),
  pivot: new Vector2(0.5, 0.5),
  tintColor: new Color(0.1, 0.2, 0.3, 0.4),
  uvOffset: new Vector2(0.11, 0.12),
  uvScale: new Vector2(0.5, 0.6),
  enabled: true,
  layer: 0,
});

const createComponents = (
  sprite: SpriteEcsComponent,
  sliceInstance?: InstanceComponents['sliceInstance'],
): InstanceComponents => {
  const position: PositionEcsComponent = {
    local: new Vector2(7, 9),
    world: new Vector2(7, 9),
  };

  return {
    position,
    rotation: null,
    scale: null,
    sprite,
    flip: null,
    sliceInstance,
  };
};

describe('spriteInstanceDataSegment.bindInstanceData', () => {
  it('writes the sprite’s own size, pivot and texture region when it is not sliced', () => {
    const sprite = createSprite();
    const buffer = new Float32Array(SPRITE_INSTANCE_DATA_FLOATS_PER_INSTANCE);

    spriteInstanceDataSegment.bindInstanceData(
      createComponents(sprite),
      buffer,
      0,
    );

    // Compared through a Float32Array so both sides carry the same 32-bit
    // rounding the instance buffer applies.
    expect(Array.from(buffer)).toEqual(
      Array.from(
        new Float32Array([
          7, // position x
          -9, // position y (screen-space flip)
          0, // rotation
          1, // scale x
          1, // scale y
          40, // width
          20, // height
          0.5, // pivot x
          0.5, // pivot y
          0.11, // uv offset x
          0.12, // uv offset y
          0.5, // uv scale x
          0.6, // uv scale y
          0.1, // tint r
          0.2, // tint g
          0.3, // tint b
          0.4, // tint a
        ]),
      ),
    );
  });

  it('overrides size, pivot and texture region from the slice, keeping the sprite’s position and tint', () => {
    const sprite = createSprite();
    const buffer = new Float32Array(SPRITE_INSTANCE_DATA_FLOATS_PER_INSTANCE);

    spriteInstanceDataSegment.bindInstanceData(
      createComponents(sprite, {
        size: new Vector2(16, 12),
        pivot: new Vector2(5.75, -4.75),
        uvOffset: new Vector2(0, 0.75),
        uvScale: new Vector2(0.25, 0.25),
      }),
      buffer,
      0,
    );

    // Size, pivot and texture region come from the slice...
    expect(buffer[5]).toBe(16); // width
    expect(buffer[6]).toBe(12); // height
    expect(buffer[7]).toBe(5.75); // pivot x
    expect(buffer[8]).toBe(-4.75); // pivot y
    expect(buffer[9]).toBe(0); // uv offset x
    expect(buffer[10]).toBe(0.75); // uv offset y
    expect(buffer[11]).toBe(0.25); // uv scale x
    expect(buffer[12]).toBe(0.25); // uv scale y

    // ...while position and tint stay the parent sprite's.
    expect(buffer[0]).toBe(7); // position x
    expect(buffer[1]).toBe(-9); // position y
    expect(buffer[13]).toBeCloseTo(0.1); // tint r
    expect(buffer[16]).toBeCloseTo(0.4); // tint a
  });
});
