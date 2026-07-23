import { beforeEach, describe, expect, it } from 'vitest';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { addPositionComponent } from '../components/index.js';
import { addParentComponent } from '../components/parent-component.js';
import { createTransformEcsSystem } from './transform-system.js';

describe('transform-system', () => {
  let world: EcsWorld;

  beforeEach(() => {
    world = new EcsWorld();
    world.addSystem(createTransformEcsSystem());
  });

  it('should set world position to local position for a root entity', () => {
    const entity = world.createEntity();

    const position = addPositionComponent(world, entity, {
      local: new Vector2(10, 20),
    });

    world.update();

    expect(position.world.x).toBe(10);
    expect(position.world.y).toBe(20);
  });

  it('should compose a child world position from its parent', () => {
    const parent = world.createEntity();
    const child = world.createEntity();

    addPositionComponent(world, parent, {
      local: new Vector2(10, 20),
    });

    const childPosition = addPositionComponent(world, child, {
      local: new Vector2(5, 5),
    });

    addParentComponent(world, child, { parent });

    world.update();

    expect(childPosition.world.x).toBe(15);
    expect(childPosition.world.y).toBe(25);
  });

  it('should keep recomputing world position for non-static entities after local changes', () => {
    const entity = world.createEntity();

    const position = addPositionComponent(world, entity, {
      local: new Vector2(10, 20),
    });

    world.update();

    position.local.x = 100;
    position.local.y = 200;

    world.update();

    expect(position.world.x).toBe(100);
    expect(position.world.y).toBe(200);
  });

  it('should freeze a root static entity after its first computation', () => {
    const entity = world.createEntity();

    const position = addPositionComponent(world, entity, {
      local: new Vector2(10, 20),
      isStatic: true,
    });

    world.update();

    expect(position.world.x).toBe(10);
    expect(position.world.y).toBe(20);

    position.local.x = 999;
    position.local.y = 999;

    world.update();

    expect(position.world.x).toBe(10);
    expect(position.world.y).toBe(20);
  });

  it('should keep updating a static child whose parent is not static', () => {
    const parent = world.createEntity();
    const child = world.createEntity();

    const parentPosition = addPositionComponent(world, parent, {
      local: new Vector2(10, 20),
    });

    const childPosition = addPositionComponent(world, child, {
      local: new Vector2(5, 5),
      isStatic: true,
    });

    addParentComponent(world, child, { parent });

    world.update();

    expect(childPosition.world.x).toBe(15);
    expect(childPosition.world.y).toBe(25);

    parentPosition.local.x = 100;
    parentPosition.local.y = 100;

    world.update();

    expect(childPosition.world.x).toBe(105);
    expect(childPosition.world.y).toBe(105);
  });

  it('should freeze a static child once its entire parent chain is also static', () => {
    const parent = world.createEntity();
    const child = world.createEntity();

    const parentPosition = addPositionComponent(world, parent, {
      local: new Vector2(10, 20),
      isStatic: true,
    });

    const childPosition = addPositionComponent(world, child, {
      local: new Vector2(5, 5),
      isStatic: true,
    });

    addParentComponent(world, child, { parent });

    world.update();

    expect(parentPosition.world.x).toBe(10);
    expect(childPosition.world.x).toBe(15);

    parentPosition.local.x = 999;
    childPosition.local.x = 999;

    world.update();

    expect(parentPosition.world.x).toBe(10);
    expect(childPosition.world.x).toBe(15);
  });

  it('should not skip a recycled entity id that is no longer static', () => {
    const staticEntity = world.createEntity();

    addPositionComponent(world, staticEntity, {
      local: new Vector2(10, 20),
      isStatic: true,
    });

    world.update();

    world.removeEntity(staticEntity);

    const recycledEntity = world.createEntity();

    const recycledPosition = addPositionComponent(world, recycledEntity, {
      local: new Vector2(50, 60),
    });

    world.update();

    expect(recycledPosition.world.x).toBe(50);
    expect(recycledPosition.world.y).toBe(60);
  });
});
