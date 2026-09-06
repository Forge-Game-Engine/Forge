import { describe, expect, it } from 'vitest';
import { createUiAspectRatioFitterEcsSystem } from './ui-aspect-ratio-fitter-system.js';
import { addParentComponent } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { addAspectRatioFitterComponent } from '../components/aspect-ratio-fitter-component.js';
import {
  addRectTransformComponent,
  RectTransformEcsComponent,
  rectTransformId,
} from '../components/rect-transform-component.js';
import { uiAxisValue } from '../types/ui-axis.js';

function sizeOf(rectTransform: RectTransformEcsComponent): Vector2 {
  return {
    x: uiAxisValue(rectTransform.x),
    y: uiAxisValue(rectTransform.y),
  };
}

describe('createUiAspectRatioFitterEcsSystem', () => {
  it('derives height from width for widthControlsHeight', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addRectTransformComponent(world, entity, {
      x: { kind: 'point', anchor: 0.5, pivot: 0.5, size: 200 },
      y: { kind: 'point', anchor: 0.5, pivot: 0.5, size: 999 },
    });
    addAspectRatioFitterComponent(world, entity, {
      aspectMode: 'widthControlsHeight',
      aspectRatio: 2,
    });

    world.addSystem(createUiAspectRatioFitterEcsSystem());
    world.update();

    expect(sizeOf(world.getComponent(entity, rectTransformId)!)).toEqual({
      x: 200,
      y: 100,
    });
  });

  it('derives width from height for heightControlsWidth', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addRectTransformComponent(world, entity, {
      x: { kind: 'point', anchor: 0.5, pivot: 0.5, size: 999 },
      y: { kind: 'point', anchor: 0.5, pivot: 0.5, size: 50 },
    });
    addAspectRatioFitterComponent(world, entity, {
      aspectMode: 'heightControlsWidth',
      aspectRatio: 2,
    });

    world.addSystem(createUiAspectRatioFitterEcsSystem());
    world.update();

    expect(sizeOf(world.getComponent(entity, rectTransformId)!)).toEqual({
      x: 100,
      y: 50,
    });
  });

  it('fits inside a wider parent by constraining to its height, for fitInParent', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    addRectTransformComponent(world, parent, {
      rect: { min: { x: 0, y: 0 }, max: { x: 400, y: 100 } },
    });

    const entity = world.createEntity();

    addParentComponent(world, entity, { parent });
    addRectTransformComponent(world, entity, {
      x: { kind: 'point', anchor: 0.5, pivot: 0.5, size: 999 },
      y: { kind: 'point', anchor: 0.5, pivot: 0.5, size: 999 },
    });
    addAspectRatioFitterComponent(world, entity, {
      aspectMode: 'fitInParent',
      aspectRatio: 1,
    });

    world.addSystem(createUiAspectRatioFitterEcsSystem());
    world.update();

    // parent aspect (4) > target aspect (1) -> height-bound: 100x100.
    expect(sizeOf(world.getComponent(entity, rectTransformId)!)).toEqual({
      x: 100,
      y: 100,
    });
  });

  it('covers a wider parent by constraining to its width, for envelopeParent', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();

    addRectTransformComponent(world, parent, {
      rect: { min: { x: 0, y: 0 }, max: { x: 400, y: 100 } },
    });

    const entity = world.createEntity();

    addParentComponent(world, entity, { parent });
    addRectTransformComponent(world, entity, {
      x: { kind: 'point', anchor: 0.5, pivot: 0.5, size: 999 },
      y: { kind: 'point', anchor: 0.5, pivot: 0.5, size: 999 },
    });
    addAspectRatioFitterComponent(world, entity, {
      aspectMode: 'envelopeParent',
      aspectRatio: 1,
    });

    world.addSystem(createUiAspectRatioFitterEcsSystem());
    world.update();

    // parent aspect (4) > target aspect (1) -> width-bound: 400x400.
    expect(sizeOf(world.getComponent(entity, rectTransformId)!)).toEqual({
      x: 400,
      y: 400,
    });
  });

  it('is a no-op for fitInParent/envelopeParent with no ParentEcsComponent', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    addRectTransformComponent(world, entity, {
      x: { kind: 'point', anchor: 0.5, pivot: 0.5, size: 50 },
      y: { kind: 'point', anchor: 0.5, pivot: 0.5, size: 60 },
    });
    addAspectRatioFitterComponent(world, entity, {
      aspectMode: 'fitInParent',
      aspectRatio: 1,
    });

    world.addSystem(createUiAspectRatioFitterEcsSystem());
    world.update();

    expect(sizeOf(world.getComponent(entity, rectTransformId)!)).toEqual({
      x: 50,
      y: 60,
    });
  });

  it('is a no-op for fitInParent/envelopeParent when the parent has no RectTransformEcsComponent', () => {
    const world = new EcsWorld();
    const parent = world.createEntity();
    const entity = world.createEntity();

    addParentComponent(world, entity, { parent });
    addRectTransformComponent(world, entity, {
      x: { kind: 'point', anchor: 0.5, pivot: 0.5, size: 50 },
      y: { kind: 'point', anchor: 0.5, pivot: 0.5, size: 60 },
    });
    addAspectRatioFitterComponent(world, entity, {
      aspectMode: 'fitInParent',
      aspectRatio: 1,
    });

    world.addSystem(createUiAspectRatioFitterEcsSystem());
    world.update();

    expect(sizeOf(world.getComponent(entity, rectTransformId)!)).toEqual({
      x: 50,
      y: 60,
    });
  });
});
