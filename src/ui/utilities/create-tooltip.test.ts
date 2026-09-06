import { describe, expect, it } from 'vitest';
import { createTooltip } from './create-tooltip.js';
import { addPositionComponent } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Color, Renderable, spriteId } from '../../rendering/index.js';
import { textId } from '../../text/index.js';
import type { FontAtlas } from '../../text/font-atlas/font-atlas.js';
import { addRectTransformComponent } from '../components/rect-transform-component.js';
import { tooltipId } from '../components/tooltip-component.js';
import { addUiInteractableComponent } from '../components/ui-interactable-component.js';

const fontAtlas = {} as FontAtlas;

const buildSprite = () => ({
  width: 1,
  height: 1,
  renderable: {} as Renderable,
  pivot: { x: 0.5, y: 0.5 },
  tintColor: Color.white,
  uvOffset: { x: 0, y: 0 },
  uvScale: { x: 1, y: 1 },
  enabled: true,
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

    expect(world.getComponent(tooltip.panel, spriteId)!.enabled).toBe(false);
    expect(world.getComponent(tooltip.label, textId)!.enabled).toBe(false);

    const tooltipComponent = world.getComponent(source, tooltipId)!;

    expect(tooltipComponent.panel).toBe(tooltip.panel);
    expect(tooltipComponent.label).toBe(tooltip.label);
    expect(tooltipComponent.showDelayMilliseconds).toBe(400);
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
