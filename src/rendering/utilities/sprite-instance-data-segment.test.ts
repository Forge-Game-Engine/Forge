import { describe, expect, it } from 'vitest';
import {
  computeSpriteInstanceBounds,
  spriteInstanceDataSegment,
} from './sprite-instance-data-segment.js';
import { Rect, Rects } from '../../math/index.js';
import { Color } from '../color.js';
import type { InstanceComponents } from '../renderable.js';
import type { SpriteEcsComponent } from '../components/sprite-component.js';
import { createTextureRegion, fullTextureRegion } from '../texture-region.js';

// Width, height, pivot x and y, then the UV rect's offset and size.
const SIZE_PIVOT_OFFSET = 5;
const TEX_RECT_OFFSET = 9;
const TINT_COLOR_A_OFFSET = 16;

function buildComponents(sprite: SpriteEcsComponent): InstanceComponents {
  return {
    position: { local: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
    rotation: null,
    scale: null,
    sprite,
    flip: null,
    mask: null,
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
        region: fullTextureRegion,
        layer: 0,
        texture: undefined as never,
        emissive: null,
        material: null,
        category: 1,
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
        region: fullTextureRegion,
        layer: 0,
        texture: undefined as never,
        emissive: null,
        material: null,
        category: 1,
      }),
      buffer,
      0,
    );

    expect(buffer[TINT_COLOR_A_OFFSET]).toBeCloseTo(0.4);
  });

  const bindSprite = (overrides: Partial<SpriteEcsComponent>): number[] => {
    const buffer = new Float32Array(
      spriteInstanceDataSegment.floatsPerInstance,
    );

    spriteInstanceDataSegment.bindInstanceData(
      buildComponents({
        width: 4,
        height: 2,
        pivot: { x: 0.2, y: 0.9 },
        tintColor: Color.white,
        region: fullTextureRegion,
        layer: 0,
        texture: undefined as never,
        emissive: null,
        material: null,
        category: 1,
        ...overrides,
      }),
      buffer,
      0,
    );

    return Array.from(buffer.slice(SIZE_PIVOT_OFFSET, TEX_RECT_OFFSET + 4)).map(
      (value) => Math.round(value * 1e5) / 1e5,
    );
  };

  it("writes an untrimmed region's size, pivot and UV rect unchanged", () => {
    const region = createTextureRegion(
      { x: 0.25, y: 0.5 },
      { x: 0.25, y: 0.5 },
    );

    expect(bindSprite({ region })).toEqual([
      4, 2, 0.2, 0.9, 0.25, 0.5, 0.25, 0.5,
    ]);
  });

  it("draws a trimmed region at its share of the frame, around the frame's pivot", () => {
    const region = createTextureRegion(
      { x: 0.5, y: 0 },
      { x: 0.125, y: 0.25 },
      { offset: { x: 0.1, y: 0.5 }, scale: { x: 0.5, y: 0.5 } },
    );

    // The pivot (0.2, 0.9) of the 4 x 2 frame is (0.8, 1.8) in frame
    // units; the trimmed rect starts at (0.4, 1) and is 2 x 1, so the same
    // point is (0.2, 0.8) of the trimmed rect.
    expect(bindSprite({ region })).toEqual([
      2, 1, 0.2, 0.8, 0.5, 0, 0.125, 0.25,
    ]);
  });
});

describe('computeSpriteInstanceBounds', () => {
  const buildSprite = (
    overrides: Partial<SpriteEcsComponent> = {},
  ): SpriteEcsComponent => ({
    width: 4,
    height: 2,
    pivot: { x: 0.5, y: 0.5 },
    tintColor: new Color(1, 1, 1, 1),
    region: fullTextureRegion,
    layer: 0,
    texture: undefined as never,
    emissive: null,
    material: null,
    category: 1,
    ...overrides,
  });

  /**
   * The bounds of the quad corners `sprite.vert` computes from the instance
   * data `bindInstanceData` writes - an independent reference for what's
   * actually drawn.
   */
  const boundsDrawnByShader = (components: InstanceComponents): Rect => {
    const data = new Float32Array(spriteInstanceDataSegment.floatsPerInstance);

    spriteInstanceDataSegment.bindInstanceData(components, data, 0);

    const [x, y, scaleX, scaleY, rotation, width, height, pivotX, pivotY] =
      data;
    const pivot = { x: (pivotX - 0.5) * 2, y: (pivotY - 0.5) * 2 };
    const corners = [
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: -1, y: 1 },
      { x: 1, y: 1 },
    ].map((corner) => {
      const scaledX = (corner.x - pivot.x) * width * scaleX * 0.5;
      const scaledY = (corner.y - pivot.y) * height * scaleY * 0.5;
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);

      return {
        x: cos * scaledX - sin * scaledY + x,
        y: sin * scaledX + cos * scaledY + y,
      };
    });

    return {
      min: {
        x: Math.min(...corners.map((corner) => corner.x)),
        y: Math.min(...corners.map((corner) => corner.y)),
      },
      max: {
        x: Math.max(...corners.map((corner) => corner.x)),
        y: Math.max(...corners.map((corner) => corner.y)),
      },
    };
  };

  const expectRectCloseTo = (actual: Rect, expected: Rect): void => {
    expect(actual.min.x).toBeCloseTo(expected.min.x, 4);
    expect(actual.min.y).toBeCloseTo(expected.min.y, 4);
    expect(actual.max.x).toBeCloseTo(expected.max.x, 4);
    expect(actual.max.y).toBeCloseTo(expected.max.y, 4);
  };

  it('spans width by height around a centered pivot at the world position', () => {
    const components: InstanceComponents = {
      ...buildComponents(buildSprite()),
      position: { local: { x: 0, y: 0 }, world: { x: 10, y: 20 } },
    };

    expect(computeSpriteInstanceBounds(components, Rects.zero)).toEqual({
      min: { x: 8, y: 19 },
      max: { x: 12, y: 21 },
    });
  });

  it('extends down and right from a top-left pivot', () => {
    const components = buildComponents(buildSprite({ pivot: { x: 0, y: 0 } }));

    expect(computeSpriteInstanceBounds(components, Rects.zero)).toEqual({
      min: { x: 0, y: 0 },
      max: { x: 4, y: 2 },
    });
  });

  it('writes into and returns the rect it is given', () => {
    const result = Rects.zero;

    expect(
      computeSpriteInstanceBounds(buildComponents(buildSprite()), result),
    ).toBe(result);
  });

  it.each([
    { description: 'unrotated', rotation: 0, scale: { x: 1, y: 1 } },
    {
      description: 'rotated 30 degrees',
      rotation: Math.PI / 6,
      scale: { x: 1, y: 1 },
    },
    {
      description: 'rotated -100 degrees',
      rotation: -1.745,
      scale: { x: 1, y: 1 },
    },
    { description: 'scaled', rotation: 0.4, scale: { x: 3, y: 0.5 } },
    {
      description: 'negatively scaled',
      rotation: 2.2,
      scale: { x: -2, y: 1.5 },
    },
  ])(
    'matches the quad sprite.vert draws for an off-center pivot, $description',
    ({ rotation, scale }) => {
      const components: InstanceComponents = {
        position: { local: { x: 0, y: 0 }, world: { x: -3, y: 7 } },
        rotation: { local: rotation, world: rotation },
        scale: { local: scale, world: scale },
        sprite: buildSprite({ pivot: { x: 0.2, y: 0.9 } }),
        flip: null,
        mask: null,
      };

      expectRectCloseTo(
        computeSpriteInstanceBounds(components, Rects.zero),
        boundsDrawnByShader(components),
      );
    },
  );

  it('matches the quad sprite.vert draws for a flipped sprite', () => {
    const components: InstanceComponents = {
      position: { local: { x: 0, y: 0 }, world: { x: 1, y: 1 } },
      rotation: { local: 0.7, world: 0.7 },
      scale: null,
      sprite: buildSprite({ pivot: { x: 0, y: 1 } }),
      flip: { flipX: true, flipY: true },
      mask: null,
    };

    expectRectCloseTo(
      computeSpriteInstanceBounds(components, Rects.zero),
      boundsDrawnByShader(components),
    );
  });

  // The 4 x 2 frame's right half, bottom half: (2, 1) to (4, 2) in frame
  // units, which is (0, 0) to (2, 1) around the frame's centered pivot.
  const trimmedRegion = createTextureRegion(
    { x: 0, y: 0 },
    { x: 0.5, y: 0.5 },
    { offset: { x: 0.5, y: 0.5 }, scale: { x: 0.5, y: 0.5 } },
  );

  it('draws a trimmed region where it sits in the untrimmed frame', () => {
    const components = buildComponents(buildSprite({ region: trimmedRegion }));

    expectRectCloseTo(boundsDrawnByShader(components), {
      min: { x: 0, y: 0 },
      max: { x: 2, y: 1 },
    });
    expectRectCloseTo(
      computeSpriteInstanceBounds(components, Rects.zero),
      boundsDrawnByShader(components),
    );
  });

  it.each([
    {
      flip: { flipX: true, flipY: false },
      expected: { min: { x: -2, y: 0 }, max: { x: 0, y: 1 } },
    },
    {
      flip: { flipX: false, flipY: true },
      expected: { min: { x: 0, y: -1 }, max: { x: 2, y: 0 } },
    },
    {
      flip: { flipX: true, flipY: true },
      expected: { min: { x: -2, y: -1 }, max: { x: 0, y: 0 } },
    },
  ])(
    'mirrors a trimmed region around the untrimmed pivot (flipX $flip.flipX, flipY $flip.flipY)',
    ({ flip, expected }) => {
      const components: InstanceComponents = {
        ...buildComponents(buildSprite({ region: trimmedRegion })),
        flip,
      };

      expectRectCloseTo(boundsDrawnByShader(components), expected);
      expectRectCloseTo(
        computeSpriteInstanceBounds(components, Rects.zero),
        expected,
      );
    },
  );

  it('matches the quad sprite.vert draws for a trimmed, rotated and scaled sprite', () => {
    const components: InstanceComponents = {
      position: { local: { x: 0, y: 0 }, world: { x: 5, y: -2 } },
      rotation: { local: 1.1, world: 1.1 },
      scale: { local: { x: -1.5, y: 2 }, world: { x: -1.5, y: 2 } },
      sprite: buildSprite({
        pivot: { x: 0.3, y: 0.8 },
        region: createTextureRegion(
          { x: 0, y: 0 },
          { x: 0.5, y: 0.5 },
          { offset: { x: 0.1, y: 0.2 }, scale: { x: 0.6, y: 0.7 } },
        ),
      }),
      flip: null,
      mask: null,
    };

    expectRectCloseTo(
      computeSpriteInstanceBounds(components, Rects.zero),
      boundsDrawnByShader(components),
    );
  });
});
