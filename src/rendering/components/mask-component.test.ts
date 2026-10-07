import { describe, expect, it } from 'vitest';
import { EcsWorld } from '../../ecs/index.js';
import { addMaskComponent, maskId } from './mask-component.js';

describe('addMaskComponent', () => {
  it('defaults to a centered rect mask', () => {
    const world = new EcsWorld();
    const entity = world.createEntity();

    const mask = addMaskComponent(world, entity, { width: 4, height: 2 });

    expect(mask).toEqual({
      width: 4,
      height: 2,
      pivot: { x: 0.5, y: 0.5 },
      shape: { kind: 'rect' },
    });
    expect(world.getComponent(entity, maskId)).toBe(mask);
  });

  it('copies pivot and shape, so masks built from one options object never share them', () => {
    const world = new EcsWorld();
    const options = {
      width: 4,
      height: 2,
      pivot: { x: 0, y: 0 },
      shape: { kind: 'linear' as const, origin: 'left' as const, amount: 0 },
    };

    const first = addMaskComponent(world, world.createEntity(), options);
    const second = addMaskComponent(world, world.createEntity(), options);

    first.pivot.x = 1;

    if (first.shape.kind === 'linear') {
      first.shape.amount = 1;
    }

    expect(second.pivot).toEqual({ x: 0, y: 0 });
    expect(second.shape).toEqual(options.shape);
    expect(options.shape.amount).toBe(0);
  });
});
