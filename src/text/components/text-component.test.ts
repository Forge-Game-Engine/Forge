import { describe, expect, it } from 'vitest';
import { addTextComponent, textId } from './text-component.js';
import { EcsWorld } from '../../ecs/index.js';
import { Color } from '../../rendering/color.js';
import type { Renderable } from '../../rendering/renderable.js';
import type { FontAtlas } from '../../asset-loading/index.js';

const renderable = {} as Renderable;
const font = {} as FontAtlas;

describe('addTextComponent', () => {
  it('attaches a component with default values for unspecified options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addTextComponent(world, entity, {
      text: 'Hello',
      font,
      renderable,
      fontSize: 16,
    });

    expect(world.getComponent(entity, textId)).toEqual({
      text: 'Hello',
      font,
      renderable,
      fontSize: 16,
      color: Color.white,
      alignment: 'left',
      lineSpacing: 1,
      pivot: { x: 0.5, y: 0.5 },
      enabled: true,
      layer: 0,
    });
  });

  it('overrides only the provided options', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addTextComponent(world, entity, {
      text: 'Hello',
      font,
      renderable,
      fontSize: 16,
      alignment: 'center',
      wrapWidth: 100,
      enabled: false,
    });

    expect(world.getComponent(entity, textId)).toMatchObject({
      alignment: 'center',
      wrapWidth: 100,
      enabled: false,
      lineSpacing: 1,
    });
  });

  it('returns the attached component', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const component = addTextComponent(world, entity, {
      text: 'Hello',
      font,
      renderable,
      fontSize: 16,
    });

    expect(world.getComponent(entity, textId)).toBe(component);
  });

  it('gives each entity its own pivot vector instance', () => {
    const world = new EcsWorld();
    const first = world.createEntity();
    const second = world.createEntity();
    const options = { text: 'Hello', font, renderable, fontSize: 16 };

    addTextComponent(world, first, options);
    addTextComponent(world, second, options);

    expect(world.getComponent(first, textId)?.pivot).not.toBe(
      world.getComponent(second, textId)?.pivot,
    );
  });
});
