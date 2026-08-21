import { describe, expect, it } from 'vitest';
import { createUiProgressBarEcsSystem } from './ui-progress-bar-system.js';
import { EcsWorld } from '../../ecs/index.js';
import { addUiProgressBarComponent } from '../components/ui-progress-bar-component.js';
import {
  addRectTransformComponent,
  rectTransformId,
} from '../components/rect-transform-component.js';

describe('createUiProgressBarEcsSystem', () => {
  it("drives the fill entity's anchorMax.x from value", () => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const fill = world.createEntity();

    addRectTransformComponent(world, fill, {
      anchorMin: { x: 0, y: 0 },
      anchorMax: { x: 0, y: 1 },
    });
    const progressBar = addUiProgressBarComponent(world, entity, {
      fill,
      minValue: 0,
      maxValue: 10,
      value: 5,
    });

    world.addSystem(createUiProgressBarEcsSystem());
    world.update();

    expect(world.getComponent(fill, rectTransformId)!.anchorMax.x).toBeCloseTo(
      0.5,
    );

    progressBar.value = 10;
    world.update();

    expect(world.getComponent(fill, rectTransformId)!.anchorMax.x).toBe(1);
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
