import { beforeEach, describe, expect, it } from 'vitest';
import { addPositionComponent } from '../components';
import { EcsWorld } from '../../ecs';
import { Vector2 } from '../../math';
import { addParentComponent } from '../components/parent-component';
import { createParentPositionEcsSystem } from './parent-position-system';

describe('parent-position-system', () => {
  let world: EcsWorld;

  beforeEach(() => {
    world = new EcsWorld();
    world.addSystem(createParentPositionEcsSystem());
  });

  it('root transforms should have the same world and local values', () => {
    const entity = world.createEntity();

    const positionComponent = addPositionComponent(world, entity, {
      local: new Vector2(10, 20),
    });

    world.update();

    expect(positionComponent.world.x).toBe(10);
    expect(positionComponent.local.x).toBe(10);
    expect(positionComponent.world.y).toBe(20);
    expect(positionComponent.local.y).toBe(20);
  });

  it('should compute world positions for a parent-child hierarchy', () => {
    const parent = world.createEntity();
    const child = world.createEntity();

    const parentPosition = addPositionComponent(world, parent, {
      local: new Vector2(10, 20),
    });

    const childPosition = addPositionComponent(world, child, {
      local: new Vector2(5, 5),
    });

    addParentComponent(world, child, { parent });
    world.update();

    expect(parentPosition.world.x).toBe(10);
    expect(parentPosition.local.x).toBe(10);
    expect(parentPosition.world.y).toBe(20);
    expect(parentPosition.local.y).toBe(20);

    expect(childPosition.world.x).toBe(15);
    expect(childPosition.local.x).toBe(5);
    expect(childPosition.world.y).toBe(25);
    expect(childPosition.local.y).toBe(5);
  });

  it('should compute world positions for a parent-child-grandchild hierarchy', () => {
    const parent = world.createEntity();
    const child = world.createEntity();
    const grandchild = world.createEntity();

    const parentPosition = addPositionComponent(world, parent, {
      local: new Vector2(10, 20),
    });

    const childPosition = addPositionComponent(world, child, {
      local: new Vector2(5, 5),
    });

    const grandchildPosition = addPositionComponent(world, grandchild, {
      local: new Vector2(2, 2),
    });

    addParentComponent(world, child, { parent });
    addParentComponent(world, grandchild, { parent: child });

    world.update();

    expect(parentPosition.world.x).toBe(10);
    expect(parentPosition.local.x).toBe(10);
    expect(parentPosition.world.y).toBe(20);
    expect(parentPosition.local.y).toBe(20);

    expect(childPosition.world.x).toBe(15);
    expect(childPosition.local.x).toBe(5);
    expect(childPosition.world.y).toBe(25);
    expect(childPosition.local.y).toBe(5);

    expect(grandchildPosition.world.x).toBe(17);
    expect(grandchildPosition.local.x).toBe(2);
    expect(grandchildPosition.world.y).toBe(27);
    expect(grandchildPosition.local.y).toBe(2);
  });

  it('should compute world positions for a parent-child-grandchild hierarchy (out-of-order registration)', () => {
    const parent = world.createEntity();
    const grandchild = world.createEntity();
    const child = world.createEntity();

    const grandchildPosition = addPositionComponent(world, grandchild, {
      local: new Vector2(2, 2),
    });

    const parentPosition = addPositionComponent(world, parent, {
      local: new Vector2(10, 20),
    });

    const childPosition = addPositionComponent(world, child, {
      local: new Vector2(5, 5),
    });

    addParentComponent(world, grandchild, { parent: child });
    addParentComponent(world, child, { parent });

    world.update();

    expect(parentPosition.world.x).toBe(10);
    expect(parentPosition.local.x).toBe(10);
    expect(parentPosition.world.y).toBe(20);
    expect(parentPosition.local.y).toBe(20);

    expect(childPosition.world.x).toBe(15);
    expect(childPosition.local.x).toBe(5);
    expect(childPosition.world.y).toBe(25);
    expect(childPosition.local.y).toBe(5);

    expect(grandchildPosition.world.x).toBe(17);
    expect(grandchildPosition.local.x).toBe(2);
    expect(grandchildPosition.world.y).toBe(27);
    expect(grandchildPosition.local.y).toBe(2);
  });

  it('should compute world positions for a parent-child-grandchild hierarchy after they move', () => {
    const parent = world.createEntity();
    const child = world.createEntity();
    const grandchild = world.createEntity();

    const parentPosition = addPositionComponent(world, parent, {
      local: new Vector2(10, 20),
    });

    const childPosition = addPositionComponent(world, child, {
      local: new Vector2(5, 5),
    });

    const grandchildPosition = addPositionComponent(world, grandchild, {
      local: new Vector2(2, 2),
    });

    addParentComponent(world, child, { parent });
    addParentComponent(world, grandchild, { parent: child });

    world.update();

    childPosition.local.x = 120;

    world.update();

    expect(parentPosition.world.x).toBe(10);
    expect(parentPosition.local.x).toBe(10);
    expect(parentPosition.world.y).toBe(20);
    expect(parentPosition.local.y).toBe(20);

    expect(childPosition.world.x).toBe(130);
    expect(childPosition.local.x).toBe(120);
    expect(childPosition.world.y).toBe(25);
    expect(childPosition.local.y).toBe(5);

    expect(grandchildPosition.world.x).toBe(132);
    expect(grandchildPosition.local.x).toBe(2);
    expect(grandchildPosition.world.y).toBe(27);
    expect(grandchildPosition.local.y).toBe(2);
  });
});
