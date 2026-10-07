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

  it("copies the options' pivot, uvOffset, uvScale and slices, so two components built from one options object don't share them", () => {
    const world = new EcsWorld();
    const first = world.createEntity();
    const second = world.createEntity();
    const options = {
      width: 32,
      height: 32,
      renderable: createRenderable(),
      pivot: { x: 0, y: 1 },
      uvOffset: { x: 0.25, y: 0 },
      uvScale: { x: 0.25, y: 1 },
      slices: { left: 1, right: 1, top: 1, bottom: 1 },
    };

    const firstSprite = addSpriteComponent(world, first, options);
    const secondSprite = addSpriteComponent(world, second, options);

    firstSprite.uvOffset.x = 0.75;
    firstSprite.pivot.y = 0;

    expect(secondSprite.uvOffset).toEqual({ x: 0.25, y: 0 });
    expect(secondSprite.pivot).toEqual({ x: 0, y: 1 });
    expect(options.uvOffset).toEqual({ x: 0.25, y: 0 });
    expect(firstSprite.uvScale).not.toBe(options.uvScale);
    expect(firstSprite.uvScale).toEqual(options.uvScale);
    expect(firstSprite.slices).not.toBe(secondSprite.slices);
    expect(firstSprite.slices).not.toBe(options.slices);
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
