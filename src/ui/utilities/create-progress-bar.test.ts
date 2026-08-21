import { describe, expect, it } from 'vitest';
import { createProgressBar } from './create-progress-bar.js';
import { parentId } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Color, Renderable, spriteId } from '../../rendering/index.js';
import { rectTransformId } from '../components/rect-transform-component.js';
import { uiProgressBarId } from '../components/ui-progress-bar-component.js';

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

describe('createProgressBar', () => {
  it('creates a track panel with a fill child', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const progressBar = createProgressBar(world, parent, {
      trackSprite: buildSprite(),
      fillSprite: buildSprite(),
    });

    expect(world.getComponent(progressBar.entity, parentId)).toEqual({
      parent,
    });
    expect(world.getComponent(progressBar.entity, uiProgressBarId)).toBe(
      progressBar.progressBar,
    );
    expect(world.getComponent(progressBar.fill, parentId)).toEqual({
      parent: progressBar.entity,
    });
    expect(world.getComponent(progressBar.fill, spriteId)).not.toBeNull();
  });

  it('anchors the fill to the initial value', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const progressBar = createProgressBar(world, parent, {
      trackSprite: buildSprite(),
      fillSprite: buildSprite(),
      minValue: 0,
      maxValue: 4,
      value: 3,
    });

    expect(
      world.getComponent(progressBar.fill, rectTransformId)!.anchorMax.x,
    ).toBeCloseTo(0.75);
  });

  it('defaults sizeDelta to 300x24', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const progressBar = createProgressBar(world, parent, {
      trackSprite: buildSprite(),
      fillSprite: buildSprite(),
    });

    expect(
      world.getComponent(progressBar.entity, rectTransformId)!.sizeDelta,
    ).toEqual({ x: 300, y: 24 });
  });
});
