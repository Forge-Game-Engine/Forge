import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { RotationEcsComponent, rotationId, Time } from '@forge-game-engine/forge/common';
import { lerp } from '@forge-game-engine/forge/math';
import {
  SpriteEcsComponent,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import { PanelEcsComponent, panelId } from './_panel.component';

const cycleSeconds = 4;

/**
 * Breathes each panel's sprite between `minSize` and `maxSize` in lockstep
 * (a smooth sine wave, not a hard ping-pong), so the three comparison panels
 * can be watched resizing together: a naive single-quad stretch distorts its
 * corners and border, while the nine-sliced panels keep theirs a fixed size.
 * @param time - The time instance used to derive the current phase.
 * @returns The panel ECS system.
 */
export const createPanelEcsSystem = (
  time: Time,
): EcsSystem<
  [SpriteEcsComponent, PanelEcsComponent, RotationEcsComponent]
> => ({
  query: [spriteId, panelId, rotationId],
  run: (result) => {
    const [sprite, panel, rotation] = result.components;
    const { minSize, maxSize } = panel;

    const phase =
      (Math.sin((time.timeInSeconds * Math.PI * 2) / cycleSeconds) + 1) / 2;
    const size = lerp(minSize, maxSize, phase);
    rotation.world += phase * time.deltaTimeInSeconds;

    sprite.width = size;
    sprite.height = size;
  },
});
