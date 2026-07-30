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

/**
 * Creates an ECS system that steps `physicsWorld` and keeps it synchronized
 * with the ECS world: registers/removes each entity's `RigidBody` as its
 * `PhysicsBodyEcsComponent` comes and goes, and syncs its transform with the
 * entity's `PositionEcsComponent`/`RotationEcsComponent` every tick (see
 * `PhysicsBodyEcsComponent.isKinematic` for which side drives which). This
 * system alone doesn't add any physics behavior beyond that sync - joints,
 * torque, and motors are all separate systems layered on top (see the
 * Applying Forces and Joints guides).
 * @param physicsWorld - The physics world to step and synchronize with the ECS.
 * @param time - The time instance used to determine the simulation step size.
 */
export const createPhysicsSyncEcsSystem = (
  physicsWorld: PhysicsWorld,
  time: Time,
): EcsSystem<
  [PhysicsBodyEcsComponent, PositionEcsComponent, RotationEcsComponent]
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
    update: (
      _world,
      { entities, components: [physicsBodyComponents, positions, rotations] },
    ) => {
      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        const { physicsBody } = physicsBodyComponents[i];

        physicsWorld.addBody(physicsBody);
        registeredEntities.set(entity, physicsBody);
        physicsBody.userData = entity;
      }

      physicsWorld.step(time.deltaTimeInSeconds);

      for (let i = 0; i < entities.length; i++) {
        const physicsBodyComponent = physicsBodyComponents[i];
        const positionComponent = positions[i];
        const rotationComponent = rotations[i];
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
      }
    },
    cleanup: (world) => {
      for (const physicsBody of registeredEntities.values()) {
        physicsWorld.removeBody(physicsBody);
      }

      registeredEntities.clear();
      world.onEntityRemoved.deregisterListener(onEntityRemovedListener);
    },
  };
};
