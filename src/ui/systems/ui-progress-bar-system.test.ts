import { describe, expect, it } from 'vitest';
import { createUiProgressBarEcsSystem } from './ui-progress-bar-system.js';
import { EcsWorld } from '../../ecs/index.js';
import { addMaskComponent, maskId, MaskShape } from '../../rendering/index.js';
import {
  addUiProgressBarComponent,
  UiProgressBarEcsComponent,
} from '../components/ui-progress-bar-component.js';

describe('createUiProgressBarEcsSystem', () => {
  const createProgressBarWithFillMask = (
    shape: MaskShape,
  ): {
    world: EcsWorld;
    fill: number;
    progressBar: UiProgressBarEcsComponent;
  } => {
    const world = new EcsWorld();
    const entity = world.createEntity();
    const fill = world.createEntity();

    addMaskComponent(world, fill, { width: 10, height: 1, shape });
    const progressBar = addUiProgressBarComponent(world, entity, {
      fill,
      minValue: 0,
      maxValue: 10,
      value: 5,
    });

    world.addSystem(createUiProgressBarEcsSystem());

    return { world, fill, progressBar };
  };

  it("sets the amount of the fill's mask from value", () => {
    const { world, fill } = createProgressBarWithFillMask({
      kind: 'radial',
      startAngle: 0,
      sweep: Math.PI,
      amount: 0,
    });

    world.update();

    expect(world.getComponent(fill, maskId)!.shape).toEqual({
      kind: 'radial',
      startAngle: 0,
      sweep: Math.PI,
      amount: 0.5,
    });
  });

  it('follows value changes', () => {
    const { world, fill, progressBar } = createProgressBarWithFillMask({
      kind: 'linear',
      origin: 'left',
      amount: 0,
    });

    world.update();
    progressBar.value = 10;
    world.update();

    expect(world.getComponent(fill, maskId)!.shape).toMatchObject({
      amount: 1,
    });
  });

  it('throws when the fill has a rect mask', () => {
    const { world } = createProgressBarWithFillMask({ kind: 'rect' });

    expect(() => world.update()).toThrow('linear or radial MaskEcsComponent');
  });

  it('throws when the fill has no mask', () => {
    const world = new EcsWorld();

    addUiProgressBarComponent(world, world.createEntity(), {
      fill: world.createEntity(),
    });
    world.addSystem(createUiProgressBarEcsSystem());

    expect(() => world.update()).toThrow('linear or radial MaskEcsComponent');
  });
});
