import { Time } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Color, spriteId } from '@forge-game-engine/forge/rendering';
import { createPanel } from '@forge-game-engine/forge/ui';
import {
  StressTestSpawnerEcsComponent,
  stressTestSpawnerId,
} from './_stress-test-spawner.component';

/**
 * Spawns batches of small panels into the grid-arranged container at a
 * fixed interval, for as long as the spawner is active - each spawned
 * panel is an ordinary `RectTransformEcsComponent` + `SpriteEcsComponent`
 * entity that `createUiLayoutGroupEcsSystem`/`createUiLayoutEcsSystem`
 * measure/resolve fresh every frame, so the growing count directly stress
 * tests those two systems' full per-frame recompute.
 * @param time - The time instance used to throttle batch spawning.
 */
export const createStressTestSpawnerEcsSystem = (
  time: Time,
): EcsSystem<[StressTestSpawnerEcsComponent]> => ({
  query: [stressTestSpawnerId],
  update: (world, { components: [spawners] }) => {
    for (const spawner of spawners) {
      if (!spawner.isSpawning || time.timeInSeconds < spawner.nextSpawnTime) {
        continue;
      }

      spawner.nextSpawnTime = time.timeInSeconds + spawner.timeBetweenBatches;

      for (let i = 0; i < spawner.batchSize; i++) {
        const panel = createPanel(world, spawner.container, {
          sprite: spawner.cellSprite,
        });

        // A cheap, deterministic tint so newer cells read visually distinct
        // from older ones without any per-cell randomness.
        const shade = 0.4 + (0.6 * (spawner.spawnedCount % 20)) / 20;

        world.getComponent(panel, spriteId)!.tintColor = new Color(
          shade,
          shade * 0.7,
          1,
          1,
        );

        spawner.spawnedCount += 1;
      }
    }
  },
});
