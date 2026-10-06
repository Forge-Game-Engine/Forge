import { describe, expect, it } from 'vitest';
import {
  computeSpriteInstanceBounds,
  spriteInstanceDataSegment,
} from './sprite-instance-data-segment.js';
import { Rect, Rects } from '../../math/index.js';
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

describe('computeSpriteInstanceBounds', () => {
  const buildSprite = (
    overrides: Partial<SpriteEcsComponent> = {},
  ): SpriteEcsComponent => ({
    width: 4,
    height: 2,
    pivot: { x: 0.5, y: 0.5 },
    tintColor: new Color(1, 1, 1, 1),
    uvOffset: { x: 0, y: 0 },
    uvScale: { x: 1, y: 1 },
    enabled: true,
    layer: 0,
    renderable: undefined as never,
    ...overrides,
  });

  /**
   * The bounds of the quad corners `sprite.vert` computes from the instance
   * data `bindInstanceData` writes, converted back from the shader's Y-down
   * space - an independent reference for what's actually drawn.
   */
  const boundsDrawnByShader = (components: InstanceComponents): Rect => {
    const data = new Float32Array(spriteInstanceDataSegment.floatsPerInstance);

    spriteInstanceDataSegment.bindInstanceData(components, data, 0);

    const [x, y, rotation, scaleX, scaleY, width, height, pivotX, pivotY] =
      data;
    const pivot = { x: (pivotX - 0.5) * 2, y: -(pivotY - 0.5) * 2 };
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
        y: -(sin * scaledX + cos * scaledY + y),
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

  it('extends up and right from a bottom-left pivot (Y-up)', () => {
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
    };

    expectRectCloseTo(
      computeSpriteInstanceBounds(components, Rects.zero),
      boundsDrawnByShader(components),
    );
  });
});
