import { beforeEach, describe, expect, it } from 'vitest';
import { addScaleComponent } from '../components';
import { EcsWorld } from '../../ecs';
import { Vector2 } from '../../math';
import { addParentComponent } from '../components/parent-component';
import { createParentScaleEcsSystem } from './parent-scale-system';

describe('parent-scale-system', () => {
  let world: EcsWorld;

  beforeEach(() => {
    world = new EcsWorld();
    world.addSystem(createParentScaleEcsSystem());
  });

  it('root transforms should have the same world and local values', () => {
    const entity = world.createEntity();

    const scaleComponent = addScaleComponent(world, entity, {
      local: new Vector2(10, 20),
      world: new Vector2(0, 0),
    });

    world.update();

    expect(scaleComponent.world.x).toBe(10);
    expect(scaleComponent.local.x).toBe(10);
    expect(scaleComponent.world.y).toBe(20);
    expect(scaleComponent.local.y).toBe(20);
  });

  it('should compute world scales for a parent-child hierarchy', () => {
    const parent = world.createEntity();
    const child = world.createEntity();

    const parentScale = addScaleComponent(world, parent, {
      local: new Vector2(10, 20),
      world: new Vector2(0, 0),
    });

    const childScale = addScaleComponent(world, child, {
      local: new Vector2(5, 5),
      world: new Vector2(0, 0),
    });

    addParentComponent(world, child, { parent });
    world.update();

    expect(parentScale.world.x).toBe(10);
    expect(parentScale.local.x).toBe(10);
    expect(parentScale.world.y).toBe(20);
    expect(parentScale.local.y).toBe(20);

    expect(childScale.world.x).toBe(50);
    expect(childScale.local.x).toBe(5);
    expect(childScale.world.y).toBe(100);
    expect(childScale.local.y).toBe(5);
  });

  it('should compute world scales for a parent-child-grandchild hierarchy', () => {
    const parent = world.createEntity();
    const child = world.createEntity();
    const grandchild = world.createEntity();

    const parentScale = addScaleComponent(world, parent, {
      local: new Vector2(10, 20),
      world: new Vector2(0, 0),
    });

    const childScale = addScaleComponent(world, child, {
      local: new Vector2(5, 5),
      world: new Vector2(0, 0),
    });

    const grandchildScale = addScaleComponent(world, grandchild, {
      local: new Vector2(2, 2),
      world: new Vector2(0, 0),
    });

    addParentComponent(world, child, { parent });
    addParentComponent(world, grandchild, { parent: child });

    world.update();

    expect(parentScale.world.x).toBe(10);
    expect(parentScale.local.x).toBe(10);
    expect(parentScale.world.y).toBe(20);
    expect(parentScale.local.y).toBe(20);

    expect(childScale.world.x).toBe(50);
    expect(childScale.local.x).toBe(5);
    expect(childScale.world.y).toBe(100);
    expect(childScale.local.y).toBe(5);

    expect(grandchildScale.world.x).toBe(100);
    expect(grandchildScale.local.x).toBe(2);
    expect(grandchildScale.world.y).toBe(200);
    expect(grandchildScale.local.y).toBe(2);
  });

  it('should compute world scales for a parent-child-grandchild hierarchy (out-of-order registration)', () => {
    const parent = world.createEntity();
    const grandchild = world.createEntity();
    const child = world.createEntity();

    const grandchildScale = addScaleComponent(world, grandchild, {
      local: new Vector2(2, 2),
      world: new Vector2(0, 0),
    });

    const parentScale = addScaleComponent(world, parent, {
      local: new Vector2(10, 20),
      world: new Vector2(0, 0),
    });

    const childScale = addScaleComponent(world, child, {
      local: new Vector2(5, 5),
      world: new Vector2(0, 0),
    });

    addParentComponent(world, grandchild, { parent: child });
    addParentComponent(world, child, { parent });

    world.update();

    expect(parentScale.world.x).toBe(10);
    expect(parentScale.local.x).toBe(10);
    expect(parentScale.world.y).toBe(20);
    expect(parentScale.local.y).toBe(20);

    expect(childScale.world.x).toBe(50);
    expect(childScale.local.x).toBe(5);
    expect(childScale.world.y).toBe(100);
    expect(childScale.local.y).toBe(5);

    expect(grandchildScale.world.x).toBe(100);
    expect(grandchildScale.local.x).toBe(2);
    expect(grandchildScale.world.y).toBe(200);
    expect(grandchildScale.local.y).toBe(2);
  });

  it('should compute world scales for a parent-child-grandchild hierarchy after they scale', () => {
    const parent = world.createEntity();
    const child = world.createEntity();
    const grandchild = world.createEntity();

    const parentScale = addScaleComponent(world, parent, {
      local: new Vector2(10, 20),
      world: new Vector2(0, 0),
    });

    const childScale = addScaleComponent(world, child, {
      local: new Vector2(5, 5),
      world: new Vector2(0, 0),
    });

    const grandchildScale = addScaleComponent(world, grandchild, {
      local: new Vector2(2, 2),
      world: new Vector2(0, 0),
    });

    addParentComponent(world, child, { parent });
    addParentComponent(world, grandchild, { parent: child });

    world.update();

    childScale.local.x = 120;

    world.update();

    expect(parentScale.world.x).toBe(10);
    expect(parentScale.local.x).toBe(10);
    expect(parentScale.world.y).toBe(20);
    expect(parentScale.local.y).toBe(20);

    expect(childScale.world.x).toBe(1200);
    expect(childScale.local.x).toBe(120);
    expect(childScale.world.y).toBe(100);
    expect(childScale.local.y).toBe(5);

    expect(grandchildScale.world.x).toBe(2400);
    expect(grandchildScale.local.x).toBe(2);
    expect(grandchildScale.world.y).toBe(200);
    expect(grandchildScale.local.y).toBe(2);
  });
});
