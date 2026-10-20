import { describe, expect, it } from 'vitest';
import { EcsWorld } from '../../ecs/index.js';
import { Color } from '../color.js';
import { addSpriteComponent } from '../components/sprite-component.js';
import type { Texture } from '../texture.js';
import { createGridTextureAtlas } from '../texture-atlas/create-grid-texture-atlas.js';
import { createTextureAtlas } from '../texture-atlas/texture-atlas.js';
import { createAtlasSprite } from './create-atlas-sprite.js';

const texture = { width: 128, height: 64 } as Texture;

const atlas = createTextureAtlas(texture, [
  { name: 'coin', x: 0, y: 0, width: 16, height: 16 },
  {
    name: 'hero',
    x: 16,
    y: 0,
    width: 20,
    height: 30,
    sourceWidth: 32,
    sourceHeight: 32,
    trimX: 6,
    trimY: 2,
    pivot: { x: 0.5, y: 1 },
  },
  { name: 'panel', x: 64, y: 0, width: 48, height: 32 },
]);

describe('createAtlasSprite', () => {
  it("draws the region with the atlas's texture, with every other option at its default", () => {
    const sprite = createAtlasSprite(atlas, 'coin');

    expect(sprite).toEqual({
      texture,
      width: 0.16,
      height: 0.16,
      pivot: { x: 0.5, y: 0.5 },
      tintColor: Color.white,
      region: atlas.getRegion('coin'),
      emissive: null,
      material: null,
      category: 1,
      layer: 0,
      slices: undefined,
    });
  });

  it('looks the region up by name or by index', () => {
    expect(createAtlasSprite(atlas, 'hero').region).toBe(atlas.regions[1]);
    expect(createAtlasSprite(atlas, 2).region).toBe(atlas.regions[2]);
  });

  it("throws the atlas's lookup error for a missing region", () => {
    expect(() => createAtlasSprite(atlas, 'heroes')).toThrow(
      'Did you mean "hero"?',
    );
    expect(() => createAtlasSprite(atlas, 3)).toThrow(
      'the index must be a whole number from 0 to 2',
    );
  });

  it("sizes the sprite to the region's untrimmed frame at pixelsPerUnit", () => {
    const sprite = createAtlasSprite(atlas, 'hero', { pixelsPerUnit: 16 });

    expect(sprite.width).toBe(2);
    expect(sprite.height).toBe(2);
  });

  it('defaults pixelsPerUnit to 100', () => {
    const sprite = createAtlasSprite(atlas, 'hero');

    expect(sprite.width).toBeCloseTo(0.32);
    expect(sprite.height).toBeCloseTo(0.32);
  });

  it("takes a copy of the region's pivot", () => {
    const region = atlas.getRegion('hero');
    const sprite = createAtlasSprite(atlas, 'hero');

    expect(sprite.pivot).toEqual({ x: 0.5, y: 1 });
    expect(sprite.pivot).not.toBe(region.pivot);
    expect(Object.isFrozen(sprite.pivot)).toBe(false);
  });

  it("resolves an omitted nine-slice native size from the region's world size", () => {
    const sprite = createAtlasSprite(atlas, 'panel', {
      pixelsPerUnit: 2,
      slices: { left: 4, right: 4, top: 4, bottom: 4 },
    });

    expect(sprite.slices).toEqual({
      left: 4,
      right: 4,
      top: 4,
      bottom: 4,
      nativeWidth: 24,
      nativeHeight: 16,
    });
  });

  it('throws for slices on a trimmed region, naming it', () => {
    expect(() =>
      createAtlasSprite(atlas, 'hero', {
        slices: { left: 1, right: 1, top: 1, bottom: 1 },
      }),
    ).toThrow(
      'Unable to create a nine-sliced sprite from atlas region "hero": the region is trimmed',
    );
  });

  it('can be added to any number of entities', () => {
    const world = new EcsWorld();
    const sprite = createAtlasSprite(atlas, 'hero');

    const first = addSpriteComponent(world, world.createEntity(), sprite);
    const second = addSpriteComponent(world, world.createEntity(), sprite);

    first.pivot.x = 0;

    expect(second.pivot.x).toBe(0.5);
    expect(first.region).toBe(second.region);
  });

  it('draws exactly the sixth cell of a grid atlas', () => {
    const gridAtlas = createGridTextureAtlas(
      { width: 100, height: 100 } as Texture,
      { cellWidth: 32, cellHeight: 32, spacing: 2 },
    );

    const sprite = createAtlasSprite(gridAtlas, 5, { pixelsPerUnit: 32 });

    expect(sprite.region).toBe(gridAtlas.regions[5]);
    expect(sprite.region.uvOffset).toEqual({ x: 68 / 100, y: 34 / 100 });
    expect(sprite.region.uvScale).toEqual({ x: 32 / 100, y: 32 / 100 });
    expect(sprite.width).toBe(1);
    expect(sprite.height).toBe(1);
  });
});
