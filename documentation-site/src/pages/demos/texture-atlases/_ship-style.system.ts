import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Time } from '@forge-game-engine/forge/common';
import {
  SpriteEcsComponent,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import { ShipStyleEcsComponent, shipStyleId } from './_ship-style.component';

/**
 * Shows each ship's next style every `secondsPerStyle`, by assigning
 * another region of the ships atlas to its sprite's `region`. The texture
 * doesn't change, so the ships keep drawing in one batch.
 * @param time - The time the cycle is measured with.
 * @returns The ship style ECS system.
 */
export const createShipStyleEcsSystem = (
  time: Time,
): EcsSystem<[ShipStyleEcsComponent, SpriteEcsComponent]> => ({
  query: [shipStyleId, spriteId],
  update: (_world, { components: [shipStyles, sprites] }) => {
    for (let i = 0; i < shipStyles.length; i++) {
      const { styles, secondsPerStyle, phaseSeconds } = shipStyles[i];
      const step = Math.floor(
        (time.timeInSeconds + phaseSeconds) / secondsPerStyle,
      );

      sprites[i].region = styles[step % styles.length];
    }
  },
});
