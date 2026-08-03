import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  CollisionManifold,
  rigidBodyId,
} from '@forge-game-engine/forge/physics';
import {
  GroundContactEcsComponent,
  groundContactId,
} from './_ground-contact.component';

/**
 * Recomputes each matched entity's `GroundContactEcsComponent.groundContacts`
 * from this tick's `collisionManifolds`, counting how many of the entity's
 * current contacts are against a static (no `RigidBodyEcsComponent`) body.
 * Must run after whatever system populates `collisionManifolds`
 * (`createNarrowPhaseEcsSystem`), and before any system that reads a
 * `GroundContactEcsComponent` this same tick (`createWheelDriveEcsSystem`,
 * `createChassisStabilizerEcsSystem`, `createAirControlEcsSystem`).
 * @param collisionManifolds - The narrow-phase system's output: this tick's
 * confirmed collisions.
 */
export const createGroundContactEcsSystem = (
  collisionManifolds: CollisionManifold[],
): EcsSystem<[GroundContactEcsComponent]> => ({
  query: [groundContactId],
  update: (world, { entities, components: [groundContacts] }) => {
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      let count = 0;

      for (const manifold of collisionManifolds) {
        let other: number;

        if (manifold.entityA === entity) {
          other = manifold.entityB;
        } else if (manifold.entityB === entity) {
          other = manifold.entityA;
        } else {
          continue;
        }

        if (world.getComponent(other, rigidBodyId) === null) {
          count++;
        }
      }

      groundContacts[i].groundContacts = count;
    }
  },
});
