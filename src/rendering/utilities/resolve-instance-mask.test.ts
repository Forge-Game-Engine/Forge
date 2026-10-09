import { beforeEach, describe, expect, it } from 'vitest';
import {
  addFlipComponent,
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import {
  addMaskComponent,
  MaskDefaultedOptions,
  maskId,
} from '../components/mask-component.js';
import {
  createInstanceMaskResolver,
  InstanceMask,
  InstanceShapeMask,
} from './resolve-instance-mask.js';

/** Applies a shape mask's frame to a world point, as the shader does. */
const toMaskCoordinates = (
  shape: InstanceShapeMask,
  point: Vector2,
): Vector2 => {
  const dx = point.x - shape.origin.x;
  const dy = point.y - shape.origin.y;

  return {
    x: shape.axes.xx * dx + shape.axes.xy * dy,
    y: shape.axes.yx * dx + shape.axes.yy * dy,
  };
};

const expectVectorCloseTo = (actual: Vector2, expected: Vector2): void => {
  expect(actual.x).toBeCloseTo(expected.x);
  expect(actual.y).toBeCloseTo(expected.y);
};

const requireShape = (mask: InstanceMask | null): InstanceShapeMask => {
  if (!mask?.shape) {
    throw new Error('Expected a shape mask.');
  }

  return mask.shape;
};

describe('createInstanceMaskResolver', () => {
  let world: EcsWorld;

  const createMaskedEntity = (
    position: Vector2,
    size: Vector2,
    options: Partial<MaskDefaultedOptions> = {},
    parent?: number,
  ): number => {
    const entity = world.createEntity();
    const component = addPositionComponent(world, entity, { local: position });

    component.world = { ...position };
    addMaskComponent(world, entity, {
      width: size.x,
      height: size.y,
      ...options,
    });

    if (parent !== undefined) {
      world.setParent(entity, parent);
    }

    return entity;
  };

  beforeEach(() => {
    world = new EcsWorld();
  });

  it('returns null for every entity when the world has no masks', () => {
    const entity = world.createEntity();

    expect(
      createInstanceMaskResolver(world, world.query([maskId]))(entity),
    ).toBeNull();
  });

  it('returns null for an entity with no mask on it or its ancestors', () => {
    createMaskedEntity({ x: 0, y: 0 }, { x: 10, y: 10 });

    const entity = world.createEntity();

    expect(
      createInstanceMaskResolver(world, world.query([maskId]))(entity),
    ).toBeNull();
  });

  it('clips the masked entity itself and its descendants to the rect', () => {
    const masked = createMaskedEntity({ x: 10, y: 20 }, { x: 4, y: 2 });
    const child = world.createEntity();
    const grandchild = world.createEntity();

    world.setParent(child, masked);
    world.setParent(grandchild, child);

    const resolve = createInstanceMaskResolver(world, world.query([maskId]));
    const expectedClip = { min: { x: 8, y: 19 }, max: { x: 12, y: 21 } };

    expect(resolve(masked)?.clip).toEqual(expectedClip);
    expect(resolve(grandchild)?.clip).toEqual(expectedClip);
    expect(resolve(grandchild)?.shape).toBeNull();
  });

  it('places the rect by its pivot', () => {
    const masked = createMaskedEntity(
      { x: 0, y: 0 },
      { x: 4, y: 2 },
      { pivot: { x: 0, y: 0 } },
    );

    expect(
      createInstanceMaskResolver(world, world.query([maskId]))(masked)?.clip,
    ).toEqual({
      min: { x: 0, y: 0 },
      max: { x: 4, y: 2 },
    });
  });

  it('intersects nested rect masks', () => {
    const outer = createMaskedEntity({ x: 0, y: 0 }, { x: 10, y: 10 });
    const inner = createMaskedEntity(
      { x: 4, y: 0 },
      { x: 4, y: 20 },
      {},
      outer,
    );

    expect(
      createInstanceMaskResolver(world, world.query([maskId]))(inner)?.clip,
    ).toEqual({
      min: { x: 2, y: -5 },
      max: { x: 5, y: 5 },
    });
  });

  it('clips a rotated rect mask to its world bounds', () => {
    const masked = createMaskedEntity({ x: 0, y: 0 }, { x: 4, y: 2 });

    addRotationComponent(world, masked, { local: Math.PI / 2 });

    const clip = createInstanceMaskResolver(
      world,
      world.query([maskId]),
    )(masked)?.clip;

    expect(clip?.min.x).toBeCloseTo(-1);
    expect(clip?.min.y).toBeCloseTo(-2);
    expect(clip?.max.x).toBeCloseTo(1);
    expect(clip?.max.y).toBeCloseTo(2);
  });

  it('hides content whose nested rect masks do not overlap', () => {
    const outer = createMaskedEntity({ x: 0, y: 0 }, { x: 2, y: 2 });
    const inner = createMaskedEntity(
      { x: 10, y: 0 },
      { x: 2, y: 2 },
      {},
      outer,
    );

    expect(
      createInstanceMaskResolver(world, world.query([maskId]))(inner)?.visible,
    ).toBe(false);
  });

  it('hides content under a mask with no area', () => {
    const masked = createMaskedEntity({ x: 0, y: 0 }, { x: 4, y: 2 });

    addScaleComponent(world, masked, { local: { x: 0, y: 1 } });

    expect(
      createInstanceMaskResolver(world, world.query([maskId]))(masked)?.visible,
    ).toBe(false);
  });

  it.each([
    { origin: 'left' as const, start: { x: -2, y: 0 }, end: { x: 2, y: 0 } },
    { origin: 'right' as const, start: { x: 2, y: 0 }, end: { x: -2, y: 0 } },
    {
      origin: 'bottom' as const,
      start: { x: 0, y: -1 },
      end: { x: 0, y: 1 },
    },
    { origin: 'top' as const, start: { x: 0, y: 1 }, end: { x: 0, y: -1 } },
  ])(
    'turns a linear mask from the $origin edge so that edge is x = -1',
    ({ origin, start, end }) => {
      const masked = createMaskedEntity(
        { x: 0, y: 0 },
        { x: 4, y: 2 },
        { shape: { kind: 'linear', origin, amount: 0.25 } },
      );
      const shape = requireShape(
        createInstanceMaskResolver(world, world.query([maskId]))(masked),
      );

      expect(shape.kind).toBe('linear');
      expect(toMaskCoordinates(shape, start).x).toBeCloseTo(-1);
      expect(toMaskCoordinates(shape, end).x).toBeCloseTo(1);
      expect(shape.kind === 'linear' && shape.edge).toBeCloseTo(-0.5);
    },
  );

  it('reaches past the far edge when a linear mask is full', () => {
    const masked = createMaskedEntity(
      { x: 0, y: 0 },
      { x: 4, y: 2 },
      { shape: { kind: 'linear', origin: 'left', amount: 1 } },
    );
    const shape = requireShape(
      createInstanceMaskResolver(world, world.query([maskId]))(masked),
    );

    expect(shape.kind === 'linear' && shape.edge).toBeGreaterThan(1);
  });

  it('clamps the amount, hiding content at 0', () => {
    const empty = createMaskedEntity(
      { x: 0, y: 0 },
      { x: 4, y: 2 },
      { shape: { kind: 'linear', origin: 'left', amount: -0.5 } },
    );
    const overfull = createMaskedEntity(
      { x: 0, y: 0 },
      { x: 4, y: 2 },
      { shape: { kind: 'radial', startAngle: 0, sweep: Math.PI, amount: 3 } },
    );
    const resolve = createInstanceMaskResolver(world, world.query([maskId]));
    const overfullShape = requireShape(resolve(overfull));

    expect(resolve(empty)?.visible).toBe(false);
    expect(overfullShape.kind === 'radial' && overfullShape.filledSweep).toBe(
      Math.PI,
    );
  });

  it('places a shape mask in its rotated, scaled and offset frame', () => {
    const masked = createMaskedEntity(
      { x: 5, y: 5 },
      { x: 4, y: 2 },
      {
        pivot: { x: 0, y: 0.5 },
        shape: { kind: 'linear', origin: 'left', amount: 0.5 },
      },
    );

    addRotationComponent(world, masked, { local: Math.PI / 2 });
    addScaleComponent(world, masked, { local: { x: 2, y: 1 } });

    const shape = requireShape(
      createInstanceMaskResolver(world, world.query([maskId]))(masked),
    );

    // The rect is 8 wide after scaling, reaching up from the pivot at
    // (5, 5): its left edge is at the pivot, its center 4 above it.
    expectVectorCloseTo(shape.origin, { x: 5, y: 9 });
    expectVectorCloseTo(toMaskCoordinates(shape, { x: 5, y: 5 }), {
      x: -1,
      y: 0,
    });
    expectVectorCloseTo(toMaskCoordinates(shape, { x: 4, y: 13 }), {
      x: 1,
      y: 1,
    });
  });

  it('mirrors a shape mask with its entity', () => {
    const masked = createMaskedEntity(
      { x: 0, y: 0 },
      { x: 4, y: 2 },
      { shape: { kind: 'linear', origin: 'left', amount: 0.5 } },
    );

    addFlipComponent(world, masked, { flipX: true });

    const shape = requireShape(
      createInstanceMaskResolver(world, world.query([maskId]))(masked),
    );

    expect(toMaskCoordinates(shape, { x: 2, y: 0 }).x).toBeCloseTo(-1);
  });

  it('gives a radial mask its filled sweep and the rect aspect', () => {
    const masked = createMaskedEntity(
      { x: 0, y: 0 },
      { x: 4, y: 2 },
      {
        shape: {
          kind: 'radial',
          startAngle: Math.PI / 2,
          sweep: -Math.PI,
          amount: 0.5,
        },
      },
    );

    expect(
      createInstanceMaskResolver(world, world.query([maskId]))(masked)?.shape,
    ).toMatchObject({
      kind: 'radial',
      startAngle: Math.PI / 2,
      filledSweep: -Math.PI / 2,
      aspect: 2,
    });
  });

  it('keeps a shape mask under nested rect masks, with the rect masks as the clip', () => {
    const fill = createMaskedEntity(
      { x: 0, y: 0 },
      { x: 4, y: 2 },
      { shape: { kind: 'linear', origin: 'left', amount: 0.5 } },
    );
    const viewport = createMaskedEntity(
      { x: 0, y: 0 },
      { x: 2, y: 10 },
      {},
      fill,
    );
    const mask = createInstanceMaskResolver(
      world,
      world.query([maskId]),
    )(viewport);

    expect(mask?.shape?.kind).toBe('linear');
    expect(mask?.clip).toEqual({ min: { x: -1, y: -5 }, max: { x: 1, y: 5 } });
    expect(mask?.bounds).toEqual({
      min: { x: -1, y: -1 },
      max: { x: 1, y: 1 },
    });
  });

  it('throws for two shape masks on one chain', () => {
    const outer = createMaskedEntity(
      { x: 0, y: 0 },
      { x: 4, y: 2 },
      { shape: { kind: 'linear', origin: 'left', amount: 0.5 } },
    );
    const inner = createMaskedEntity(
      { x: 0, y: 0 },
      { x: 4, y: 2 },
      { shape: { kind: 'radial', startAngle: 0, sweep: 1, amount: 1 } },
      outer,
    );

    expect(() =>
      createInstanceMaskResolver(world, world.query([maskId]))(inner),
    ).toThrow('at most one linear or radial mask');
  });

  it('throws for a mask on an entity with no position', () => {
    const entity = world.createEntity();

    addMaskComponent(world, entity, { width: 1, height: 1 });

    expect(() =>
      createInstanceMaskResolver(world, world.query([maskId]))(entity),
    ).toThrow('no position');
  });
});
