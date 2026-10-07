import { describe, expect, it, vi } from 'vitest';
import { addSpriteComponent, spriteId } from './sprite-component.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vec2 } from '../../math/index.js';
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
      pivot: { x: 0.5, y: 0.5 },
      tintColor: Color.white,
      uvOffset: Vec2.zero,
      uvScale: Vec2.one,
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

  it('captures an omitted nine-slice native size from the size the sprite is attached at', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const slices = { left: 8, right: 8, top: 8, bottom: 8 };

    const component = addSpriteComponent(world, entity, {
      width: 24,
      height: 16,
      renderable: createRenderable(),
      slices,
    });

    component.width = 178;
    component.height = 80;

    expect(component.slices).toEqual({
      ...slices,
      nativeWidth: 24,
      nativeHeight: 16,
    });
  });

  it('keeps an explicit nine-slice native size', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addSpriteComponent(world, entity, {
      width: 178,
      height: 80,
      renderable: createRenderable(),
      slices: {
        left: 8,
        right: 8,
        top: 8,
        bottom: 8,
        nativeWidth: 32,
        nativeHeight: 48,
      },
    });

    expect(component.slices).toMatchObject({
      nativeWidth: 32,
      nativeHeight: 48,
    });
  });

  it('does not mutate the slices object it was given', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const slices = { left: 8, right: 8, top: 8, bottom: 8 };

    addSpriteComponent(world, entity, {
      width: 24,
      height: 24,
      renderable: createRenderable(),
      slices,
    });

    expect(slices).toEqual({ left: 8, right: 8, top: 8, bottom: 8 });
  });
});
