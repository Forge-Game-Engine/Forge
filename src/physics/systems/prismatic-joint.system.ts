import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  PrismaticJointEcsComponent,
  PrismaticJointId,
} from '../components/index.js';
import type { PrismaticJoint } from '../joints/index.js';
import type { PhysicsWorld } from '../physics-world.js';

const prismaticJointEntityBuffer: number[] = [];

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
): EcsSystem<[PrismaticJointEcsComponent], void> => {
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
    beforeQuery: (world) => {
      world.queryEntities([PrismaticJointId], prismaticJointEntityBuffer);

      for (const entity of prismaticJointEntityBuffer) {
        const jointComponent = world.getComponent(entity, PrismaticJointId)!;

        physicsWorld.addJoint(jointComponent.joint);
        registeredEntities.set(entity, jointComponent.joint);
      }
    },
    run: () => {
      // Registration is handled in `beforeQuery`; a `PrismaticJoint` has no
      // per-frame ECS-side state to sync.
    },
    cleanupEntities: (result) => {
      const { entity, components } = result;
      const [jointComponent] = components;

      if (registeredEntities.get(entity) === jointComponent.joint) {
        physicsWorld.removeJoint(jointComponent.joint);
        registeredEntities.delete(entity);
      }
    },
    cleanupSystem: (world) => {
      world.onEntityRemoved.deregisterListener(onEntityRemovedListener);
    },
  };
};
