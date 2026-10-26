import {
  addPositionComponent,
  addRotationComponent,
  createTransformEcsSystem,
  PositionEcsComponent,
  RotationEcsComponent,
  Time,
} from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import { Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { addColliderComponent } from '../components/collider-component.js';
import {
  addRigidBodyComponent,
  RigidBodyEcsComponent,
} from '../components/rigidbody-component.js';
import { createEulerIntegrationEcsSystem } from '../systems/euler-integration-system.js';
import { createSleepEcsSystem } from '../systems/sleep-system.js';

/**
 * A dynamic body that `createSleepEcsSystem` has put to sleep.
 */
export interface SleepingBody {
  entity: number;
  position: PositionEcsComponent;
  rotation: RotationEcsComponent;
  rigidBody: RigidBodyEcsComponent;
}

/**
 * A world running the transform, sleep and integration systems at 60 Hz.
 */
export interface SleepingBodyWorld {
  world: EcsWorld;
  /** Advances the world by one 60 Hz tick. */
  tick: () => void;
  /**
   * Adds a resting dynamic circle of mass 2 and radius 1 at `position` and
   * ticks until the sleep system puts it to sleep.
   */
  addSleepingBody: (position: Vector2) => SleepingBody;
}

/**
 * Creates a world for testing what wakes a sleeping body: the transform
 * system, then the sleep system, then Euler integration, so something
 * written before a tick wakes the body and moves it on that tick.
 * @returns The world and helpers to tick it and add bodies.
 * @throws An error from `addSleepingBody` if the body doesn't fall asleep
 * within two seconds.
 */
export const createSleepingBodyWorld = (): SleepingBodyWorld => {
  const world = new EcsWorld();
  const time = new Time();

  time.update(0);

  world.addSystem(createTransformEcsSystem(time));
  world.addSystem(createSleepEcsSystem([], time));
  world.addSystem(createEulerIntegrationEcsSystem(time));

  const tick = (): void => {
    time.update(time.rawTimeInMilliseconds + 1000 / 60);
    world.update();
  };

  const addSleepingBody = (position: Vector2): SleepingBody => {
    const entity = world.createEntity();
    const body = {
      entity,
      position: addPositionComponent(world, entity, { local: position }),
      rotation: addRotationComponent(world, entity),
      rigidBody: addRigidBodyComponent(world, entity),
    };

    addColliderComponent(world, entity, {
      collider: new CircleCollider(1, 2 / Math.PI),
    });

    for (let i = 0; i < 120 && !body.rigidBody.isSleeping; i++) {
      tick();
    }

    if (!body.rigidBody.isSleeping) {
      throw new Error('The body did not fall asleep within two seconds.');
    }

    return body;
  };

  return { world, tick, addSleepingBody };
};
