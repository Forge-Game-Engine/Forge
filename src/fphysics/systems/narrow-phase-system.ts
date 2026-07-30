import { positionId, rotationId } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { detectCollision } from '../collision/detect-collision.js';
import { colliderId } from '../components/collider-component.js';
import { CollisionBody } from '../types/collision-body.js';
import { CollisionManifold } from '../types/collision-manifold.js';
import { CollisionPair } from '../types/collision-pair.js';

/**
 * Creates an ECS system that runs narrow-phase (SAT) collision detection
 * against every pair in `collisionPairs`, using each entity's world
 * position/rotation (local values are only meaningful to the parenting
 * system), writing every actual collision into `collisionManifolds`.
 * @param collisionPairs - The broad-phase system's output: candidate
 * entity pairs whose AABBs overlap.
 * @param collisionManifolds - The array the system clears and refills with
 * the current tick's confirmed collisions.
 * @returns An ECS system that populates `collisionManifolds` every tick.
 */
export const createNarrowPhaseEcsSystem = (
  collisionPairs: CollisionPair[],
  collisionManifolds: CollisionManifold[],
): EcsSystem<[]> => ({
  query: [],
  update: (world) => {
    collisionManifolds.length = 0;

    for (const pair of collisionPairs) {
      const bodyA = getCollisionBody(world, pair.entityA);
      const bodyB = getCollisionBody(world, pair.entityB);

      if (bodyA === null || bodyB === null) {
        continue;
      }

      const manifold = detectCollision(bodyA, bodyB);

      if (manifold === null) {
        continue;
      }

      collisionManifolds.push({
        entityA: pair.entityA,
        entityB: pair.entityB,
        ...manifold,
      });
    }
  },
});

function getCollisionBody(
  world: EcsWorld,
  entity: number,
): CollisionBody | null {
  const position = world.getComponent(entity, positionId);
  const rotation = world.getComponent(entity, rotationId);
  const collider = world.getComponent(entity, colliderId);

  if (position === null || rotation === null || collider === null) {
    return null;
  }

  return {
    position: position.world,
    rotation: rotation.world,
    collider: collider.collider,
  };
}
