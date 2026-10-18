import { describe, expect, it } from 'vitest';
import { createTooltip } from './create-tooltip.js';
import { addPositionComponent } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import {
  Color,
  fullTextureRegion,
  Texture,
  visibilityId,
} from '../../rendering/index.js';
import { textId } from '../../text/index.js';
import type { FontAtlas } from '../../text/font-atlas/font-atlas.js';
import {
  addRectTransformComponent,
  rectTransformId,
} from '../components/rect-transform-component.js';
import { tooltipId } from '../components/tooltip-component.js';
import { addUiInteractableComponent } from '../components/ui-interactable-component.js';
import { resolveRect } from './resolve-rect.js';

const fontAtlas = {} as FontAtlas;

const buildSprite = () => ({
  width: 1,
  height: 1,
  texture: {} as Texture,
  pivot: { x: 0.5, y: 0.5 },
  tintColor: Color.white,
  region: fullTextureRegion,
  emissive: null,
  material: null,
  category: 1,
  layer: 0,
});

function createSource(world: EcsWorld): number {
  const entity = world.createEntity();

  addPositionComponent(world, entity);
  addRectTransformComponent(world, entity);
  addUiInteractableComponent(world, entity);

  return entity;
}

describe('createTooltip', () => {
  it('builds a hidden panel/label and attaches a TooltipEcsComponent to the source', () => {
    const world = new EcsWorld();
    const source = createSource(world);

    const tooltip = createTooltip(world, source, {
      text: 'Mutes all sound effects',
      fontAtlas,
      textSize: 16,
      sprite: buildSprite(),
    });

    expect(world.getComponent(tooltip.panel, visibilityId)!.visible).toBe(
      false,
    );
    expect(world.getParent(tooltip.label)).toBe(tooltip.panel);

    const tooltipComponent = world.getComponent(source, tooltipId)!;

    expect(tooltipComponent.panel).toBe(tooltip.panel);
    expect(tooltipComponent.showDelayMilliseconds).toBe(400);
  });

  it('floats the panel just above the source, horizontally centered over it', () => {
    const world = new EcsWorld();
    const source = createSource(world);
    const sourceRect = { min: { x: 0, y: 100 }, max: { x: 200, y: 150 } };

    const tooltip = createTooltip(world, source, {
      text: 'Mutes all sound effects',
      fontAtlas,
      textSize: 16,
      sprite: buildSprite(),
    });

    const panelRect = resolveRect(
      sourceRect,
      world.getComponent(tooltip.panel, rectTransformId)!,
    );

    // y grows down: the default 160x40 panel ends 8 above the source's top
    // edge (y 100).
    expect(panelRect).toEqual({
      min: { x: 20, y: 52 },
      max: { x: 180, y: 92 },
    });
  });

  it('forwards a supplied category to the label', () => {
    const world = new EcsWorld();
    const source = createSource(world);

    const tooltip = createTooltip(world, source, {
      text: 'Mutes all sound effects',
      fontAtlas,
      textSize: 16,
      sprite: buildSprite(),
      category: 0b0010,
    });

    expect(world.getComponent(tooltip.label, textId)!.category).toBe(0b0010);
  });

  it('throws if the source has no UiInteractableEcsComponent', () => {
    const world = new EcsWorld();
    const source = world.createEntity();

    addPositionComponent(world, source);
    addRectTransformComponent(world, source);

    expect(() =>
      createTooltip(world, source, {
        text: 'hi',
        fontAtlas,
        textSize: 16,
        sprite: buildSprite(),
      }),
    ).toThrow(/UiInteractableEcsComponent/);
  });
});
