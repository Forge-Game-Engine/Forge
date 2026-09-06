import { describe, expect, it } from 'vitest';
import { createProgressBar } from './create-progress-bar.js';
import { parentId } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Color, Renderable, spriteId } from '../../rendering/index.js';
import { rectTransformId } from '../components/rect-transform-component.js';
import { uiProgressBarId } from '../components/ui-progress-bar-component.js';
import { uiAxisValue, UiStretchAxis } from '../types/ui-axis.js';

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
      (
        world.getComponent(progressBar.fill, rectTransformId)!
          .x as UiStretchAxis
      ).anchorMax,
    ).toBeCloseTo(0.75);
  });

  it('passes through anchoredPosition', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const progressBar = createProgressBar(world, parent, {
      trackSprite: buildSprite(),
      fillSprite: buildSprite(),
      anchoredPosition: { x: 5, y: -5 },
    });

    expect(
      world.getComponent(progressBar.entity, rectTransformId)!.anchoredPosition,
    ).toEqual({ x: 5, y: -5 });
  });

  it('defaults the track size to 300x24', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const progressBar = createProgressBar(world, parent, {
      trackSprite: buildSprite(),
      fillSprite: buildSprite(),
    });

    const rectTransform = world.getComponent(
      progressBar.entity,
      rectTransformId,
    )!;

    expect({
      x: uiAxisValue(rectTransform.x),
      y: uiAxisValue(rectTransform.y),
    }).toEqual({ x: 300, y: 24 });
  });
});
