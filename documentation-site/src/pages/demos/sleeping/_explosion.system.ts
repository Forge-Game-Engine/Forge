import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { applyExplosiveForce } from '@forge-game-engine/forge/physics';
import {
  getCameraView,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import { SleepingInputs } from './_create-inputs';
import { ExplosionEcsComponent, explosionId } from './_explosion.component';

/**
 * Creates the system that sets off an explosion where the mouse is clicked.
 * `applyExplosiveForce` pushes sleeping bodies too: the velocity it writes
 * is what wakes their islands, so nothing here wakes them by hand.
 *
 * Register it in the default group: a velocity written there wakes a
 * sleeping island on the next fixed step, before collision resolution.
 * @param renderContext - The render context whose canvas the mouse is over.
 * @param inputs - The mouse and the explode action.
 * @returns The ECS system.
 */
export const createExplosionEcsSystem = (
  renderContext: RenderContext,
  inputs: SleepingInputs,
): EcsSystem<[ExplosionEcsComponent]> => ({
  query: [explosionId],
  update: (world, { components: [explosions] }) => {
    if (!inputs.explode.isTriggered) {
      return;
    }

    for (const { camera, force, radius } of explosions) {
      const center = getCameraView(
        world,
        camera,
        renderContext,
      ).viewportToWorld(inputs.mouse.position);

      applyExplosiveForce(world, center, force, radius);
    }
  },
});
