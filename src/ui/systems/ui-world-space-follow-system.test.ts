import { beforeEach, describe, expect, it } from 'vitest';
import { createUiWorldSpaceFollowEcsSystem } from './ui-world-space-follow-system.js';
import {
  addPositionComponent,
  addRotationComponent,
  createTransformEcsSystem,
  PositionEcsComponent,
  positionId,
} from '../../common/index.js';
import { EcsSystem, EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { addUiWorldSpaceFollowComponent } from '../components/ui-world-space-follow-component.js';

/**
 * Stands in for `createUiLayoutEcsSystem`, which resets a canvas's local
 * position to its anchored offset every frame before the follow system runs.
 */
const createResetLocalEcsSystem = (
  entity: number,
  offset: Vector2,
): EcsSystem<[PositionEcsComponent]> => ({
  query: [positionId],
  update: (world): void => {
    const position = world.getComponentRequired(entity, positionId);

    position.local.x = offset.x;
    position.local.y = offset.y;
  },
});

describe('createUiWorldSpaceFollowEcsSystem', () => {
  let world: EcsWorld;
  let target: number;
  let targetPosition: PositionEcsComponent;
  let entity: number;
  let position: PositionEcsComponent;

  beforeEach(() => {
    world = new EcsWorld();
    target = world.createEntity();
    targetPosition = addPositionComponent(world, target, {
      local: { x: 100, y: 50 },
    });

    entity = world.createEntity();
    position = addPositionComponent(world, entity);
    addUiWorldSpaceFollowComponent(world, entity, { target });

    world.addSystem(createResetLocalEcsSystem(entity, { x: 0, y: 80 }));
    world.addSystem(createUiWorldSpaceFollowEcsSystem());
    world.addSystem(createTransformEcsSystem());
  });

  it("adds the target's world position to the entity's local offset", () => {
    // The first frame resolves the target's world position, the second
    // follows it.
    world.update();
    world.update();

    expect(position.local).toEqual({ x: 100, y: 130 });
    expect(position.world).toEqual({ x: 100, y: 130 });
  });

  it('stays put across frames while the target does', () => {
    world.update();
    world.update();
    world.update();
    world.update();

    expect(position.world).toEqual({ x: 100, y: 130 });
  });

  it("ignores the target's rotation", () => {
    addRotationComponent(world, target, { local: Math.PI / 2 });

    world.update();
    world.update();

    expect(position.world).toEqual({ x: 100, y: 130 });
  });

  it('follows a moving target one frame behind', () => {
    world.update();
    world.update();

    targetPosition.local.x = 300;
    world.update();

    expect(position.world.x).toBe(100);

    world.update();

    expect(position.world.x).toBe(300);
  });

  it('throws when the target has no PositionEcsComponent', () => {
    const otherWorld = new EcsWorld();
    const missingTarget = otherWorld.createEntity();
    const follower = otherWorld.createEntity();

    addPositionComponent(otherWorld, follower);
    addUiWorldSpaceFollowComponent(otherWorld, follower, {
      target: missingTarget,
    });
    otherWorld.addSystem(createUiWorldSpaceFollowEcsSystem());

    expect(() => otherWorld.update()).toThrow(
      `Entity "${follower}" has a UiWorldSpaceFollowEcsComponent targeting entity "${missingTarget}", which has no PositionEcsComponent.`,
    );
  });
});
