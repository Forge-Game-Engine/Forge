import { describe, expect, it } from 'vitest';
import { createUiCanvasGroupEcsSystem } from './ui-canvas-group-system.js';
import {
  addParentComponent,
  addPositionComponent,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import {
  addSpriteComponent,
  Color,
  Renderable,
  spriteId,
} from '../../rendering/index.js';
import { addTextComponent, textId } from '../../text/index.js';
import type { FontAtlas } from '../../text/font-atlas/font-atlas.js';
import { addCanvasGroupComponent } from '../components/canvas-group-component.js';
import { addRectTransformComponent } from '../components/rect-transform-component.js';

const buildRenderable = (): Renderable => ({}) as Renderable;

/** Creates a bare UI element (`RectTransformEcsComponent` + `PositionEcsComponent`, optionally parented) - enough for `createUiCanvasGroupEcsSystem`'s query, without a full canvas/camera setup. */
function createElement(world: EcsWorld, parent?: number): number {
  const entity = world.createEntity();

  addPositionComponent(world, entity);
  addRectTransformComponent(world, entity);

  if (parent !== undefined) {
    addParentComponent(world, entity, { parent });
  }

  return entity;
}

describe('createUiCanvasGroupEcsSystem', () => {
  it('leaves opacityMultiplier unset for an element with no ancestor CanvasGroupEcsComponent', () => {
    const world = new EcsWorld();
    const root = createElement(world);

    addSpriteComponent(world, root, {
      width: 10,
      height: 10,
      renderable: buildRenderable(),
    });

    world.addSystem(createUiCanvasGroupEcsSystem());
    world.update();

    expect(
      world.getComponent(root, spriteId)!.opacityMultiplier,
    ).toBeUndefined();
  });

  it("writes a governed group's alpha into descendant sprite/text opacityMultiplier", () => {
    const world = new EcsWorld();
    const group = createElement(world);
    const child = createElement(world, group);

    addCanvasGroupComponent(world, group, { alpha: 0.5 });
    addSpriteComponent(world, child, {
      width: 10,
      height: 10,
      renderable: buildRenderable(),
    });
    addTextComponent(world, child, {
      text: 'hi',
      fontAtlas: {} as FontAtlas,
      size: 16,
    });

    world.addSystem(createUiCanvasGroupEcsSystem());
    world.update();

    expect(world.getComponent(child, spriteId)!.opacityMultiplier).toBe(0.5);
    expect(world.getComponent(child, textId)!.opacityMultiplier).toBe(0.5);
  });

  it('multiplies nested groups down the hierarchy', () => {
    const world = new EcsWorld();
    const outer = createElement(world);
    const inner = createElement(world, outer);
    const leaf = createElement(world, inner);

    addCanvasGroupComponent(world, outer, { alpha: 0.5 });
    addCanvasGroupComponent(world, inner, { alpha: 0.4 });
    addSpriteComponent(world, leaf, {
      width: 10,
      height: 10,
      renderable: buildRenderable(),
    });

    world.addSystem(createUiCanvasGroupEcsSystem());
    world.update();

    expect(world.getComponent(leaf, spriteId)!.opacityMultiplier).toBeCloseTo(
      0.2,
    );
  });

  it('never mutates tintColor/color, only opacityMultiplier', () => {
    const world = new EcsWorld();
    const group = createElement(world);
    const child = createElement(world, group);

    addCanvasGroupComponent(world, group, { alpha: 0.5 });

    const sprite = addSpriteComponent(world, child, {
      width: 10,
      height: 10,
      renderable: buildRenderable(),
      tintColor: new Color(1, 0, 0, 0.8),
    });

    world.addSystem(createUiCanvasGroupEcsSystem());
    world.update();

    expect(sprite.tintColor).toEqual(new Color(1, 0, 0, 0.8));
    expect(sprite.opacityMultiplier).toBe(0.5);
  });
});
