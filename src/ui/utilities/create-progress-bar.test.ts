import { describe, expect, it } from 'vitest';
import { createProgressBar } from './create-progress-bar.js';
import { EcsWorld } from '../../ecs/index.js';
import { Color, maskId, spriteId, Texture } from '../../rendering/index.js';
import { rectTransformId } from '../components/rect-transform-component.js';
import { uiProgressBarId } from '../components/ui-progress-bar-component.js';
import { UiAnchor } from '../types/ui-anchor.js';
import { uiAxisValue } from '../types/ui-axis.js';

const buildSprite = () => ({
  width: 1,
  height: 1,
  texture: {} as Texture,
  pivot: { x: 0.5, y: 0.5 },
  tintColor: Color.white,
  uvOffset: { x: 0, y: 0 },
  uvScale: { x: 1, y: 1 },
  emissive: null,
  material: null,
  category: 1,
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

    expect(world.getParent(progressBar.entity)).toBe(parent);
    expect(world.getComponent(progressBar.entity, uiProgressBarId)).toBe(
      progressBar.progressBar,
    );
    expect(world.getParent(progressBar.fill)).toBe(progressBar.entity);
    expect(world.getComponent(progressBar.fill, spriteId)).not.toBeNull();
  });

  it('covers the whole bar with the fill and reveals the initial value with a linear mask from the left', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const progressBar = createProgressBar(world, parent, {
      trackSprite: buildSprite(),
      fillSprite: buildSprite(),
      minValue: 0,
      maxValue: 4,
      value: 3,
    });

    expect(world.getComponent(progressBar.fill, rectTransformId)!.x).toEqual(
      UiAnchor.stretchAll().x,
    );
    expect(world.getComponent(progressBar.fill, maskId)!.shape).toEqual({
      kind: 'linear',
      origin: 'left',
      amount: 0.75,
    });
  });

  it('reveals the fill with fillShape', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    const progressBar = createProgressBar(world, parent, {
      trackSprite: buildSprite(),
      fillSprite: buildSprite(),
      value: 0.5,
      fillShape: { kind: 'radial', startAngle: Math.PI / 2, sweep: -Math.PI },
    });

    expect(world.getComponent(progressBar.fill, maskId)!.shape).toEqual({
      kind: 'radial',
      startAngle: Math.PI / 2,
      sweep: -Math.PI,
      amount: 0.5,
    });
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
