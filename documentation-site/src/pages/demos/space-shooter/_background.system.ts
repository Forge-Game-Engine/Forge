import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Time } from '@forge-game-engine/forge/common';
import {
  getCameraView,
  RenderContext,
  SpriteEcsComponent,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import { backgroundId } from './_background.component';

/**
 * Re-derives the background sprite's world size from `camera`'s view, and
 * its `u_resolution` uniform from `renderContext`'s current dimensions,
 * whenever the canvas is resized, instead of keeping the fixed values
 * `createBackground` computed once at startup - otherwise the
 * background quad (and the noise pattern its shader draws, which assumes
 * `u_resolution` matches the canvas) stays sized for whatever aspect ratio
 * the container had when the game started, leaving bare canvas past its
 * edges once the container is resized to something wider or taller.
 */
export const createBackgroundEcsSystem = (
  time: Time,
  camera: number,
  renderContext: RenderContext,
): EcsSystem<[SpriteEcsComponent]> => {
  let lastWidth = -1;
  let lastHeight = -1;

  return {
    query: [spriteId],
    tags: [backgroundId],
    update: (world, { components: [spriteComponents] }) => {
      const resized =
        renderContext.width !== lastWidth ||
        renderContext.height !== lastHeight;

      if (resized) {
        lastWidth = renderContext.width;
        lastHeight = renderContext.height;
      }

      const visibleWorldSize = resized
        ? getCameraView(world, camera, renderContext).size
        : null;

      for (const spriteComponent of spriteComponents) {
        spriteComponent.renderable.material.setUniform(
          'u_time',
          time.timeInSeconds,
        );

        if (!visibleWorldSize) {
          continue;
        }

        spriteComponent.width = visibleWorldSize.x;
        spriteComponent.height = visibleWorldSize.y;

        spriteComponent.renderable.material.setUniform(
          'u_resolution',
          new Float32Array([renderContext.width, renderContext.height]),
        );
      }
    },
  };
};
