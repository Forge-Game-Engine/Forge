import { positionId, rotationId } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { rigidBodyId } from '@forge-game-engine/forge/physics';
import { Vec2 } from '@forge-game-engine/forge/math';
import { CarResetEcsComponent, carResetId } from './_car-reset.component';

/**
 * Teleports every body in each matched entity's `CarResetEcsComponent.bodies`
 * back to its recorded spawn transform, with zero velocity, on the tick
 * `restartInput` fires. Writes each body's `local` pose, so it must run
 * before `createTransformEcsSystem`, so a restart applied this tick is
 * reflected in this same tick's physics step and render.
 */
export const createCarResetEcsSystem = (): EcsSystem<
  [CarResetEcsComponent]
> => ({
  query: [carResetId],
  update: (world, { components: [carResets] }) => {
    for (const carReset of carResets) {
      if (!carReset.restartInput.isTriggered) {
        continue;
      }

      for (const { entity, initialPosition, initialAngle } of carReset.bodies) {
        const position = world.getComponent(entity, positionId);
        const rotation = world.getComponent(entity, rotationId);
        const rigidBody = world.getComponent(entity, rigidBodyId);

        if (position !== null) {
          // clone: initialPosition is the same recorded transform reused on
          // every restart, so it must not become the body's live position.
          position.local = Vec2.clone(initialPosition);
        }

        if (rotation !== null) {
          rotation.local = initialAngle;
        }

        if (rigidBody !== null) {
          rigidBody.velocity = Vec2.zero;
          rigidBody.angularVelocity = 0;
        }
      }
    }
  },
});
