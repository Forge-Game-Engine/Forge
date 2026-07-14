import {
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
  type Time,
} from '../../common/index.js';
import { PhysicsBodyEcsComponent, PhysicsBodyId } from '../components/index.js';
import type { PhysicsWorld } from '../physics-world.js';
import type { RigidBody } from '../rigid-body.js';

import { EcsSystem } from '../../ecs/ecs-system.js';

const physicsEntityBuffer: number[] = [];

/**
 * Creates an ECS system to handle physics.
 * @param physicsWorld - The physics world to step and synchronize with the ECS.
 * @param time - The time instance used to determine the simulation step size.
 */
export const createPhysicsEcsSystem = (
  physicsWorld: PhysicsWorld,
  time: Time,
): EcsSystem<
  [PhysicsBodyEcsComponent, PositionEcsComponent, RotationEcsComponent],
  void
> => {
  // Keyed by entity rather than by `RigidBody` instance: `EcsWorld` recycles
  // entity ids as soon as an entity is removed, so a `PhysicsBodyId`
  // component removed and re-added under the same entity id within a
  // single tick (e.g. an object pool or a "respawn" that removes a batch
  // of entities and immediately creates a new one) would otherwise be
  // indistinguishable from that entity never having changed bodies at
  // all, leaving the old `RigidBody` registered in `physicsWorld` forever
  // as an invisible, un-synced collider.
  const registeredEntities = new Map<number, RigidBody>();

  const onEntityRemovedListener = (entity: number) => {
    const registeredBody = registeredEntities.get(entity);

    if (registeredBody) {
      physicsWorld.removeBody(registeredBody);
      registeredEntities.delete(entity);
    }
  };

  return {
    query: [PhysicsBodyId, positionId, rotationId],
    onRegister: (world) => {
      world.onEntityRemoved.registerListener(onEntityRemovedListener);
    },
    beforeQuery: (world) => {
      world.queryEntities(
        [PhysicsBodyId, positionId, rotationId],
        physicsEntityBuffer,
      );

      for (const entity of physicsEntityBuffer) {
        const physicsBodyComponent = world.getComponent(entity, PhysicsBodyId)!;

        const { physicsBody } = physicsBodyComponent;

        physicsWorld.addBody(physicsBody);
        registeredEntities.set(entity, physicsBody);
        physicsBody.userData = entity;
      }

      physicsWorld.step(time.deltaTimeInSeconds);
    },
    run: (result) => {
      const [physicsBodyComponent, positionComponent, rotationComponent] =
        result.components;
      const { physicsBody } = physicsBodyComponent;

      if (physicsBody.isStatic || physicsBodyComponent.isKinematic === true) {
        physicsBody.position = positionComponent.world.clone();

        // `rotationComponent.world` is in render space (Y-down), while
        // `physicsBody.angle` is in world space (Y-up); these are mirrored,
        // so the angle is negated when crossing this boundary.
        physicsBody.angle = -rotationComponent.world;
      } else {
        positionComponent.world.x = physicsBody.position.x;
        positionComponent.world.y = physicsBody.position.y;

        rotationComponent.world = -physicsBody.angle;
      }
    },
    cleanupEntities: (result) => {
      const { entity, components } = result;
      const [physicsBodyComponent] = components;
      const { physicsBody } = physicsBodyComponent;

      if (registeredEntities.get(entity) === physicsBody) {
        physicsWorld.removeBody(physicsBody);
        registeredEntities.delete(entity);
      }
    },
    cleanupSystem: (world) => {
      world.onEntityRemoved.deregisterListener(onEntityRemovedListener);
    },
  };
};
