import { describe, expect, it, vi } from 'vitest';
import { addSpriteComponent, spriteId } from './sprite-component.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { Color } from '../color.js';
import { Geometry } from '../geometry/geometry.js';
import { Material } from '../materials/material.js';
import { Renderable } from '../renderable.js';

const createRenderable = (): Renderable =>
  new Renderable(
    { bind: vi.fn() } as unknown as Geometry,
    { bind: vi.fn(), program: {} } as unknown as Material,
    10,
    0,
    vi.fn(),
    vi.fn(),
  );

describe('addSpriteComponent', () => {
  it('attaches a component with default values for unspecified options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const renderable = createRenderable();

    addSpriteComponent(world, entity, { width: 32, height: 32, renderable });

    expect(world.getComponent(entity, spriteId)).toEqual({
      width: 32,
      height: 32,
      renderable,
      pivot: new Vector2(0.5, 0.5),
      tintColor: Color.white,
      uvOffset: Vector2.zero,
      uvScale: Vector2.one,
      enabled: true,
      layer: 0,
    });
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const renderable = createRenderable();

    addSpriteComponent(world, entity, {
      width: 32,
      height: 32,
      renderable,
      enabled: false,
      layer: 2,
    });

    expect(world.getComponent(entity, spriteId)).toMatchObject({
      enabled: false,
      layer: 2,
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const renderable = createRenderable();

    const component = addSpriteComponent(world, entity, {
      width: 32,
      height: 32,
      renderable,
    });

    expect(world.getComponent(entity, spriteId)).toBe(component);
  });

  it('attaches nine-slice options when given valid insets and texture dimensions', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const renderable = createRenderable();

    addSpriteComponent(world, entity, {
      width: 100,
      height: 100,
      renderable,
      slices: { left: 16, right: 16, top: 16, bottom: 16 },
      textureDimensions: new Vector2(64, 64),
    });

    expect(world.getComponent(entity, spriteId)).toMatchObject({
      slices: { left: 16, right: 16, top: 16, bottom: 16 },
      textureDimensions: new Vector2(64, 64),
    });
  });

  it('throws when slices are given without texture dimensions', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    expect(() =>
      addSpriteComponent(world, entity, {
        width: 100,
        height: 100,
        renderable: createRenderable(),
        slices: { left: 16, right: 16, top: 16, bottom: 16 },
      }),
    ).toThrow(/textureDimensions/);
  });

  it('throws when the slice insets do not fit the texture', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    expect(() =>
      addSpriteComponent(world, entity, {
        width: 100,
        height: 100,
        renderable: createRenderable(),
        slices: { left: 40, right: 40, top: 16, bottom: 16 },
        textureDimensions: new Vector2(64, 64),
      }),
    ).toThrow(/width/);
  });

  it('gives each entity its own pivot, uvOffset, and uvScale vector instances', () => {
    const world = new EcsWorld();
    const first = world.createEntity();
    const second = world.createEntity();
    const options = { width: 32, height: 32, renderable: createRenderable() };

    addSpriteComponent(world, first, options);
    addSpriteComponent(world, second, options);

    expect(world.getComponent(first, spriteId)?.pivot).not.toBe(
      world.getComponent(second, spriteId)?.pivot,
    );
  });
});
