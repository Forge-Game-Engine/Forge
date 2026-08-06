import { beforeEach, describe, expect, it } from 'vitest';
import { EcsWorld } from '../../ecs/index.js';

import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
} from '../components/index.js';
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
      local: { x: 10, y: 20 },
    });

    world.update();

    expect(position.world.x).toBe(10);
    expect(position.world.y).toBe(20);
  });

  it('should compose a child world position from its parent', () => {
    const parent = world.createEntity();
    const child = world.createEntity();

    addPositionComponent(world, parent, {
      local: { x: 10, y: 20 },
    });

    const childPosition = addPositionComponent(world, child, {
      local: { x: 5, y: 5 },
    });

    addParentComponent(world, child, { parent });

    world.update();

    expect(childPosition.world.x).toBe(15);
    expect(childPosition.world.y).toBe(25);
  });

  it('should keep recomputing world position for non-static entities after local changes', () => {
    const entity = world.createEntity();

    const position = addPositionComponent(world, entity, {
      local: { x: 10, y: 20 },
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
      local: { x: 10, y: 20 },
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
      local: { x: 10, y: 20 },
    });

    const childPosition = addPositionComponent(world, child, {
      local: { x: 5, y: 5 },
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
      local: { x: 10, y: 20 },
      isStatic: true,
    });

    const childPosition = addPositionComponent(world, child, {
      local: { x: 5, y: 5 },
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
      local: { x: 10, y: 20 },
      isStatic: true,
    });

    world.update();

    world.removeEntity(staticEntity);

    const recycledEntity = world.createEntity();

    const recycledPosition = addPositionComponent(world, recycledEntity, {
      local: { x: 50, y: 60 },
    });

    world.update();

    expect(recycledPosition.world.x).toBe(50);
    expect(recycledPosition.world.y).toBe(60);
  });

  it('should rotate a child position offset by the parent rotation', () => {
    const parent = world.createEntity();
    const child = world.createEntity();

    addPositionComponent(world, parent, { local: { x: 0, y: 0 } });
    addRotationComponent(world, parent, { local: Math.PI / 2 });

    const childPosition = addPositionComponent(world, child, {
      local: { x: 10, y: 0 },
    });

    addParentComponent(world, child, { parent });

    world.update();

    expect(childPosition.world.x).toBeCloseTo(0);
    expect(childPosition.world.y).toBeCloseTo(10);
  });

  it('should scale a child position offset by the parent scale', () => {
    const parent = world.createEntity();
    const child = world.createEntity();

    addPositionComponent(world, parent, { local: { x: 0, y: 0 } });
    addScaleComponent(world, parent, { local: { x: 2, y: 2 } });

    const childPosition = addPositionComponent(world, child, {
      local: { x: 10, y: 0 },
    });

    addParentComponent(world, child, { parent });

    world.update();

    expect(childPosition.world.x).toBeCloseTo(20);
    expect(childPosition.world.y).toBeCloseTo(0);
  });

  it('should scale then rotate a child position offset by the parent transform', () => {
    const parent = world.createEntity();
    const child = world.createEntity();

    addPositionComponent(world, parent, { local: { x: 5, y: 5 } });
    addRotationComponent(world, parent, { local: Math.PI / 2 });
    addScaleComponent(world, parent, { local: { x: 2, y: 2 } });

    const childPosition = addPositionComponent(world, child, {
      local: { x: 10, y: 0 },
    });

    addParentComponent(world, child, { parent });

    world.update();

    expect(childPosition.world.x).toBeCloseTo(5);
    expect(childPosition.world.y).toBeCloseTo(25);
  });

  it('should compose position, rotation and scale through a three-deep parent chain', () => {
    const grandparent = world.createEntity();
    const parent = world.createEntity();
    const child = world.createEntity();

    addPositionComponent(world, grandparent, { local: { x: 0, y: 0 } });
    addRotationComponent(world, grandparent, { local: Math.PI / 2 });
    addScaleComponent(world, grandparent, { local: { x: 2, y: 2 } });

    const parentPosition = addPositionComponent(world, parent, {
      local: { x: 10, y: 0 },
    });
    const parentRotation = addRotationComponent(world, parent, {
      local: Math.PI / 2,
    });
    const parentScale = addScaleComponent(world, parent, {
      local: { x: 1, y: 1 },
    });

    addParentComponent(world, parent, { parent: grandparent });

    const childPosition = addPositionComponent(world, child, {
      local: { x: 5, y: 0 },
    });

    addParentComponent(world, child, { parent });

    world.update();

    // grandparent: position (0, 0), rotation pi/2, scale (2, 2)
    // parent: local offset (10, 0) scaled by (2, 2) -> (20, 0), rotated by pi/2 -> (0, 20)
    expect(parentPosition.world.x).toBeCloseTo(0);
    expect(parentPosition.world.y).toBeCloseTo(20);
    expect(parentRotation.world).toBeCloseTo(Math.PI);
    expect(parentScale.world.x).toBeCloseTo(2);
    expect(parentScale.world.y).toBeCloseTo(2);

    // child: local offset (5, 0) scaled by parent world scale (2, 2) -> (10, 0),
    // rotated by parent world rotation pi -> (-10, 0), plus parent world position (0, 20)
    expect(childPosition.world.x).toBeCloseTo(-10);
    expect(childPosition.world.y).toBeCloseTo(20);
  });
});
