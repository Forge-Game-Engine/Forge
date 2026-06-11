import { Body } from 'matter-js';

import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
  type Time,
} from '../../common/index.js';
import { PhysicsBodyEcsComponent, PhysicsBodyId } from '../components/index.js';
import { PhysicsWorld } from '../physics-world.js';

import { EcsSystem } from '../../ecs/ecs-system.js';

const physicsEntityBuffer: number[] = [];
const syncBuffer: { entity: number; body: Body }[] = [];

/**
 * Creates an ECS system that drives the given physics world.
 *
 * Each frame, this system:
 * 1. Synchronizes the set of Matter bodies registered with `physicsWorld` to
 *    match the current `[PhysicsBodyId]` query results, adding new bodies
 *    to (and removing stale bodies from) the Matter world.
 * 2. For static and kinematic bodies, copies the entity's ECS position and
 *    rotation onto the Matter body, so collision detection sees up-to-date
 *    positions before the simulation steps.
 * 3. Steps the Matter engine forward by `time.deltaTimeInMilliseconds`,
 *    refreshing `physicsWorld.collisionStarts`/`collisionEnds`.
 * 4. For dynamic bodies, copies the Matter body's resulting position and
 *    angle back onto the entity's ECS position and rotation components.
 * @param physicsWorld - The physics world to step and synchronize.
 * @param time - The time instance used to determine the simulation step size.
 */
export const createPhysicsEcsSystem = (
  physicsWorld: PhysicsWorld,
  time: Time,
): EcsSystem<
  [PhysicsBodyEcsComponent, PositionEcsComponent, RotationEcsComponent],
  void
> => ({
  query: [PhysicsBodyId, positionId, rotationId],
  beforeQuery: (world) => {
    world.queryEntities(
      [PhysicsBodyId, positionId, rotationId],
      physicsEntityBuffer,
    );

    syncBuffer.length = 0;

    for (const entity of physicsEntityBuffer) {
      const physicsBodyComponent = world.getComponent(entity, PhysicsBodyId);
      const positionComponent = world.getComponent(entity, positionId);
      const rotationComponent = world.getComponent(entity, rotationId);

      if (!physicsBodyComponent || !positionComponent || !rotationComponent) {
        continue;
      }

      const { physicsBody, isKinematic } = physicsBodyComponent;

      syncBuffer.push({ entity, body: physicsBody });

      if (!physicsBody.isStatic && isKinematic !== true) {
        continue;
      }

      Body.setPosition(physicsBody, {
        x: positionComponent.world.x,
        y: positionComponent.world.y,
      });

      Body.setAngle(physicsBody, rotationComponent.world);
    }

    physicsWorld.syncBodies(syncBuffer);
    physicsWorld.step(time.deltaTimeInMilliseconds);
  },
  run: (result) => {
    const [physicsBodyComponent, positionComponent, rotationComponent] =
      result.components;

    const { physicsBody, isKinematic } = physicsBodyComponent;

    if (physicsBody.isStatic || isKinematic === true) {
      return;
    }

    positionComponent.world.x = physicsBody.position.x;
    positionComponent.world.y = physicsBody.position.y;
    rotationComponent.world = physicsBody.angle;
  },
});
