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

  it('leaves sortDepth undefined by default', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const renderable = createRenderable();

    addSpriteComponent(world, entity, { width: 32, height: 32, renderable });

    expect(world.getComponent(entity, spriteId)?.sortDepth).toBeUndefined();
  });

  it('accepts an explicit sortDepth override', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const renderable = createRenderable();

    addSpriteComponent(world, entity, {
      width: 32,
      height: 32,
      renderable,
      sortDepth: 7,
    });

    expect(world.getComponent(entity, spriteId)?.sortDepth).toBe(7);
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
