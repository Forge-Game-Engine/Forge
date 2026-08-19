import { describe, expect, it } from 'vitest';
import { addTextComponent, textId } from './text-component.js';
import { EcsWorld } from '../../ecs/index.js';
import { Color } from '../../rendering/color.js';
import type { FontAtlas } from '../font-atlas/font-atlas.js';

const fontAtlas = {} as FontAtlas;

describe('addTextComponent', () => {
  it('attaches a component with default values for unspecified options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addTextComponent(world, entity, { text: 'Play', fontAtlas, size: 32 });

    expect(world.getComponent(entity, textId)).toEqual({
      text: 'Play',
      fontAtlas,
      size: 32,
      color: Color.white,
      letterSpacing: 0,
      lineHeight: 1,
      horizontalAlign: 'left',
      verticalAlign: 'top',
      layer: 0,
      enabled: true,
      outlineColor: Color.black,
      outlineWidth: 0,
      shadowColor: Color.transparent,
      shadowOffset: { x: 0, y: 0 },
      shadowSoftness: 0,
    });
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addTextComponent(world, entity, {
      text: 'Score',
      fontAtlas,
      size: 24,
      horizontalAlign: 'center',
    });

    expect(world.getComponent(entity, textId)).toMatchObject({
      horizontalAlign: 'center',
      size: 24,
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addTextComponent(world, entity, {
      text: 'Play',
      fontAtlas,
      size: 32,
    });

    expect(world.getComponent(entity, textId)).toBe(component);
  });

  it('leaves sortDepth undefined by default', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addTextComponent(world, entity, { text: 'Play', fontAtlas, size: 32 });

    expect(world.getComponent(entity, textId)?.sortDepth).toBeUndefined();
  });

  it('accepts an explicit sortDepth override', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addTextComponent(world, entity, {
      text: 'Play',
      fontAtlas,
      size: 32,
      sortDepth: 7,
    });

    expect(world.getComponent(entity, textId)?.sortDepth).toBe(7);
  });
});
