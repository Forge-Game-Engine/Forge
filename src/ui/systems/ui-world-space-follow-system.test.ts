import { describe, expect, it } from 'vitest';
import { createUiWorldSpaceFollowEcsSystem } from './ui-world-space-follow-system.js';
import { addPositionComponent } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { addUiWorldSpaceFollowComponent } from '../components/ui-world-space-follow-component.js';

describe('createUiWorldSpaceFollowEcsSystem', () => {
  it("overwrites the entity's world position with the target's world position plus its own local offset", () => {
    const world = new EcsWorld();
    const target = world.createEntity();

    addPositionComponent(world, target, {
      local: { x: 0, y: 0 },
      world: { x: 100, y: 50 },
    });

    const entity = world.createEntity();
    const position = addPositionComponent(world, entity, {
      local: { x: 0, y: 80 },
    });

    addUiWorldSpaceFollowComponent(world, entity, { target });

    world.addSystem(createUiWorldSpaceFollowEcsSystem());
    world.update();

    expect(position.world.x).toBe(100);
    expect(position.world.y).toBe(130);
  });

  it("ignores the target's rotation entirely - only its position is read", () => {
    const world = new EcsWorld();
    const target = world.createEntity();

    addPositionComponent(world, target, {
      local: { x: 0, y: 0 },
      world: { x: 200, y: 0 },
    });

    const entity = world.createEntity();
    const position = addPositionComponent(world, entity, {
      local: { x: 10, y: 0 },
    });

    addUiWorldSpaceFollowComponent(world, entity, { target });

    world.addSystem(createUiWorldSpaceFollowEcsSystem());
    world.update();
    world.update();
    world.update();

    // No RotationEcsComponent was ever attached to `target` or `entity` -
    // if this system somehow read/applied one, it would throw or produce
    // NaN rather than this exact, stable value across repeated ticks.
    expect(position.world.x).toBe(210);
    expect(position.world.y).toBe(0);
  });

  it('leaves the position untouched when the target has no PositionEcsComponent', () => {
    const world = new EcsWorld();
    const target = world.createEntity();

    const entity = world.createEntity();
    const position = addPositionComponent(world, entity, {
      local: { x: 5, y: 5 },
      world: { x: 999, y: 999 },
    });

    addUiWorldSpaceFollowComponent(world, entity, { target });

    world.addSystem(createUiWorldSpaceFollowEcsSystem());
    world.update();

    expect(position.world.x).toBe(999);
    expect(position.world.y).toBe(999);
  });

  it('follows the target across multiple ticks as its world position changes', () => {
    const world = new EcsWorld();
    const target = world.createEntity();
    const targetPosition = addPositionComponent(world, target, {
      local: { x: 0, y: 0 },
      world: { x: 0, y: 0 },
    });

    const entity = world.createEntity();
    const position = addPositionComponent(world, entity, {
      local: { x: 0, y: 20 },
    });

    addUiWorldSpaceFollowComponent(world, entity, { target });

    world.addSystem(createUiWorldSpaceFollowEcsSystem());
    world.update();

    expect(position.world.y).toBe(20);

    targetPosition.world.x = 50;
    targetPosition.world.y = 50;
    world.update();

    expect(position.world.x).toBe(50);
    expect(position.world.y).toBe(70);
  });
});
