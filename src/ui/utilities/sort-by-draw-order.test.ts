import { beforeEach, describe, expect, it } from 'vitest';
import { addPositionComponent } from '../../common/index.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { addDrawOrderComponent } from '../../rendering/components/draw-order-component.js';
import { sortByDrawOrder } from './sort-by-draw-order.js';

describe('sortByDrawOrder', () => {
  let world: EcsWorld;
  let canvas: number;
  let lower: number;
  let upper: number;

  const addElement = (y: number): number => {
    const element = world.createEntity();

    addPositionComponent(world, element, { local: { x: 0, y } });
    world.setParent(element, canvas);

    return element;
  };

  beforeEach(() => {
    world = new EcsWorld();
    canvas = world.createEntity();
    addPositionComponent(world, canvas);
    addDrawOrderComponent(world, canvas, { ySortChildren: true });
    lower = addElement(10);
    upper = addElement(0);
  });

  it('orders the children of a ySortChildren element by their Y when the camera y-sorts', () => {
    expect(sortByDrawOrder(world, [lower, upper], true)).toEqual([
      upper,
      lower,
    ]);
  });

  it('orders them in hierarchy order when the camera does not y-sort', () => {
    expect(sortByDrawOrder(world, [upper, lower], false)).toEqual([
      lower,
      upper,
    ]);
  });
});
