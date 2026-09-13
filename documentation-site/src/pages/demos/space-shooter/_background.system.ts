import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Time } from '@forge-game-engine/forge/common';
import {
  calculateVisibleWorldSize,
  RenderContext,
  SpriteEcsComponent,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { backgroundId } from './_background.component';

/**
 * Re-derives the background sprite's world size and `u_resolution` uniform
 * every frame from `renderContext`'s current dimensions, instead of the
 * fixed values `createBackground` computed once at startup - otherwise the
 * background quad (and the noise pattern its shader draws, which assumes
 * `u_resolution` matches the canvas) stays sized for whatever aspect ratio
 * the container had when the game started, leaving bare canvas past its
 * edges once the container is resized to something wider or taller.
 */
export const createBackgroundEcsSystem = (
  time: Time,
  renderContext: RenderContext,
): EcsSystem<[SpriteEcsComponent]> => {
  let lastWidth = -1;
  let lastHeight = -1;

  return {
    query: [spriteId],
    tags: [backgroundId],
    update: (_world, { components: [spriteComponents] }) => {
      const resized =
        renderContext.width !== lastWidth ||
        renderContext.height !== lastHeight;

      if (resized) {
        lastWidth = renderContext.width;
        lastHeight = renderContext.height;
      }

      const visibleWorldSize = resized
        ? calculateVisibleWorldSize(
            renderContext.width,
            renderContext.height,
            DEMO_VERTICAL_WORLD_UNITS,
          )
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
