import { describe, expect, it } from 'vitest';
import { createUiProgressBarEcsSystem } from './ui-progress-bar-system.js';
import { EcsWorld } from '../../ecs/index.js';
import { addUiProgressBarComponent } from '../components/ui-progress-bar-component.js';
import {
  addRectTransformComponent,
  rectTransformId,
} from '../components/rect-transform-component.js';
import { UiStretchAxis } from '../types/ui-axis.js';

describe('createUiProgressBarEcsSystem', () => {
  it("drives the fill entity's x.anchorMax from value", () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const fill = world.createEntity();

    addRectTransformComponent(world, fill, {
      x: { kind: 'stretch', anchorMin: 0, anchorMax: 0, pivot: 0, margin: 0 },
    });
    const progressBar = addUiProgressBarComponent(world, entity, {
      fill,
      minValue: 0,
      maxValue: 10,
      value: 5,
    });

    world.addSystem(createUiProgressBarEcsSystem());
    world.update();

    expect(
      (world.getComponent(fill, rectTransformId)!.x as UiStretchAxis).anchorMax,
    ).toBeCloseTo(0.5);

    progressBar.value = 10;
    world.update();

    expect(
      (world.getComponent(fill, rectTransformId)!.x as UiStretchAxis).anchorMax,
    ).toBe(1);
  });

  it('does nothing when the fill entity has no rect transform', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const fill = world.createEntity();

    addUiProgressBarComponent(world, entity, { fill, value: 0.5 });

    world.addSystem(createUiProgressBarEcsSystem());

    expect(() => world.update()).not.toThrow();
  });
});
