import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  PrismaticJointEcsComponent,
  PrismaticJointId,
} from '../components/index.js';
import type { PrismaticJoint } from '../joints/index.js';
import type { PhysicsWorld } from '../physics-world.js';

/**
 * Creates an ECS system that registers each entity's `PrismaticJoint` with
 * `physicsWorld` while the entity carries a `PrismaticJointId` component,
 * and removes it once the entity stops matching (or is removed).
 *
 * Must be registered with the `EcsWorld` before `createPhysicsSyncEcsSystem`
 * (or with an earlier `registrationOrder`), so newly-added joints are
 * registered before `createPhysicsSyncEcsSystem` steps `physicsWorld` for the
 * tick.
 * @param physicsWorld - The physics world to register joints with.
 */
export const createPrismaticJointEcsSystem = (
  physicsWorld: PhysicsWorld,
): EcsSystem<[PrismaticJointEcsComponent]> => {
  // Keyed by entity rather than by `PrismaticJoint` instance for the same
  // reason as `createPhysicsSyncEcsSystem`'s `registeredEntities`: entity ids
  // are recycled as soon as an entity is removed, so a component
  // removed-and-re-added under the same id within one tick would otherwise
  // be indistinguishable from that entity never having changed joints.
  const registeredEntities = new Map<number, PrismaticJoint>();

  const onEntityRemovedListener = (entity: number): void => {
    const registeredJoint = registeredEntities.get(entity);

    if (registeredJoint) {
      physicsWorld.removeJoint(registeredJoint);
      registeredEntities.delete(entity);
    }
  };

  return {
    query: [PrismaticJointId],
    onRegister: (world) => {
      world.onEntityRemoved.registerListener(onEntityRemovedListener);
    },
    update: (_world, { entities, components: [jointComponents] }) => {
      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        const { joint } = jointComponents[i];

        physicsWorld.addJoint(joint);
        registeredEntities.set(entity, joint);
      }
    },
    cleanup: (world) => {
      for (const joint of registeredEntities.values()) {
        physicsWorld.removeJoint(joint);
      }

      registeredEntities.clear();
      world.onEntityRemoved.deregisterListener(onEntityRemovedListener);
    },
  };
};
