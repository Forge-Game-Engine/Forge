import { Time } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  RectTransformEcsComponent,
  rectTransformId,
  withUiAxisValue,
} from '@forge-game-engine/forge/ui';
import { LiveMotionEcsComponent, liveMotionId } from './_live-motion.component';

const oscillate = (min: number, max: number, angle: number): number => {
  const midpoint = (min + max) / 2;
  const amplitude = (max - min) / 2;

  return midpoint + amplitude * Math.sin(angle);
};

/**
 * Sweeps every `LiveMotionEcsComponent` entity's own
 * `RectTransformEcsComponent`'s own size (`x`/`y`) *and* `anchoredPosition` back and
 * forth (a sine wave per axis, each on its own period, between that axis's
 * min/max) every frame - this is what demonstrates every nested child's
 * anchor reacting live: a `stretchAll` child fills the resizing rect
 * exactly (wherever it currently is), a stretch-edge child follows the axis
 * it stretches along, and a point-anchored corner child keeps its own size
 * but slides to stay pinned to the moving corner. Registered before
 * `createUiLayoutEcsSystem` (see `_create-game.ts`) so the same frame's
 * layout pass resolves every rect from the freshly written size/position,
 * not the previous frame's.
 * @param time - The time instance used to derive elapsed seconds.
 * @returns The live motion ECS system.
 */
export const createLiveMotionEcsSystem = (
  time: Time,
): EcsSystem<[LiveMotionEcsComponent, RectTransformEcsComponent]> => ({
  query: [liveMotionId, rectTransformId],
  update: (_world, { components: [liveMotions, rectTransforms] }) => {
    for (let i = 0; i < liveMotions.length; i++) {
      const live = liveMotions[i];
      const rectTransform = rectTransforms[i];

      live.elapsedSeconds += time.deltaTimeInSeconds;

      const widthAngle =
        (live.elapsedSeconds / live.widthPeriodSeconds) * Math.PI * 2;
      const heightAngle =
        (live.elapsedSeconds / live.heightPeriodSeconds) * Math.PI * 2;
      const xAngle = (live.elapsedSeconds / live.xPeriodSeconds) * Math.PI * 2;
      const yAngle = (live.elapsedSeconds / live.yPeriodSeconds) * Math.PI * 2;

      rectTransform.x = withUiAxisValue(
        rectTransform.x,
        oscillate(live.minWidth, live.maxWidth, widthAngle),
      );
      rectTransform.y = withUiAxisValue(
        rectTransform.y,
        oscillate(live.minHeight, live.maxHeight, heightAngle),
      );
      rectTransform.anchoredPosition = {
        x: oscillate(live.minX, live.maxX, xAngle),
        y: oscillate(live.minY, live.maxY, yAngle),
      };
    }
  },
});
